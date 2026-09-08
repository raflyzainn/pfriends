import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();
const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const maintenance = new PocketBase(url);
await maintenance.collection('_superusers').authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD);

const accounts = buildSeed().accounts;
const login = async (role) => {
	const account = accounts.find((item) => item.role === role && item.status === 'AKTIF');
	const client = new PocketBase(url);
	await client.collection('users').authWithPassword(account.email, SANDI_DEMO);
	return client;
};

const admin = await login('ADMIN');
const verifier = await login('VERIFIER');
const awardee = await login('AWARDEE');
let checks = 0;
const expect = (value, message) => { if (!value) throw new Error(message); checks++; };

const snapshot = await admin.send('/api/pfriends/admin/dashboard');
expect(Boolean(snapshot.capturedAt), 'Potret memiliki waktu pengambilan');
expect(snapshot.period.referenceMonth === '2026-07', 'Bulan acuan KPI adalah Juli 2026');
expect(snapshot.monthly.length === 7 && snapshot.monthly[0].monthKey === '2026-01' && snapshot.monthly[6].monthKey === '2026-07', 'Deret program lengkap Januari sampai Juli');
expect(snapshot.kpiActuals.length === 5, 'Lima KPI tersedia');
expect(snapshot.sla.length === 4, 'Empat antrean SLA tersedia termasuk antrean kosong');
expect(snapshot.esg.pillars.map((row) => row.pillar).join('') === 'ESG', 'Tiga pilar ESG tersedia');

const users = await maintenance.collection('users').getFullList();
const stories = await maintenance.collection('stories').getFullList();
const awardees = await maintenance.collection('awardees').getFullList();
const ledger = await maintenance.collection('verified_point_activities').getFullList({ filter: 'status = "AWARDED"' });
expect(snapshot.summary.accounts.total === users.length, 'Total akun sama dengan PocketBase');
expect(snapshot.summary.accounts.active === users.filter((row) => row.status === 'AKTIF').length, 'Akun aktif sama dengan PocketBase');
expect(snapshot.summary.stories.total === stories.length, 'Total Cerita sama dengan PocketBase');
expect(snapshot.summary.stories.published === stories.filter((row) => row.status === 'TERPUBLIKASI').length, 'Cerita terpublikasi sama dengan PocketBase');
expect(snapshot.chapters.reduce((sum, row) => sum + row.SOBI + row.WOMENPRENEUR, 0) === awardees.length, 'Sebaran chapter mencakup seluruh Awardee');

const julyPoints = ledger.filter((row) => String(row.occurredAt || '').slice(0, 7) === '2026-07').reduce((sum, row) => sum + Number(row.points || 0), 0);
expect(snapshot.monthly[6].points === julyPoints, 'Poin Juli hanya berasal dari ledger yang diberikan');
expect(!JSON.stringify(snapshot).match(/email|phone|whatsapp|evidenceFiles|mediaRefs|authorName/i), 'DTO agregat tidak membawa identitas dan bukti privat');

for (const client of [verifier, awardee]) {
	let forbidden = false;
	try { await client.send('/api/pfriends/admin/dashboard'); } catch (error) { forbidden = error.status === 403; }
	expect(forbidden, 'Peran selain Admin ditolak');
}

const repeated = await admin.send('/api/pfriends/admin/dashboard');
expect(repeated.summary.accounts.total === snapshot.summary.accounts.total && repeated.summary.stories.total === snapshot.summary.stories.total, 'Pembacaan berulang stabil dan tidak mengubah data');

console.log(`Dasbor Admin PocketBase: ${checks} pemeriksaan lulus.`);
