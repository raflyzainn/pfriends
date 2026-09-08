import PocketBase from 'pocketbase';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const password = process.env.PFRIENDS_TEST_PASSWORD || 'pfriends2026';
let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed++; console.log(`  ✓ ${message}`); }
async function login(email) { const pb = new PocketBase(url); await pb.collection('users').authWithPassword(email, password); return pb; }

const admin = await login('admin@pertaminafoundation.org');
const verifier = await login('verifikator@pertaminafoundation.org');
const initial = await admin.send('/api/pfriends/admin/gamification/rules');
ok(initial.tiers.length === 5 && initial.thresholds.NEWCOMER === 0, 'lima tier dinamis tersedia dari PocketBase');
ok(initial.sample.rows.length > 0 && initial.sample.total > 0, 'simulator memakai katalog aksi PocketBase');

let forbidden = false;
try { await verifier.send('/api/pfriends/admin/gamification/rules'); } catch (error) { forbidden = error.status === 403; }
ok(forbidden, 'Verifikator tidak dapat mengubah aturan tier Admin');

const original = { ...initial.thresholds };
const proposed = { ...original, ACTIVE_MEMBER: original.ACTIVE_MEMBER + 1, CONTRIBUTOR: original.CONTRIBUTOR + 2, FEATURED_CANDIDATE: original.FEATURED_CANDIDATE + 3, CHAMPION: original.CHAMPION + 4 };
const profilesBefore = await admin.collection('gamification_profiles').getFullList();
const pointsBefore = Object.fromEntries(profilesBefore.map((row) => [row.id, row.totalPoints]));
const preview = await admin.send('/api/pfriends/admin/gamification/tiers/preview', { method: 'POST', body: { thresholds: proposed } });
ok(preview.thresholds.CHAMPION === proposed.CHAMPION && preview.impact.totalProfiles === profilesBefore.length, 'pratinjau menghitung dampak seluruh profil');
const unchanged = await admin.send('/api/pfriends/admin/gamification/rules');
ok(unchanged.thresholds.CHAMPION === original.CHAMPION, 'pratinjau tidak mengubah konfigurasi');

let updated;
try {
	updated = await admin.send('/api/pfriends/admin/gamification/tiers', { method: 'PUT', body: { thresholds: proposed, expectedVersion: initial.version } });
	ok(updated.thresholds.CONTRIBUTOR === proposed.CONTRIBUTOR, 'Admin menerapkan ambang baru secara atomik');
	const profilesAfter = await admin.collection('gamification_profiles').getFullList();
	ok(profilesAfter.every((row) => pointsBefore[row.id] === row.totalPoints), 'penerapan tier tidak menghitung ulang saldo poin');
	ok(profilesAfter.every((row) => row.tier === [...updated.tiers].reverse().find((tier) => row.totalPoints >= tier.threshold).level), 'tier seluruh profil mengikuti ambang baru');
	ok(updated.audits?.length > 0, 'perubahan ambang tercatat pada audit');
	let stale = false;
	try { await admin.send('/api/pfriends/admin/gamification/tiers', { method: 'PUT', body: { thresholds: proposed, expectedVersion: initial.version } }); } catch (error) { stale = error.status === 400; }
	ok(stale, 'versi konfigurasi lama ditolak');
} finally {
	if (updated) await admin.send('/api/pfriends/admin/gamification/tiers', { method: 'PUT', body: { thresholds: original, expectedVersion: updated.version } });
}

const restored = await admin.send('/api/pfriends/admin/gamification/rules');
ok(Object.entries(original).every(([level, threshold]) => restored.thresholds[level] === threshold), 'ambang awal dipulihkan setelah pengujian');
console.log(`\nLULUS: ${passed}`);
