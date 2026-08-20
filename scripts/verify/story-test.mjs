import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();
const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const maintenance = new PocketBase(url);
await maintenance.collection('_superusers').authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD);
const accounts = buildSeed().accounts;
const verifierAccount = accounts.find((item) => item.role === 'VERIFIER' && item.status === 'AKTIF');
const awardeeProfiles = await maintenance.collection('awardees').getFullList({ filter: 'consentActive = true' });
let awardeeAccount;
for (const profile of awardeeProfiles) {
	const user = await maintenance.collection('users').getOne(profile.user);
	awardeeAccount = accounts.find((item) => item.id === user.legacyAccountId && item.status === 'AKTIF');
	if (awardeeAccount) break;
}
if (!verifierAccount || !awardeeAccount) throw new Error('Akun demo untuk pengujian Cerita tidak lengkap.');

const login = async (account) => {
	const pb = new PocketBase(url);
	await pb.collection('users').authWithPassword(account.email, SANDI_DEMO);
	return pb;
};
const awardee = await login(awardeeAccount);
const verifier = await login(verifierAccount);
let checks = 0;
const expect = (value, message) => { if (!value) throw new Error(message); checks++; };
const suffix = Date.now();
const title = `Cerita Integrasi PocketBase ${suffix}`;
const paragraph = 'Kegiatan warga menghasilkan perubahan yang dapat diperiksa melalui catatan peserta, waktu pelaksanaan, lokasi, bukti foto, dan hasil yang dicatat bersama secara terbuka.';
const body = Array.from({ length: 28 }, () => paragraph).join(' ');
const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,8,215,99,248,207,192,240,31,0,5,0,1,255,137,153,61,29,0,0,0,0,73,69,78,68,174,66,96,130]);
const form = new FormData();
form.set('title', title);
form.set('summary', 'Ringkasan pengujian alur Cerita privat pada PocketBase.');
form.set('body', body);
form.set('location', 'Jakarta');
form.set('activityDate', new Date().toISOString().slice(0, 10));
form.set('participantCount', '12');
form.set('esgTags', JSON.stringify([{ pillar: 'S', sdgGoal: 4 }]));
form.set('outcome', JSON.stringify({ note: 'Dua belas peserta menyelesaikan kegiatan dan hasilnya terdokumentasi dengan baik.', metric: 'Peserta', value: 12, unit: 'orang' }));
form.append('evidenceFiles', new Blob([png], { type: 'image/png' }), 'bukti.png');
form.set('coverCandidate', new Blob([png], { type: 'image/png' }), 'sampul.png');

let story;
try {
	story = await awardee.send('/api/pfriends/stories/drafts', { method: 'POST', body: form });
	expect(story.status === 'DRAFT' && story.evidenceFiles.length === 1 && story.coverCandidate, 'Draf dan berkas privat harus tersimpan.');
	expect(story.esgTags?.[0]?.pillar === 'S' && Number(story.esgTags?.[0]?.sdgGoal) === 4, `Tag ESG draf tidak tersimpan dengan benar: ${JSON.stringify(story.esgTags)}`);
	const submitted = await awardee.send(`/api/pfriends/stories/${story.id}/submit`, { method: 'POST' });
	expect(submitted.status === 'DIAJUKAN', 'Draf harus masuk antrean Verifikator.');
	const mine = await awardee.send('/api/pfriends/stories/mine');
	expect(mine.items.some((item) => item.id === story.id), 'Awardee harus melihat Cerita miliknya.');
	const queue = await verifier.send('/api/pfriends/verifier/stories');
	expect(queue.items.some((item) => item.id === story.id), 'Verifikator harus melihat Cerita yang diajukan.');
	await verifier.send(`/api/pfriends/verifier/stories/${story.id}/start-review`, { method: 'POST' });
	await verifier.send(`/api/pfriends/verifier/stories/${story.id}/decision`, { method: 'POST', body: { decision: 'REQUEST_REVISION', note: 'Lengkapi penjelasan hasil kegiatan.' } });
	const revision = new FormData();
	revision.set('title', title);
	revision.set('summary', 'Ringkasan perbaikan pengujian alur Cerita privat pada PocketBase.');
	revision.set('body', `${body} Catatan hasil sudah dilengkapi sesuai permintaan Verifikator.`);
	revision.set('location', 'Jakarta Pusat');
	revision.set('activityDate', new Date().toISOString().slice(0, 10));
	revision.set('participantCount', '12');
	revision.set('esgTags', JSON.stringify([{ pillar: 'S', sdgGoal: 4 }]));
	revision.set('outcome', JSON.stringify({ note: 'Dua belas peserta menyelesaikan kegiatan dan perubahan hasil dicatat secara lengkap.', metric: 'Peserta', value: 12, unit: 'orang' }));
	const revised = await awardee.send(`/api/pfriends/stories/${story.id}/draft`, { method: 'PATCH', body: revision });
	expect(revised.id === story.id && revised.evidenceFiles.length === 1, 'Revisi harus memakai record dan bukti yang sama.');
	await awardee.send(`/api/pfriends/stories/${story.id}/submit`, { method: 'POST' });
	await verifier.send(`/api/pfriends/verifier/stories/${story.id}/start-review`, { method: 'POST' });
	let rejectedChecks = false;
	try { await verifier.send(`/api/pfriends/verifier/stories/${story.id}/decision`, { method: 'POST', body: { decision: 'APPROVE', sensitivityChecks: [1] } }); } catch (error) { rejectedChecks = error.status === 400; }
	expect(rejectedChecks, 'Persetujuan harus menolak checklist data sensitif yang belum lengkap.');
	const approved = await verifier.send(`/api/pfriends/verifier/stories/${story.id}/decision`, { method: 'POST', body: { decision: 'APPROVE', sensitivityChecks: Array.from({ length: 21 }, (_, index) => index + 1) } });
	expect(approved.status === 'DISETUJUI', 'Cerita harus dapat disetujui setelah checklist lengkap.');
	const published = await verifier.send(`/api/pfriends/verifier/stories/${story.id}/publish`, { method: 'POST' });
	expect(published.status === 'TERPUBLIKASI' && published.coverUrl, 'Cerita harus terbit dengan sampul publik.');
	const publicList = await maintenance.send('/api/pfriends/public/stories');
	expect(publicList.items.some((item) => item.slug === published.slug), 'Cerita terbit harus muncul pada endpoint publik.');
	await verifier.send(`/api/pfriends/verifier/stories/${story.id}/archive`, { method: 'POST', body: { reason: 'PERMINTAAN_ANGGOTA' } });
	const publicAfterArchive = await maintenance.send('/api/pfriends/public/stories');
	expect(!publicAfterArchive.items.some((item) => item.slug === published.slug), 'Cerita yang diarsipkan harus hilang dari endpoint publik.');
	const ledger = await maintenance.collection('verified_point_activities').getFullList({ filter: maintenance.filter('story = {:story} && activityType = "STORY_SUBMIT"', { story: story.id }) });
	expect(ledger.length === 1, 'Pengiriman ulang tidak boleh menggandakan ledger poin.');
} finally {
	if (story?.id) await maintenance.collection('stories').delete(story.id).catch(() => {});
}

console.log(`Workflow Cerita PocketBase: ${checks} pemeriksaan lulus.`);
