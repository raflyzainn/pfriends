import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const seed = buildSeed();
const pb = new PocketBase(url);
let passed = 0;

function ok(value, message) {
	if (!value) throw new Error(message);
	passed++;
}

const expectedStories = seed.stories
	.filter((story) => story.status === 'TERPUBLIKASI' && story.consentActive && story.consentId)
	.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
const response = await pb.send('/api/pfriends/public/stories');
ok(response.items.length >= expectedStories.length, 'Daftar publik melewatkan Cerita seed yang layak terbit.');
ok(response.items.every((story) => story.status === 'TERPUBLIKASI' && story.consentGranted === true), 'Endpoint publik membocorkan cerita yang belum layak terbit.');
ok(response.items.every((story) => Array.isArray(story.mediaRefs) && Array.isArray(story.esgTags)), 'Field daftar Cerita publik wajib selalu berbentuk array.');
ok(response.items.every((story) => !('reviewNotes' in story) && !('reviewer' in story) && !('publishedBy' in story)), 'Endpoint cerita membocorkan data workflow internal.');
ok(expectedStories.every((story) => response.items.some((item) => item.slug === story.slug)), 'Daftar publik tidak memuat seluruh Cerita seed yang terpublikasi.');
ok(response.items.every((story, index) => index === 0 || new Date(response.items[index - 1].publishedAt).getTime() >= new Date(story.publishedAt).getTime()), 'Cerita publik tidak terurut berdasarkan waktu terbit terbaru.');

const first = response.items[0];
const detail = await pb.send(`/api/pfriends/public/stories/${encodeURIComponent(first.slug)}`);
ok(detail.id === first.id && detail.body === first.body, 'Detail cerita tidak konsisten dengan daftar publik.');

const privateStory = seed.stories.find((story) => story.status !== 'TERPUBLIKASI');
let privateHidden = false;
try { await pb.send(`/api/pfriends/public/stories/${encodeURIComponent(privateStory.slug)}`); }
catch (error) { privateHidden = error.status === 404; }
ok(privateHidden, 'Cerita nonpublik dapat dibaca melalui endpoint slug.');

let collectionLocked = false;
try { await pb.collection('stories').getFullList(); }
catch (error) { collectionLocked = error.status === 403 || error.status === 404; }
ok(collectionLocked, 'Collection stories dapat dibaca langsung oleh pengunjung.');

const leaderboard = await pb.send('/api/pfriends/public/leaderboard?limit=8');
ok(leaderboard.entries.length > 0 && leaderboard.entries.length <= 8, 'Jumlah leaderboard publik tidak sesuai batas.');
ok(leaderboard.entries.every((entry, index) => entry.rank === index + 1), 'Nomor peringkat tidak berurutan.');
ok(leaderboard.entries.every((entry) => entry.name && entry.name !== 'Peserta anonim'), 'Leaderboard tidak menampilkan nama asli.');
ok(leaderboard.entries.every((entry, index) => index === 0 || leaderboard.entries[index - 1].points >= entry.points), 'Leaderboard tidak terurut berdasarkan poin.');
ok(leaderboard.entries.every((entry) => !('email' in entry) && !('whatsapp' in entry) && !('user' in entry)), 'Leaderboard membocorkan data pribadi.');

const communities = await pb.send('/api/pfriends/public/communities');
ok(communities.communities.map((item) => item.id).join('|') === 'SOBI|WOMENPRENEUR', 'Ringkasan komunitas tidak memuat dua komunitas utama.');
ok(communities.activeMembers === communities.communities.reduce((sum, item) => sum + item.activeMembers, 0), 'Total anggota tidak sama dengan jumlah per komunitas.');
ok(communities.activeMembers === communities.chapters.reduce((sum, item) => sum + item.activeMembers, 0), 'Total anggota tidak sama dengan jumlah per chapter.');
ok(communities.activeChapters === communities.chapters.length, 'Jumlah chapter aktif tidak konsisten.');
ok(communities.chapters.every((item) => item.activeMembers === item.sobiMembers + item.womenpreneurMembers), 'Komposisi anggota chapter tidak konsisten.');
ok(!/(fullName|email|whatsapp|user)/.test(JSON.stringify(communities)), 'Endpoint komunitas membocorkan data pribadi.');

const expectedMovements = seed.movements
	.filter((movement) => ['BERJALAN', 'SELESAI'].includes(movement.status))
	.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
const movements = await pb.send('/api/pfriends/public/movements');
ok(movements.items.length === expectedMovements.length, 'Jumlah gerakan publik tidak sesuai seed.');
ok(movements.items.every((movement) => ['BERJALAN', 'SELESAI'].includes(movement.status)), 'Endpoint gerakan membocorkan status nonpublik.');
ok(movements.items.map((movement) => movement.slug).join('|') === expectedMovements.map((movement) => movement.slug).join('|'), 'Gerakan publik tidak terurut berdasarkan waktu mulai terbaru.');
ok(movements.items.every((movement) => Number.isInteger(movement.participantCount) && Number.isInteger(movement.reportCount)), 'Agregat peserta atau laporan gerakan tidak valid.');
ok(movements.items.every((movement) => movement.participantCount >= 0 && movement.reportCount >= 0), 'Agregat gerakan tidak boleh bernilai negatif.');
ok(!/(participantIds|reportIds|leaderLegacyId|leaderName|description|impact|esgTags)/.test(JSON.stringify(movements)), 'Endpoint gerakan membocorkan data yang tidak diperlukan halaman publik.');

let movementCollectionLocked = false;
try { await pb.collection('movements').getFullList(); }
catch (error) { movementCollectionLocked = error.status === 403 || error.status === 404; }
ok(movementCollectionLocked, 'Collection movements dapat dibaca langsung oleh pengunjung.');

if (process.env.PB_SUPERUSER_EMAIL && process.env.PB_SUPERUSER_PASSWORD) {
	const admin = new PocketBase(url);
	await admin.collection('_superusers').authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD);
	const profilesBefore = await admin.collection('gamification_profiles').getFullList({ sort: 'id' });
	const badgesBefore = await admin.collection('awardee_badges').getFullList({ sort: 'id' });
	await pb.send('/api/pfriends/public/leaderboard?limit=8');
	const profilesAfter = await admin.collection('gamification_profiles').getFullList({ sort: 'id' });
	const badgesAfter = await admin.collection('awardee_badges').getFullList({ sort: 'id' });
	ok(JSON.stringify(profilesAfter) === JSON.stringify(profilesBefore) && JSON.stringify(badgesAfter) === JSON.stringify(badgesBefore), 'Pembacaan leaderboard publik tidak boleh mengubah profil atau badge.');
	const activeAwardees = await admin.collection('awardees').getFullList({ filter: 'status = "AKTIF"' });
	ok(communities.activeMembers === activeAwardees.length, 'Endpoint komunitas menghitung Awardee yang tidak aktif atau melewatkan Awardee aktif.');
}

console.log(`Public content PocketBase: ${passed} pemeriksaan lulus.`);
