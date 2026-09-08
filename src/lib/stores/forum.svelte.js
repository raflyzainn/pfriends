import { listForumChannels,listForumMessages,searchForumMessages,sendForumMessage,getForumMessageContext,setForumReaction,deleteForumMessage,canDeleteRealtimeForumMessage,heartbeatForum,listForumPresence,subscribeForum } from '$lib/infrastructure/pocketbase/forum.js';

const FALLBACK_POLL_MS=3000,RECONCILE_MS=30000,HEARTBEAT_MS=60000,MAX_RETRY_MS=30000;

class ForumStore {
	channels=$state.raw([]); messages=$state.raw({}); presence=$state.raw([]); loading=$state(false); sending=$state(false); error=$state(null); activeSlug=$state(''); connectionState=$state('connecting');
	#channelUnsubscribe=null; #presenceUnsubscribe=null; #heartbeat=null; #poll=null; #reconcile=null; #retry=null; #retryDelay=1000; #generation=0; #lifecycleBound=false;

	async load(){this.loading=true;this.error=null;this.messages={};this.presence=[];this.connectionState='connecting';try{this.channels=await listForumChannels();if(!this.activeSlug||!this.channels.some(x=>x.slug===this.activeSlug))this.activeSlug=this.channels.find(x=>x.slug==='sobi-alumni')?.slug||this.channels[0]?.slug||'';this.#bindLifecycle();if(this.activeSlug)await this.open(this.activeSlug);await this.refreshPresence();await this.#subscribePresence();this.#startHeartbeat()}catch(error){this.error=error instanceof Error?error.message:'Forum gagal dimuat.'}finally{this.loading=false}}

	async open(slug){const channel=this.channels.find(x=>x.slug===slug);if(!channel)return;this.activeSlug=slug;if(!this.messages[slug])await this.refreshLatest(slug);await this.#connectChannel(channel,slug);await this.beat().catch(()=>{})}

	async refreshLatest(slug=this.activeSlug){if(!slug)return;const page=await listForumMessages(slug),fresh=page.items,existing=this.messages[slug]||[],cutoff=fresh[0]?.waktu?.getTime()??Infinity,older=existing.filter(row=>row.waktu.getTime()<cutoff),unique=[...new Map([...older,...fresh].map(row=>[row.id,row])).values()].sort((a,b)=>a.waktu-b.waktu);this.messages={...this.messages,[slug]:unique};this.channels=this.channels.map(x=>x.slug===slug?{...x,hasMore:page.hasMore,nextCursor:page.nextCursor}:x)}

	async older(){const channel=this.channels.find(x=>x.slug===this.activeSlug);if(!channel?.hasMore)return;const page=await listForumMessages(channel.slug,{before:channel.nextCursor});this.messages={...this.messages,[channel.slug]:[...page.items,...(this.messages[channel.slug]||[])]};this.channels=this.channels.map(x=>x.slug===channel.slug?{...x,hasMore:page.hasMore,nextCursor:page.nextCursor}:x)}
	async search(slug,term){if(!slug||term.trim().length<2)return{items:[],totalItems:0};return searchForumMessages(slug,term.trim())}
	async send(content,replyTo=''){const slug=this.activeSlug;if(!content.trim()||this.sending)return null;this.sending=true;try{const row=await sendForumMessage(slug,content.trim(),crypto.randomUUID(),replyTo);const rows=this.messages[slug]||[],found=rows.some(x=>x.id===row.id);this.messages={...this.messages,[slug]:found?rows.map(x=>x.id===row.id?row:x):[...rows,row]};return row}catch(error){this.error=error instanceof Error?error.message:'Pesan gagal dikirim.';throw error}finally{this.sending=false}}
	async context(id){const data=await getForumMessageContext(id);if(data.channelSlug!==this.activeSlug)await this.open(data.channelSlug);const rows=[...(this.messages[data.channelSlug]||[]),...data.items],unique=[...new Map(rows.map(row=>[row.id,row])).values()].sort((a,b)=>a.waktu-b.waktu);this.messages={...this.messages,[data.channelSlug]:unique};return data.items.find(row=>row.id===id)||null}
	async react(message,emoji){const slug=this.activeSlug,selected=!message.reaksi.find(x=>x.emoji===emoji)?.dipilih,reactions=await setForumReaction(message.id,emoji,selected);this.messages={...this.messages,[slug]:(this.messages[slug]||[]).map(row=>row.id===message.id?{...row,reaksi:reactions}:row)}}
	async remove(message){const slug=this.activeSlug,id=await deleteForumMessage(message.id);this.messages={...this.messages,[slug]:(this.messages[slug]||[]).filter(item=>item.id!==id)};return id}
	async beat(){if(this.activeSlug)await heartbeatForum(this.activeSlug)}
	async refreshPresence(){this.presence=await listForumPresence()}

	async #connectChannel(channel,slug){const generation=++this.#generation;this.connectionState='connecting';this.#clearRetry();if(this.#channelUnsubscribe){await this.#channelUnsubscribe().catch(()=>{});this.#channelUnsubscribe=null}try{const unsubscribe=await subscribeForum(`forum:channel:${channel.id}`,(event)=>this.#event(slug,event),(status)=>{if(status==='stale')void this.refreshLatest(slug).catch(()=>{})});if(generation!==this.#generation||slug!==this.activeSlug){await unsubscribe();return}this.#channelUnsubscribe=unsubscribe;this.connectionState='live';this.#retryDelay=1000;this.#stopFallback();this.#startReconcile()}catch{if(generation!==this.#generation)return;this.connectionState='fallback';this.#startFallback(slug);this.#scheduleReconnect(channel,slug)}}

	async #subscribePresence(){if(this.#presenceUnsubscribe)return;try{this.#presenceUnsubscribe=await subscribeForum('forum:presence',()=>this.refreshPresence().catch(()=>{}))}catch{this.#presenceUnsubscribe=null}}
	#startFallback(slug){this.#stopFallback();const poll=()=>{if(document.visibilityState==='visible'&&slug===this.activeSlug)void Promise.all([this.refreshLatest(slug),this.refreshPresence()]).catch(()=>{})};poll();this.#poll=setInterval(poll,FALLBACK_POLL_MS)}
	#stopFallback(){if(this.#poll)clearInterval(this.#poll);this.#poll=null}
	#startReconcile(){if(this.#reconcile)clearInterval(this.#reconcile);this.#reconcile=setInterval(()=>{if(document.visibilityState==='visible')void Promise.all([this.refreshLatest(),this.refreshPresence()]).catch(()=>{})},RECONCILE_MS)}
	#scheduleReconnect(channel,slug){this.#clearRetry();const delay=this.#retryDelay;this.#retry=setTimeout(()=>{if(slug===this.activeSlug)void this.#connectChannel(channel,slug)},delay);this.#retryDelay=Math.min(MAX_RETRY_MS,delay*2)}
	#clearRetry(){if(this.#retry)clearTimeout(this.#retry);this.#retry=null}
	#startHeartbeat(){if(this.#heartbeat)return;this.#heartbeat=setInterval(()=>{if(document.visibilityState==='visible')this.beat().catch(()=>{})},HEARTBEAT_MS)}
	#bindLifecycle(){if(this.#lifecycleBound)return;this.#lifecycleBound=true;document.addEventListener('visibilitychange',this.#resume);window.addEventListener('online',this.#resume)}
	#resume=()=>{if(document.visibilityState!=='visible')return;void Promise.all([this.refreshLatest(),this.refreshPresence(),this.beat()]).catch(()=>{});const channel=this.channels.find(x=>x.slug===this.activeSlug);if(channel)void this.#connectChannel(channel,this.activeSlug);void this.#subscribePresence()};

	#event(slug,event){
		const data=event?.data||event;
		if(data.type==='message.created'){
			const row=data.message;
			const normalized={id:row.id,channelId:row.channelId,penulis:row.authorName,peran:row.authorLabel,waktu:new Date(row.createdAt),isi:row.content,saya:false,dapatHapus:canDeleteRealtimeForumMessage(row),balasan:row.reply?{id:row.reply.id,penulis:row.reply.authorName,isi:row.reply.content}:null,reaksi:(row.reactions||[]).map(x=>({emoji:x.emoji,jumlah:x.count,dipilih:false}))};
			const rows=this.messages[slug]||[];
			if(!rows.some(x=>x.id===normalized.id))this.messages={...this.messages,[slug]:[...rows,normalized]};
		}else if(data.type==='message.deleted'){
			this.messages={...this.messages,[slug]:(this.messages[slug]||[]).filter(row=>row.id!==data.messageId)};
		}else if(data.type==='message.reactions'){
			const rows=(this.messages[slug]||[]).map(row=>row.id===data.messageId?{...row,reaksi:data.reactions.map(x=>({emoji:x.emoji,jumlah:x.count,dipilih:row.reaksi.find(y=>y.emoji===x.emoji)?.dipilih||false}))}:row);
			this.messages={...this.messages,[slug]:rows};
		}
	}

	async destroy(){this.#generation++;if(this.#channelUnsubscribe)await this.#channelUnsubscribe().catch(()=>{});if(this.#presenceUnsubscribe)await this.#presenceUnsubscribe().catch(()=>{});if(this.#heartbeat)clearInterval(this.#heartbeat);if(this.#reconcile)clearInterval(this.#reconcile);this.#stopFallback();this.#clearRetry();if(this.#lifecycleBound){document.removeEventListener('visibilitychange',this.#resume);window.removeEventListener('online',this.#resume)}this.#channelUnsubscribe=null;this.#presenceUnsubscribe=null;this.#heartbeat=null;this.#reconcile=null;this.#lifecycleBound=false;this.connectionState='connecting'}
}
export const forum=new ForumStore();
