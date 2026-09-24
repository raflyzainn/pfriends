import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() { const pb=getPocketBase(); if(!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.'); return pb; }
function forumError(error,fallback){const wrapped=new Error(pocketBaseMessage(error,fallback));wrapped.status=error?.status;wrapped.code=error?.code;wrapped.data=error?.data;return wrapped}
export function canDeleteRealtimeForumMessage(row){const account=client().authStore.record;return row.authorKind!=='SYSTEM'&&(row.authorId===account?.id||['ADMIN','VERIFIER'].includes(account?.role))}
function message(row){const pb=client();return{id:row.id,channelId:row.channelId,userId:row.authorId,penulis:row.authorName,peran:row.authorLabel,waktu:new Date(row.createdAt),isi:row.content,saya:row.authorId===pb.authStore.record?.id,dapatHapus:Boolean(row.canDelete),balasan:row.reply?{id:row.reply.id,penulis:row.reply.authorName,isi:row.reply.content}:null,reaksi:(row.reactions||[]).map(x=>({emoji:x.emoji,jumlah:x.count,dipilih:Boolean(x.selected)}))}}
export async function listForumChannels(){try{client();const data=await apiRequest('/api/pfriends/forum/channels');return{items:data.items||[],moderation:data.moderation||{mode:'NONE',readOnly:false,strikeLevel:0}}}catch(error){throw new Error(pocketBaseMessage(error,'Kanal Forum gagal dimuat.'))}}
export async function listForumMessages(slug,{before='',perPage=50}={}){try{client();const query=new URLSearchParams({perPage:String(perPage)});if(before)query.set('before',before);const data=await apiRequest(`/api/pfriends/forum/channels/${encodeURIComponent(slug)}/messages?${query}`);return{items:(data.items||[]).map(message),hasMore:Boolean(data.hasMore),nextCursor:data.nextCursor||''}}catch(error){throw new Error(pocketBaseMessage(error,'Percakapan Forum gagal dimuat.'))}}
export async function searchForumMessages(slug,term){try{client();const query=new URLSearchParams({q:term,perPage:'20'}),data=await apiRequest(`/api/pfriends/forum/channels/${encodeURIComponent(slug)}/search?${query}`);return{items:(data.items||[]).map(row=>({...row,waktu:new Date(row.createdAt)})),totalItems:Number(data.totalItems)||0}}catch(error){throw new Error(pocketBaseMessage(error,'Pencarian pesan gagal dilakukan.'))}}
export async function sendForumMessage(slug,content,requestKey,replyTo=''){try{client();return message(await apiRequest(`/api/pfriends/forum/channels/${encodeURIComponent(slug)}/messages`,{method:'POST',body:{content,requestKey,replyTo}}))}catch(error){throw forumError(error,'Pesan gagal dikirim.')}}
export async function getForumMessageContext(id){try{client();const data=await apiRequest(`/api/pfriends/forum/messages/${id}/context`);return{channelSlug:data.channelSlug,items:(data.items||[]).map(message)}}catch(error){throw new Error(pocketBaseMessage(error,'Konteks pesan gagal dimuat.'))}}
export async function setForumReaction(id,emoji,selected){try{client();const data=await apiRequest(`/api/pfriends/forum/messages/${id}/reaction`,{method:'POST',body:{emoji,selected}});return(data.reactions||[]).map(x=>({emoji:x.emoji,jumlah:x.count,dipilih:Boolean(x.selected)}))}catch(error){throw forumError(error,'Reaksi gagal disimpan.')}}
export async function deleteForumMessage(id){try{client();await apiRequest(`/api/pfriends/forum/messages/${id}`,{method:'DELETE'});return id}catch(error){throw forumError(error,'Pesan gagal dihapus.')}}
export async function heartbeatForum(slug){try{client();await apiRequest('/api/pfriends/forum/presence/heartbeat',{method:'POST',body:{channel:slug}})}catch(error){throw new Error(pocketBaseMessage(error,'Status kehadiran gagal diperbarui.'))}}
export async function listForumPresence(){try{client();return(await apiRequest('/api/pfriends/forum/presence')).items||[]}catch(error){throw new Error(pocketBaseMessage(error,'Anggota daring gagal dimuat.'))}}
export async function getForumModeration(){client();return(await apiRequest('/api/pfriends/forum/moderation/me')).moderation}
export async function listForumModerationUsers(query='',status='',userId=''){client();const params=new URLSearchParams();if(query)params.set('q',query);if(status)params.set('status',status);if(userId)params.set('userId',userId);return apiRequest(`/api/pfriends/forum/moderation/users?${params}`)}
export async function getForumModerationHistory(userId){client();return(await apiRequest(`/api/pfriends/forum/moderation/users/${encodeURIComponent(userId)}/history`)).items||[]}
export async function applyForumModerationAction(userId,values){client();return apiRequest(`/api/pfriends/forum/moderation/users/${encodeURIComponent(userId)}/actions`,{method:'POST',body:values})}
export async function subscribeForum(topic,callback,onStatus=()=>{}){
	const pb=client();
	if(topic==='forum:presence'){
		try{const unsubscribe=await pb.collection('forum_presences').subscribe('*',()=>callback({data:{type:'presence.changed'}}));onStatus('live');return unsubscribe}
		catch(error){onStatus('failed',error);throw error}
	}
	const prefix='forum:channel:',channelId=topic.startsWith(prefix)?topic.slice(prefix.length):'';
	if(!channelId)throw new Error('Topik Forum tidak dikenal.');
	const subscriptions=[];
	try{
	const messageSubscription=await pb.collection('forum_messages').subscribe('*',async(event)=>{
		if(event.record.channel!==channelId)return;
		if(event.action==='delete'){callback({data:{type:'message.deleted',messageId:event.record.id}});return;}
		if(event.action==='create'){try{const data=await apiRequest(`/api/pfriends/forum/messages/${event.record.id}/context`),row=(data.items||[]).find(item=>item.id===event.record.id);if(row)callback({data:{type:'message.created',message:row}});else onStatus('stale')}catch(error){onStatus('stale',error)} }
	},{filter:`channel = "${channelId}"`});
	subscriptions.push(messageSubscription);
	const reactionSubscription=await pb.collection('forum_reactions').subscribe('*',async(event)=>{
		try{const data=await apiRequest(`/api/pfriends/forum/messages/${event.record.message}/context`),row=(data.items||[]).find(item=>item.id===event.record.message);if(row?.channelId===channelId)callback({data:{type:'message.reactions',messageId:row.id,reactions:row.reactions.map(item=>({emoji:item.emoji,count:item.count}))}});else onStatus('stale')}catch(error){onStatus('stale',error)}
	},{filter:`message.channel = "${channelId}"`});
	subscriptions.push(reactionSubscription);onStatus('live');
	return async()=>{for(const unsubscribe of subscriptions)await unsubscribe()};
	}catch(error){for(const unsubscribe of subscriptions)await unsubscribe().catch(()=>{});onStatus('failed',error);throw error}
}
