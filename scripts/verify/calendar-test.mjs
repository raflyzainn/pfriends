import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const bundle = buildSeed(); let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed++; }

const publicPb = new PocketBase(url);
const initial = await publicPb.send('/api/pfriends/events');
if (process.env.EXPECT_EMPTY_EVENTS === '1') ok(initial.items.length === 0, 'Seeder membuat event; kalender seharusnya kosong.');

const awardeeAccount = bundle.accounts.find((row) => row.role === 'AWARDEE' && row.status === 'AKTIF');
const verifierAccount = bundle.accounts.find((row) => row.role === 'VERIFIER' && row.status === 'AKTIF');
const awardee = new PocketBase(url); const verifier = new PocketBase(url);
await awardee.collection('users').authWithPassword(awardeeAccount.email, SANDI_DEMO);
await verifier.collection('users').authWithPassword(verifierAccount.email, SANDI_DEMO);

const tomorrow = new Date(Date.now() + 86400000); const end = new Date(tomorrow.getTime() + 3600000);
const proposed = await awardee.send('/api/pfriends/events', { method: 'POST', body: { title: `Event pengujian ${Date.now()}`, type: 'UPSKILLING', description: 'Event khusus pengujian integrasi kalender PocketBase dan bukti hadir.', location: 'Ruang pengujian', isOnline: true, startsAt: tomorrow.toISOString(), endsAt: end.toISOString(), quota: 1 } });
ok(proposed.status === 'DIUSULKAN', 'Usulan Awardee tidak berstatus DIUSULKAN.');
ok(!(await publicPb.send('/api/pfriends/events')).items.some((row) => row.id === proposed.id), 'Usulan mentah bocor ke kalender publik.');

const approved = await verifier.send(`/api/pfriends/events/${proposed.id}/decision`, { method: 'POST', body: { decision: 'APPROVE', note: '' } });
ok(approved.status === 'TERJADWAL', 'Verifikator gagal menyetujui event.');
ok((await publicPb.send('/api/pfriends/events')).items.some((row) => row.id === proposed.id), 'Event disetujui tidak tampil publik.');

await awardee.send(`/api/pfriends/events/${proposed.id}/register`, { method: 'POST' });
let duplicateBlocked = false; try { await awardee.send(`/api/pfriends/events/${proposed.id}/register`, { method: 'POST' }); } catch (error) { duplicateBlocked = error.status === 400; }
ok(duplicateBlocked, 'Pendaftaran event ganda tidak ditolak.');

const yesterday = new Date('2020-01-02T02:00:00.000Z'); const pastEnd = new Date('2020-01-02T03:00:00.000Z');
await verifier.send(`/api/pfriends/events/${proposed.id}`, { method: 'PATCH', body: { ...approved, startsAt: yesterday.toISOString(), endsAt: pastEnd.toISOString() } });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const form = new FormData(); form.set('owner', awardee.authStore.record.id); form.set('activityType', 'SESSION_ATTEND'); form.set('event', proposed.id); form.set('activityDate', pastEnd.toISOString()); form.set('title', 'Bukti hadir event'); form.set('description', 'Bukti hadir event untuk pengujian integrasi.'); form.set('evidenceFiles', new File([png], 'bukti-hadir.png', { type: 'image/png' }));
const submission = await awardee.collection('activity_submissions').create(form);
ok(submission.event === proposed.id && submission.status === 'SUBMITTED', 'Bukti hadir tidak terhubung ke event.');
await verifier.send(`/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST' });
await verifier.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'APPROVE', note: 'Kehadiran sesuai.' } });
const ledger = await awardee.collection('verified_point_activities').getFirstListItem(awardee.filter('submission = {:id}', { id: submission.id }));
ok(ledger.activityType === 'SESSION_ATTEND' && ledger.points === 15, 'Persetujuan bukti tidak membukukan 15 poin SESSION_ATTEND.');
const participant = await awardee.collection('event_participants').getFirstListItem(awardee.filter('event = {:event}', { event: proposed.id }));
ok(participant.attendanceStatus === 'APPROVED', 'Peserta tidak ditandai hadir setelah bukti disetujui.');

console.log(`Calendar PocketBase: ${passed} pemeriksaan lulus.`);
