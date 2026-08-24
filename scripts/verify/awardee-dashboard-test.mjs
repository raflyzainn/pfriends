import { readFile } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.PB_SUPERUSER_EMAIL;
const adminPassword = process.env.PB_SUPERUSER_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');

let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed++; }

const seed = buildSeed();
const account = seed.accounts.find((item) => item.role === 'AWARDEE' && item.status === 'AKTIF');
const pb = new PocketBase(url);
pb.autoCancellation(false);
await pb.collection('users').authWithPassword(account.email, SANDI_DEMO);

const [events, broadcasts, stories, gamification] = await Promise.all([
	pb.send('/api/pfriends/events'),
	pb.send('/api/pfriends/broadcasts'),
	pb.send('/api/pfriends/stories/mine'),
	pb.send('/api/pfriends/gamification/me')
]);
ok(Array.isArray(events.items) && events.items.length > 0, 'Kegiatan dashboard tidak berasal dari PocketBase.');
ok(events.items.every((item) => ['TERJADWAL','BERLANGSUNG','SELESAI','DIUSULKAN','DITOLAK'].includes(item.status)), 'Status kegiatan dashboard tidak tersanitasi.');
ok(Array.isArray(broadcasts.broadcasts) && broadcasts.broadcasts.every((item) => item.status === 'TERKIRIM'), 'Kabar dashboard memuat status nonpublik.');
ok(Array.isArray(stories.items) && stories.items.every((item) => item.authorId === pb.authStore.record.awardeeId), 'Ringkasan Cerita memuat Cerita pengguna lain.');
ok(gamification.profile?.awardeeId === pb.authStore.record.awardeeId, 'Gamifikasi dashboard tidak cocok dengan akun Awardee.');

const root = new PocketBase(url);
root.autoCancellation(false);
await root.collection('_superusers').authWithPassword(adminEmail, adminPassword);
const storyRows = await root.collection('stories').getFullList();
const authors = new Set(storyRows.map((item) => item.author));
const awardees = await root.collection('awardees').getFullList({ filter: 'status = "AKTIF"' });
const users = await root.collection('users').getFullList({ filter: 'status = "AKTIF"' });
const activeEmails = new Set(users.map((item) => item.email));
const awardeeByLegacyId = new Map(awardees.map((item) => [item.legacyId, item]));
const emptyAccount = seed.accounts.find((item) => {
	const awardee = awardeeByLegacyId.get(item.awardeeId);
	return item.role === 'AWARDEE' && activeEmails.has(item.email) && awardee && !authors.has(awardee.id);
});
ok(Boolean(emptyAccount), 'Tidak tersedia akun seed aktif tanpa Cerita untuk menguji empty state.');
const emptyPb = new PocketBase(url);
await emptyPb.collection('users').authWithPassword(emptyAccount.email, SANDI_DEMO);
const emptyStories = await emptyPb.send('/api/pfriends/stories/mine');
ok(emptyStories.items.length === 0, 'Akun tanpa Cerita tidak menghasilkan daftar PocketBase kosong.');

const sources = await Promise.all([
	readFile(new URL('../../src/routes/awardee/+page.svelte', import.meta.url), 'utf8'),
	readFile(new URL('../../src/routes/awardee/+layout.svelte', import.meta.url), 'utf8'),
	readFile(new URL('../../src/lib/stores/awardee-dashboard.svelte.js', import.meta.url), 'utf8'),
	readFile(new URL('../../src/lib/infrastructure/pocketbase/awardeeDashboard.js', import.meta.url), 'utf8')
]);
const forbidden = /catalog|editorial|bootstrapDatabase|Dexie|infrastructure\/repositories/;
ok(sources.every((source) => !forbidden.test(source)), 'Dashboard Awardee masih memiliki jalur data lokal atau repository gabungan.');
const dummyNotice = await readFile(new URL('../../src/lib/components/DummyRouteNotice.svelte', import.meta.url), 'utf8');
ok(dummyNotice.includes("if (path === '/awardee') return '';"), 'Label DUMMY belum dinonaktifkan untuk route /awardee.');

console.log(`PocketBase Awardee dashboard: ${passed} asersi lulus.`);
