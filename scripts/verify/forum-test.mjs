import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url=process.env.VITE_PB_URL||'http://127.0.0.1:8090',seed=buildSeed();let passed=0;
function ok(value,message){if(!value)throw new Error(message);passed++}
async function login(account){const pb=new PocketBase(url);pb.autoCancellation(false);await pb.collection('users').authWithPassword(account.email,SANDI_DEMO);return pb}
async function expectStatus(work,status,message){try{await work();throw new Error(`${message}: permintaan justru berhasil.`)}catch(error){if(error?.status!==status)throw error;passed++}}
const sobiAccount=seed.accounts.find(x=>x.role==='AWARDEE'&&x.status==='AKTIF'&&seed.awardees.find(a=>a.id===x.awardeeId)?.community==='SOBI');
const womenAccount=seed.accounts.find(x=>x.role==='AWARDEE'&&x.status==='AKTIF'&&seed.awardees.find(a=>a.id===x.awardeeId)?.community==='WOMENPRENEUR');
const adminAccount=seed.accounts.find(x=>x.role==='ADMIN'),verifierAccount=seed.accounts.find(x=>x.role==='VERIFIER');
const [sobi,women,admin,verifier]=await Promise.all([login(sobiAccount),login(womenAccount),login(adminAccount),login(verifierAccount)]);
const sobiChannels=(await sobi.send('/api/pfriends/forum/channels')).items,womenChannels=(await women.send('/api/pfriends/forum/channels')).items;
ok(sobiChannels.some(x=>x.slug==='sobi-alumni')&&!sobiChannels.some(x=>x.slug==='pfpreneur'),'Awardee SOBI tidak terisolasi ke kanal komunitasnya.');
ok(womenChannels.some(x=>x.slug==='pfpreneur')&&!womenChannels.some(x=>x.slug==='sobi-alumni'),'Awardee Womenpreneur tidak terisolasi ke kanal komunitasnya.');
ok(sobiChannels.find(x=>x.slug==='pengumuman')?.canPost===false,'Awardee dapat menulis pengumuman.');
ok((await verifier.send('/api/pfriends/forum/channels')).items.every(x=>x.canPost),'Verifikator tidak dapat menulis seluruh kanal.');
await expectStatus(()=>sobi.send('/api/pfriends/forum/channels/pengumuman/messages',{method:'POST',body:{content:'Tidak boleh masuk.',requestKey:crypto.randomUUID()}}),403,'Pengiriman Awardee ke pengumuman tidak ditolak');
const announcement=await admin.send('/api/pfriends/forum/channels/pengumuman/messages',{method:'POST',body:{content:'Pengumuman integrasi Forum PFriends.',requestKey:crypto.randomUUID()}});
ok(announcement.authorName===admin.authStore.record.displayName,'Identitas pengirim ditentukan bukan dari sesi Admin.');
const requestKey=crypto.randomUUID(),first=await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:'Pesan forum yang tersimpan nyata.',requestKey}}),second=await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:'Pesan forum yang tersimpan nyata.',requestKey}});
ok(first.id===second.id,'requestKey tidak mencegah pesan ganda.');
ok(first.canDelete===true,'Pengirim tidak memperoleh hak hapus pesan sendiri.');
let rows=(await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages?perPage=50')).items;
ok(rows.some(x=>x.id===first.id),'Pesan tersimpan tidak terbaca kembali lewat REST.');
const reply=await women.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:'Ini adalah balasan yang tersimpan.',requestKey:crypto.randomUUID(),replyTo:first.id}});
ok(reply.reply?.id===first.id&&reply.reply?.content===first.content,'Relasi dan cuplikan reply tidak dikembalikan.');
const nestedReply=await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:'Reply ke reply tetap satu tingkat pada tampilan.',requestKey:crypto.randomUUID(),replyTo:reply.id}});
ok(nestedReply.reply?.id===reply.id,'Reply langsung ke pesan balasan tidak tersimpan.');
await expectStatus(()=>sobi.send('/api/pfriends/forum/channels/mangrove/messages',{method:'POST',body:{content:'Reply lintas kanal harus gagal.',requestKey:crypto.randomUUID(),replyTo:first.id}}),400,'Reply lintas kanal tidak ditolak');
const context=await women.send(`/api/pfriends/forum/messages/${first.id}/context`);
ok(context.channelSlug==='tanya-jawab'&&context.items.some(x=>x.id===first.id),'Endpoint konteks tidak mengembalikan pesan asal.');
const emoji='🫶🏽';
let reaction=await women.send(`/api/pfriends/forum/messages/${first.id}/reaction`,{method:'POST',body:{emoji,selected:true}});
ok(reaction.reactions.find(x=>x.emoji===emoji)?.count===1,'Emoji Unicode dari picker tidak tersimpan.');
await expectStatus(()=>women.send(`/api/pfriends/forum/messages/${first.id}/reaction`,{method:'POST',body:{emoji:'bukan emoji',selected:true}}),400,'Nilai di luar allowlist emoji tidak ditolak');
reaction=await women.send(`/api/pfriends/forum/messages/${first.id}/reaction`,{method:'POST',body:{emoji,selected:false}});
ok(!reaction.reactions.some(x=>x.emoji===emoji),'Reaksi tidak dapat dibatalkan atau chip kosong masih dikembalikan.');
const spamText=`Pesan duplikat ${crypto.randomUUID()}`;
await verifier.send('/api/pfriends/forum/channels/mangrove/messages',{method:'POST',body:{content:spamText,requestKey:crypto.randomUUID()}});
await expectStatus(()=>verifier.send('/api/pfriends/forum/channels/mangrove/messages',{method:'POST',body:{content:spamText,requestKey:crypto.randomUUID()}}),429,'Pesan duplikat dalam dua menit tidak dibatasi');
const deleteTarget=await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:`Pesan yang akan dihapus ${crypto.randomUUID()}`,requestKey:crypto.randomUUID()}});
await expectStatus(()=>women.send(`/api/pfriends/forum/messages/${deleteTarget.id}`,{method:'DELETE'}),403,'Pengguna lain dapat menghapus pesan tanpa hak moderasi');
await sobi.send(`/api/pfriends/forum/messages/${deleteTarget.id}`,{method:'DELETE'});
rows=(await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages?perPage=50')).items;
ok(!rows.some(x=>x.id===deleteTarget.id),'Pesan yang dihapus masih muncul pada riwayat kanal.');
await expectStatus(()=>women.send(`/api/pfriends/forum/messages/${deleteTarget.id}/reaction`,{method:'POST',body:{emoji,selected:true}}),404,'Pesan yang sudah dihapus masih dapat diakses');
await sobi.send('/api/pfriends/forum/presence/heartbeat',{method:'POST',body:{channel:'tanya-jawab'}});
ok((await sobi.send('/api/pfriends/forum/presence')).items.some(x=>x.id===sobi.authStore.record.id&&x.state==='aktif'),'Heartbeat tidak menghasilkan presence aktif.');
const tanya=sobiChannels.find(x=>x.slug==='tanya-jawab');let realtime=false;
const stream=await fetch(`${url}/api/realtime`),reader=stream.body.getReader(),decoder=new TextDecoder();let buffer='',clientId='';
while(!clientId){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});const match=buffer.match(/id:\s*([^\r\n]+)/);if(match)clientId=match[1].trim()}
ok(Boolean(clientId),'Koneksi SSE tidak menghasilkan clientId.');
const subscription=await fetch(`${url}/api/realtime`,{method:'POST',headers:{Authorization:women.authStore.token,'Content-Type':'application/json'},body:JSON.stringify({clientId,subscriptions:[`forum:channel:${tanya.id}`]})});
ok(subscription.status===204,'Subscription SSE Forum ditolak.');
await sobi.send('/api/pfriends/forum/channels/tanya-jawab/messages',{method:'POST',body:{content:'Pesan realtime SSE.',requestKey:crypto.randomUUID()}});
const deadline=Date.now()+3000;while(Date.now()<deadline&&!realtime){const chunk=await Promise.race([reader.read(),new Promise(resolve=>setTimeout(()=>resolve({done:true}),500))]);if(chunk.done)continue;buffer+=decoder.decode(chunk.value,{stream:true});if(buffer.includes('message.created'))realtime=true}await reader.cancel();
ok(realtime,'Pesan baru tidak diterima melalui SSE.');
console.log(`Forum PocketBase: ${passed} asersi lulus.`);
