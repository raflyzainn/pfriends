import PocketBase from 'pocketbase';
const url=process.env.VITE_PB_URL||'http://127.0.0.1:8090', password=process.env.PFRIENDS_TEST_PASSWORD||'pfriends2026';
let passed=0; function ok(value,message){if(!value)throw new Error(message);passed++;console.log(`  ✓ ${message}`)}
async function login(email){const pb=new PocketBase(url);await pb.collection('users').authWithPassword(email,password);return pb}
const admin=await login('admin@pertaminafoundation.org'), verifier=await login('verifikator@pertaminafoundation.org');
const initial=await admin.send('/api/pfriends/point-actions');ok(initial.actions.length===9,'sembilan aksi inti tersedia dari PocketBase');
const created=await admin.send('/api/pfriends/staff/point-actions',{method:'POST',body:{label:'Aksi uji dinamis',description:'Kontribusi uji yang wajib ditinjau melalui Bukti Keaktifan.',actionClass:'C',pillar:'Pengujian',points:17,dailyCap:2,status:'ACTIVE'}});
ok(created.code.startsWith('CUSTOM_')&&created.workflow==='EVIDENCE'&&!created.isCore,'Admin membuat aksi kustom berbukti dengan kode server');
const updated=await verifier.send(`/api/pfriends/staff/point-actions/${created.id}`,{method:'PATCH',body:{...created,label:'Aksi uji diperbarui',points:19,dailyCap:3,status:'ACTIVE'}});
ok(updated.points===19&&updated.label==='Aksi uji diperbarui','Verifikator dapat memperbarui nilai aksi');
const audit=await verifier.send(`/api/pfriends/staff/point-actions/${created.id}/audit`);ok(audit.audits.length===2,'riwayat create dan update tercatat');
const removed=await verifier.send(`/api/pfriends/staff/point-actions/${created.id}`,{method:'DELETE'});ok(removed.archived===false,'aksi kustom tanpa riwayat dapat dihapus');
const core=initial.actions.find(row=>row.code==='KNOWLEDGE_QA');const archived=await admin.send(`/api/pfriends/staff/point-actions/${core.id}`,{method:'DELETE'});ok(archived.archived===true,'aksi inti dinonaktifkan dan tidak dihapus');
await admin.send(`/api/pfriends/staff/point-actions/${core.id}`,{method:'PATCH',body:{...core,status:'ACTIVE'}});
console.log(`\nLULUS: ${passed}`);
