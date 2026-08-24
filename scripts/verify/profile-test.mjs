import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url=process.env.VITE_PB_URL||'http://127.0.0.1:8090';
const adminEmail=process.env.PB_SUPERUSER_EMAIL,adminPassword=process.env.PB_SUPERUSER_PASSWORD;
if(!adminEmail||!adminPassword)throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');
const seed=buildSeed(),account=seed.accounts.find(item=>item.role==='AWARDEE'&&item.status==='AKTIF'&&seed.awardees.find(row=>row.id===item.awardeeId)?.community==='WOMENPRENEUR'),sobi=seed.accounts.find(item=>item.role==='AWARDEE'&&item.status==='AKTIF'&&seed.awardees.find(row=>row.id===item.awardeeId)?.community==='SOBI'),staff=seed.accounts.find(item=>item.role==='VERIFIER');
let passed=0;function ok(value,message){if(!value)throw new Error(message);passed++;}
const pb=new PocketBase(url);pb.autoCancellation(false);await pb.collection('users').authWithPassword(account.email,SANDI_DEMO);
const root=new PocketBase(url);root.autoCancellation(false);await root.collection('_superusers').authWithPassword(adminEmail,adminPassword);
const initial=await pb.send('/api/pfriends/profile/me');
ok(initial.profile?.community==='WOMENPRENEUR'&&Array.isArray(initial.consents?.history),'DTO profil lengkap tidak tersedia.');
const awardee=await root.collection('awardees').getFirstListItem(root.filter('user = {:user}',{user:pb.authStore.record.id}));
const stories=await root.collection('stories').getFullList({filter:root.filter('author = {:awardee}',{awardee:awardee.id})});
ok(initial.statistics.total===stories.length&&initial.statistics.totalViews===stories.reduce((sum,row)=>sum+(row.views||0),0),'Statistik Cerita tidak cocok dengan sumber PocketBase.');
const original={whatsapp:initial.profile.whatsapp,city:initial.profile.city,occupation:initial.profile.occupation,bio:initial.profile.bio,skills:initial.profile.skills,openToMentoring:initial.profile.openToMentoring,profileVisibility:initial.profile.profileVisibility,businessName:initial.profile.businessName,businessSector:initial.profile.businessSector,businessCity:initial.profile.businessCity,businessDescription:initial.profile.businessDescription,businessContact:initial.profile.businessContact,businessEmployees:initial.profile.businessEmployees,businessGrowthPercent:initial.profile.businessGrowthPercent};
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130]);
const updated=await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:{...original,occupation:'Penguji Profil PocketBase',profileVisibility:'PRIVATE'}});
ok(updated.profile.occupation==='Penguji Profil PocketBase','Field profil aman tidak tersimpan.');
const audits=await root.collection('profile_audits').getFullList({filter:root.filter('awardee = {:awardee} && operation = "PROFILE_UPDATE"',{awardee:awardee.id})});ok(audits.length>0,'Perubahan profil tidak menghasilkan audit.');
const hidden=await pb.send(`/api/pfriends/directory?search=${encodeURIComponent(initial.profile.fullName)}`);ok(!hidden.items.some(item=>item.id===initial.profile.id),'Profil privat masih terlihat di Jejaring.');
let locked=false;try{await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:{fullName:'Nama tidak sah'}});}catch(error){locked=error.status===400;}ok(locked,'Field identitas terverifikasi dapat diubah.');
await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:original});

const sobiPb=new PocketBase(url);await sobiPb.collection('users').authWithPassword(sobi.email,SANDI_DEMO);
const originalAsset=initial.profile.avatarAsset;
let originalAvatar=null;
if(originalAsset?.image){const token=await pb.files.getToken(),response=await fetch(pb.files.getURL({id:originalAsset.id,collectionName:'profile_avatars'},originalAsset.image,{token}));if(response.ok)originalAvatar={blob:await response.blob(),name:originalAsset.image};}
const nameWasActive=Boolean(initial.consents.effective.PUBLIKASI_NAMA),photoWasActive=Boolean(initial.consents.effective.PUBLIKASI_FOTO_WAJAH),contactWasActive=Boolean(initial.consents.effective.KONTAK_UNTUK_MENTORING);
if(!nameWasActive)await pb.send('/api/pfriends/profile/consents/PUBLIKASI_NAMA/grant',{method:'POST'});
if(!photoWasActive)await pb.send('/api/pfriends/profile/consents/PUBLIKASI_FOTO_WAJAH/grant',{method:'POST'});
if(!contactWasActive)await pb.send('/api/pfriends/profile/consents/KONTAK_UNTUK_MENTORING/grant',{method:'POST'});
const avatarForm=new FormData();for(const[key,value]of Object.entries({...original,profileVisibility:'DIRECTORY',openToMentoring:true}))avatarForm.set(key,key==='skills'?JSON.stringify(value):String(value));avatarForm.set('avatar',new Blob([png],{type:'image/png'}),'avatar-uji.png');
const avatarUpdated=await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:avatarForm});ok(Boolean(avatarUpdated.profile.avatarAsset?.image),'Avatar sendiri tidak tersimpan pada aset profil aman.');
let shared=await sobiPb.send(`/api/pfriends/directory?search=${encodeURIComponent(initial.profile.fullName)}&page=1&perPage=12`),sharedItem=shared.items.find(item=>item.id===initial.profile.id);
const expectedWhatsapp=String(original.whatsapp).replace(/[^0-9]/g,'');ok(Boolean(sharedItem?.avatar?.image)&&sharedItem?.whatsapp===expectedWhatsapp,'Avatar dan WhatsApp mentoring tidak terlihat saat seluruh syarat aktif.');
const viewerToken=await sobiPb.files.getToken(),avatarResponse=await fetch(sobiPb.files.getURL({id:sharedItem.avatar.id,collectionName:'profile_avatars'},sharedItem.avatar.image,{token:viewerToken}));ok(avatarResponse.ok,'File avatar consent aktif tidak dapat dibaca Awardee lain.');
await pb.send('/api/pfriends/profile/consents/PUBLIKASI_FOTO_WAJAH/revoke',{method:'POST'});shared=await sobiPb.send(`/api/pfriends/directory?search=${encodeURIComponent(initial.profile.fullName)}`);sharedItem=shared.items.find(item=>item.id===initial.profile.id);ok(!sharedItem?.avatar&&sharedItem?.whatsapp===expectedWhatsapp,'Pencabutan consent foto tidak hanya menyembunyikan avatar.');
await pb.send('/api/pfriends/profile/consents/KONTAK_UNTUK_MENTORING/revoke',{method:'POST'});shared=await sobiPb.send(`/api/pfriends/directory?search=${encodeURIComponent(initial.profile.fullName)}`);sharedItem=shared.items.find(item=>item.id===initial.profile.id);ok(!sharedItem?.whatsapp,'WhatsApp tetap dikirim setelah consent kontak dicabut.');
if(photoWasActive)await pb.send('/api/pfriends/profile/consents/PUBLIKASI_FOTO_WAJAH/grant',{method:'POST'});
if(contactWasActive)await pb.send('/api/pfriends/profile/consents/KONTAK_UNTUK_MENTORING/grant',{method:'POST'});
if(!nameWasActive)await pb.send('/api/pfriends/profile/consents/PUBLIKASI_NAMA/revoke',{method:'POST'});
const restoreAvatar=new FormData();for(const[key,value]of Object.entries(original))restoreAvatar.set(key,key==='skills'?JSON.stringify(value):String(value));if(originalAvatar)restoreAvatar.set('avatar',originalAvatar.blob,originalAvatar.name);else restoreAvatar.set('removeAvatar','true');await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:restoreAvatar});

const type='PUBLIKASI_VIDEO',beforeEvents=(await root.collection('profile_consents').getFullList({filter:root.filter('awardee = {:awardee} && consentType = {:type}',{awardee:awardee.id,type})})).length;
if(initial.consents.effective[type])await pb.send(`/api/pfriends/profile/consents/${type}/revoke`,{method:'POST'});
await pb.send(`/api/pfriends/profile/consents/${type}/grant`,{method:'POST'});let duplicate=false;try{await pb.send(`/api/pfriends/profile/consents/${type}/grant`,{method:'POST'});}catch(error){duplicate=error.status===400;}ok(duplicate,'Consent aktif dapat diberikan dua kali.');
await pb.send(`/api/pfriends/profile/consents/${type}/revoke`,{method:'POST'});await pb.send(`/api/pfriends/profile/consents/${type}/grant`,{method:'POST'});
const afterEvents=await root.collection('profile_consents').getFullList({filter:root.filter('awardee = {:awardee} && consentType = {:type}',{awardee:awardee.id,type})});ok(afterEvents.length>=beforeEvents+3&&afterEvents.some(row=>row.eventType==='REVOKED'),'Riwayat consent tidak append-only.');

if(!initial.consents.effective.PUBLIKASI_DATA_USAHA)await pb.send('/api/pfriends/profile/consents/PUBLIKASI_DATA_USAHA/grant',{method:'POST'});
for(const old of await root.collection('business_products').getFullList({filter:root.filter('awardee = {:awardee} && name = "Produk Uji Profil"',{awardee:awardee.id})}))await root.collection('business_products').delete(old.id);
const form=new FormData();form.set('name','Produk Uji Profil');form.set('category','Produk Uji');form.set('description','Produk sementara untuk pengujian integrasi profil.');form.set('image',new Blob([png],{type:'image/png'}),'produk.png');
const product=await pb.send('/api/pfriends/profile/products',{method:'POST',body:form});ok(product.id&&product.image,'Produk Womenpreneur gagal dibuat.');
await pb.send('/api/pfriends/profile/me',{method:'PATCH',body:{...original,profileVisibility:'DIRECTORY'}});
const visible=await pb.send(`/api/pfriends/directory?search=${encodeURIComponent('Produk Uji Profil')}`);ok(visible.items.some(item=>item.id===initial.profile.id&&item.businessProfile?.products?.some(row=>row.id===product.id)),'Etalase tidak terlihat di Jejaring saat consent aktif.');
await pb.send(`/api/pfriends/profile/products/${product.id}`,{method:'DELETE'});ok(!(await root.collection('business_products').getFullList({filter:root.filter('id = {:id}',{id:product.id})})).length,'Produk tidak terhapus.');

let sobiBlocked=false;try{await sobiPb.send('/api/pfriends/profile/products',{method:'POST',body:form});}catch(error){sobiBlocked=error.status===403;}ok(sobiBlocked,'Awardee SOBI dapat membuat produk.');
const staffPb=new PocketBase(url);await staffPb.collection('users').authWithPassword(staff.email,SANDI_DEMO);let staffBlocked=false;try{await staffPb.send('/api/pfriends/profile/me');}catch(error){staffBlocked=error.status===403;}ok(staffBlocked,'Staf dapat membaca endpoint profil pribadi Awardee.');
console.log(`PocketBase profile integration: ${passed} asersi lulus.`);
