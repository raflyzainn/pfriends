import PocketBase from 'pocketbase';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const email = process.env.PB_SUPERUSER_EMAIL;
const password = process.env.PB_SUPERUSER_PASSWORD;
if (!email || !password) throw new Error('Kredensial superuser diperlukan untuk verifikasi agregat.');

let passed = 0;
function ok(value, message) {
	if (!value) throw new Error(message);
	passed++;
}

const guest = new PocketBase(url);
const snapshot = await guest.send('/api/pfriends/public/impact');
ok(snapshot.capturedAt && !Number.isNaN(new Date(snapshot.capturedAt).getTime()), 'Waktu potret tidak valid.');
ok(!/(fullName|email|whatsapp|awardeeName|participantIds)/.test(JSON.stringify(snapshot)), 'Potret publik membocorkan data pribadi.');

let movementsLocked = false;
try { await guest.collection('movements').getFullList(); }
catch (error) { movementsLocked = error.status === 403 || error.status === 404; }
ok(movementsLocked, 'Collection movements dapat dibaca langsung oleh pengunjung.');

const admin = new PocketBase(url);
await admin.collection('_superusers').authWithPassword(email, password);
const [awardees, stories, events, participants, movements, activities] = await Promise.all([
	admin.collection('awardees').getFullList(),
	admin.collection('stories').getFullList(),
	admin.collection('events').getFullList(),
	admin.collection('event_participants').getFullList(),
	admin.collection('movements').getFullList(),
	admin.collection('verified_point_activities').getFullList()
]);

const activeAwardees = awardees.filter((row) => row.status === 'AKTIF');
const activeIds = new Set(activeAwardees.map((row) => row.legacyId));
ok(snapshot.registeredAwardees === activeAwardees.filter((row) => row.consentActive).length, 'Jumlah Awardee aktif dengan consent tidak sesuai sumber.');
ok(snapshot.registeredAwardees < activeAwardees.length, 'Seed tidak membuktikan pengecualian Awardee tanpa consent.');
ok(snapshot.activeChapters === new Set(activeAwardees.map((row) => row.chapterId).filter(Boolean)).size, 'Jumlah chapter aktif tidak sesuai sumber.');
ok(snapshot.publishedStories === stories.filter((row) => row.status === 'TERPUBLIKASI' && row.consentActive && row.consentLegacyId).length, 'Jumlah cerita publik tidak sesuai sumber.');
ok(snapshot.runningMovements === movements.filter((row) => row.status === 'BERJALAN').length, 'Jumlah gerakan berjalan tidak sesuai sumber.');
ok(movements.length === 7, 'Seeder tidak menyimpan seluruh gerakan demo secara idempoten.');
ok(snapshot.recordedActions === activities.filter((row) => row.status === 'AWARDED').length, 'Jumlah aktivitas tercatat tidak sesuai ledger.');

const now = new Date(snapshot.capturedAt);
const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
const start = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), 1) - 7 * 60 * 60 * 1000);
const end = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth() + 1, 1) - 7 * 60 * 60 * 1000);
const amplifierIds = new Set(activities
	.filter((row) => row.status === 'AWARDED' && ['SHARE_PRIVATE', 'SHARE_PUBLIC'].includes(row.activityType))
	.filter((row) => new Date(row.occurredAt) >= start && new Date(row.occurredAt) < end)
	.map((row) => row.awardeeId)
	.filter((id) => activeIds.has(id)));
ok(snapshot.amplifiersThisMonth === amplifierIds.size, 'Jumlah pengamplifikasi unik bulan berjalan tidak sesuai ledger.');

const completedEvents = events.filter((event) =>
	event.status === 'SELESAI' && event.outcomeNote &&
	participants.filter((row) => row.event === event.id && row.attendanceStatus === 'APPROVED').length >= 10
).length;
ok(snapshot.completedEvents === completedEvents, 'Jumlah kegiatan terlaksana tidak sesuai aturan kuorum.');

console.log(`Public impact PocketBase: ${passed} pemeriksaan lulus.`);
