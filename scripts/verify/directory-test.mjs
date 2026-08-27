import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const seed = buildSeed();
const account = seed.accounts.find((item) => item.role === 'AWARDEE' && item.status === 'AKTIF');
let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed++; }

const pb = new PocketBase(url);
await pb.collection('users').authWithPassword(account.email, SANDI_DEMO);
const first = await pb.send('/api/pfriends/directory?page=1&perPage=12');
ok(first.items.length === 12, 'Pagination awal tidak mengembalikan 12 profil.');
ok(first.totalItems > 12 && first.totalPages > 1, 'Direktori tidak memuat profil aktif dari backend.');
ok(first.items.every((item) => !('email' in item) && !('user' in item)), 'Response direktori membocorkan email atau relasi auth.');
ok(first.items.every((item) => !item.whatsapp || item.openToMentoring), 'WhatsApp muncul pada profil yang tidak membuka mentoring.');
ok(first.items.every((item) => item.id && item.fullName && item.community && item.chapterId), 'Identitas aman direktori tidak lengkap.');
ok(first.items.every((item) => Number.isInteger(item.streakDays) && typeof item.activeToday === 'boolean'), 'Jejaring tidak memakai proyeksi streak harian.');
ok(first.stats.active === first.stats.sobi + first.stats.womenpreneur, 'Statistik komunitas tidak konsisten.');
ok(first.facets.cities.length > 0 && first.facets.skills.length > 0, 'Facet kota/keahlian tidak berasal dari profil backend.');

const community = await pb.send(`/api/pfriends/directory?community=${first.items[0].community}&page=1&perPage=48`);
ok(community.items.every((item) => item.community === first.items[0].community), 'Filter komunitas tidak diterapkan server.');
const searched = await pb.send(`/api/pfriends/directory?search=${encodeURIComponent(first.items[0].fullName)}&page=1&perPage=12`);
ok(searched.items.some((item) => item.id === first.items[0].id), 'Pencarian nama tidak menemukan profil yang sesuai.');
const seeded = seed.awardees.find((item) => item.id === 'AWD-002');
const seededResult = await pb.send(`/api/pfriends/directory?search=${encodeURIComponent(seeded.fullName)}&page=1&perPage=12`);
ok(seededResult.items.some((item) => item.id === seeded.id && item.points === seeded.points), 'Poin akun demo tidak direkonsiliasi dari ledger seed PocketBase.');

const own = await pb.collection('awardees').getFirstListItem(pb.filter('user = {:user}', { user: pb.authStore.record.id }));
const privateProfile = await pb.send('/api/pfriends/profile/me');
if (!privateProfile.consents.effective.PUBLIKASI_NAMA) await pb.send('/api/pfriends/profile/consents/PUBLIKASI_NAMA/grant', { method: 'POST' });
const visibleRecords = await pb.collection('awardees').getFullList();
ok(visibleRecords.length === 1 && visibleRecords[0].id === own.id, 'Rule awardees tidak membatasi record lengkap ke pemilik.');
const original = { occupation: own.occupation || '', bio: own.bio || '', skills: own.skills || [], openToMentoring: Boolean(own.openToMentoring), businessEmployees: own.businessEmployees || 0, businessGrowthPercent: own.businessGrowthPercent || 0 };
try {
	const updated = await pb.send('/api/pfriends/profile/me', { method: 'PATCH', body: { ...original, occupation: 'Penguji Jejaring', skills: ['Pengujian API'] } });
	ok(updated.occupation === 'Penguji Jejaring' && updated.skills.includes('Pengujian API'), 'Update profil sendiri tidak tercermin pada response aman.');
	const refreshed = await pb.send(`/api/pfriends/directory?search=${encodeURIComponent('Penguji Jejaring')}&page=1&perPage=12`);
	ok(refreshed.items.some((item) => item.id === own.legacyId), 'Perubahan profil tidak langsung terlihat di Jejaring.');
	let directWriteBlocked = false;
	try { await pb.collection('awardees').update(own.id, { fullName: 'Tidak boleh' }); } catch (error) { directWriteBlocked = error.status === 403 || error.status === 404; }
	ok(directWriteBlocked, 'Awardee dapat melewati endpoint allowlist melalui update collection langsung.');
} finally {
	await pb.send('/api/pfriends/profile/me', { method: 'PATCH', body: original });
}

console.log(`PocketBase directory integration: ${passed} asersi lulus.`);
