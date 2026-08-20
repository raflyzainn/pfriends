import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const { accounts } = buildSeed();
const awardees = accounts.filter((account) => account.role === 'AWARDEE' && account.status === 'AKTIF');
const verifiers = accounts.filter((account) => account.role === 'VERIFIER' && account.status === 'AKTIF');
const verifier = verifiers[0];
if (awardees.length < 2 || verifiers.length < 2) throw new Error('Seed tidak menyediakan aktor pengujian.');

let passed = 0;
function ok(condition, message) {
	if (!condition) throw new Error(message);
	passed++;
}

const owner = new PocketBase(url);
await owner.collection('users').authWithPassword(awardees[0].email, SANDI_DEMO);
ok(owner.authStore.record.role === 'AWARDEE', 'Login Awardee gagal.');

let profileLocked = false;
try { await owner.collection('users').update(owner.authStore.record.id, { role: 'ADMIN' }); } catch (error) { profileLocked = error.status === 403 || error.status === 404; }
ok(profileLocked, 'Awardee dapat mengubah role profilnya sendiri.');

const stamp = Date.now();
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const submission = await owner.collection('activity_submissions').create({
	owner: owner.authStore.record.id,
	activityType: 'STORY_SUBMIT',
	activityDate: new Date().toISOString(),
	title: `Bukti integrasi ${stamp}`,
	description: 'Dokumentasi otomatis untuk membuktikan alur PocketBase berjalan lengkap.',
	externalUrl: 'https://example.com/bukti',
	evidenceFiles: [new File([tinyPng], `bukti-${stamp}.png`, { type: 'image/png' })]
});
ok(submission.status === 'SUBMITTED', 'Status awal bukan SUBMITTED.');
ok(submission.awardeeId === awardees[0].awardeeId, 'awardeeId tidak ditetapkan server.');
let events = await owner.collection('submission_status_events').getFullList({ filter: owner.filter('submission = {:id}', { id: submission.id }), sort: 'occurredAt' });
ok(events.length === 1 && events[0].eventType === 'SUBMITTED', 'Event pengiriman awal tidak tercatat.');

const stranger = new PocketBase(url);
await stranger.collection('users').authWithPassword(awardees[1].email, SANDI_DEMO);
let hidden = false;
try { await stranger.collection('activity_submissions').getOne(submission.id); } catch (error) { hidden = error.status === 404 || error.status === 403; }
ok(hidden, 'Awardee lain dapat membaca submission yang bukan miliknya.');

const reviewer = new PocketBase(url);
await reviewer.collection('users').authWithPassword(verifier.email, SANDI_DEMO);
let decisionBeforeStartBlocked = false;
try { await reviewer.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'APPROVE', note: '' } }); } catch (error) { decisionBeforeStartBlocked = error.status === 400; }
ok(decisionBeforeStartBlocked, 'Keputusan dapat dibuat sebelum pemeriksaan dimulai.');
await reviewer.send(`/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST' });
let current = await owner.collection('activity_submissions').getOne(submission.id);
ok(current.status === 'IN_REVIEW', 'Mulai pemeriksaan tidak mengubah status menjadi IN_REVIEW.');

const secondReviewer = new PocketBase(url);
await secondReviewer.collection('users').authWithPassword(verifiers[1].email, SANDI_DEMO);
let revisionWithoutNoteBlocked = false;
try { await secondReviewer.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'REQUEST_REVISION', note: '' } }); } catch (error) { revisionWithoutNoteBlocked = error.status === 400; }
ok(revisionWithoutNoteBlocked, 'Revisi tanpa catatan tidak ditolak.');
await secondReviewer.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'REQUEST_REVISION', note: 'Tambahkan konteks pelaksanaan.' } });
current = await owner.collection('activity_submissions').getOne(submission.id);
ok(current.status === 'NEEDS_REVISION', 'Permintaan revisi tidak tersimpan.');
ok(current.reviewer === secondReviewer.authStore.record.id, 'Verifikator kedua tidak dapat memutuskan pengajuan yang dimulai Verifikator pertama.');

current = await owner.collection('activity_submissions').update(submission.id, {
	title: current.title,
	description: `${current.description} Konteks pelaksanaan telah dilengkapi.`,
	externalUrl: current.externalUrl,
	activityDate: current.activityDate
});
ok(current.status === 'SUBMITTED', 'Kirim ulang tidak kembali ke SUBMITTED.');
await reviewer.send(`/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST' });

const activityDay = current.activityDate.slice(0, 10);
const priorLedger = await owner.collection('verified_point_activities').getFullList({
	filter: owner.filter('awardeeId = {:awardeeId} && activityType = "STORY_SUBMIT" && occurredAt >= {:start} && occurredAt <= {:end}', {
		awardeeId: awardees[0].awardeeId,
		start: `${activityDay} 00:00:00.000Z`,
		end: `${activityDay} 23:59:59.999Z`
	})
});
const expectedPoints = priorLedger.length >= 1 ? 0 : 10;
await secondReviewer.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'APPROVE', note: 'Bukti sesuai.' } });
current = await owner.collection('activity_submissions').getOne(submission.id);
ok(current.status === 'APPROVED', 'Approval tidak tersimpan.');
const ledger = await owner.collection('verified_point_activities').getFirstListItem(owner.filter('submission = {:id}', { id: submission.id }));
ok(ledger.points === expectedPoints, 'Poin STORY_SUBMIT tidak mengikuti batas harian.');
ok(expectedPoints !== 0 || ledger.capReason === 'DAILY_CAP', 'Alasan batas harian tidak tercatat.');

let duplicateBlocked = false;
try { await reviewer.send(`/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', body: { decision: 'APPROVE', note: '' } }); } catch (error) { duplicateBlocked = error.status === 400; }
ok(duplicateBlocked, 'Approval kedua tidak ditolak.');

events = await owner.collection('submission_status_events').getFullList({ filter: owner.filter('submission = {:id}', { id: submission.id }), sort: 'occurredAt' });
ok(events.map((event) => event.eventType).join(',') === 'SUBMITTED,REVIEW_STARTED,REVISION_REQUESTED,RESUBMITTED,REVIEW_STARTED,APPROVED', 'Urutan audit status tidak lengkap.');
const history = await reviewer.collection('submission_reviews').getList(1, 25, { filter: reviewer.filter('submission = {:id}', { id: submission.id }), expand: 'reviewer,submission,submission.owner' });
ok(history.totalItems === 2 && history.items.every((item) => item.expand?.submission), 'Riwayat keputusan lengkap tidak dapat dimuat Verifikator.');

console.log(`PocketBase integration: ${passed} asersi lulus.`);
