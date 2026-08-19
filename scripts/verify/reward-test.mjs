import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { TierResolver } from '../../src/lib/domain/services/TierResolver.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const bundle = buildSeed(); let passed = 0;
function ok(value, message) { if (!value) throw new Error(message); passed++; }

const adminAccount = bundle.accounts.find((row) => row.role === 'ADMIN' && row.status === 'AKTIF');
ok(adminAccount, 'Seed tidak memiliki Admin aktif.');

let actor = null; let snapshot = null; let candidate = null; let expected = null;
for (const account of bundle.accounts.filter((row) => row.role === 'AWARDEE' && row.status === 'AKTIF')) {
	const pb = new PocketBase(url); await pb.collection('users').authWithPassword(account.email, SANDI_DEMO);
	const data = await pb.send('/api/pfriends/achievements');
	const awardee = bundle.awardees.find((row) => row.id === account.awardeeId);
	ok(data.wallet.balance === awardee.coins, `Saldo ${account.awardeeId} tidak sama dengan seed: ${data.wallet.balance}/${awardee.coins}.`);
	const tierRank = ['NEWCOMER','ACTIVE_MEMBER','CONTRIBUTOR','FEATURED_CANDIDATE','CHAMPION'];
	const tierLevel = TierResolver.resolve(awardee.points).level;
	const gamification = await pb.send('/api/pfriends/gamification/me');
	ok(gamification.wallet.balance === data.wallet.balance, `Saldo gamifikasi ${account.awardeeId} berbeda dari wallet.`);
	ok(gamification.profile.tier === tierLevel, `Tier server ${account.awardeeId} salah: ${gamification.profile.tier}/${tierLevel}.`);
	const reward = data.rewards.find((row) => row.requiresApproval && row.status === 'TERSEDIA' && row.priceCoins <= data.wallet.balance && (row.remaining === null || row.remaining > 0) && tierRank.indexOf(tierLevel) >= tierRank.indexOf(row.minTierLevel));
	if (reward) { actor = pb; snapshot = data; candidate = reward; expected = awardee; break; }
}
ok(actor && candidate, 'Tidak ada Awardee demo yang memenuhi syarat reward persetujuan.');
ok(snapshot.rewards.length > 0, 'Katalog reward kosong.');
ok(Array.isArray(snapshot.redemptions), 'Riwayat penukaran bukan array.');

const key = `VERIFY-${Date.now()}`;
const first = await actor.send('/api/pfriends/redemptions', { method: 'POST', body: { rewardId: candidate.id, requestKey: key } });
const second = await actor.send('/api/pfriends/redemptions', { method: 'POST', body: { rewardId: candidate.id, requestKey: key } });
ok(first.redemption.id === second.redemption.id, 'Request idempoten membuat dua pesanan.');
ok(first.wallet.balance === snapshot.wallet.balance - candidate.priceCoins, 'Debit koin tidak sesuai harga reward.');
const afterRedeem = await actor.send('/api/pfriends/achievements');
ok(afterRedeem.redemptions.filter((row) => row.id === first.redemption.id).length === 1, 'Pesanan idempoten tercatat lebih dari sekali.');

const verifier = new PocketBase(url);
const verifierAccount = bundle.accounts.find((row) => row.role === 'VERIFIER' && row.status === 'AKTIF');
await verifier.collection('users').authWithPassword(verifierAccount.email, SANDI_DEMO);
const verifierOrders = await verifier.send('/api/pfriends/admin/redemptions');
ok(verifierOrders.redemptions.some((row) => row.id === first.redemption.id), 'Pesanan baru tidak terlihat oleh Verifikator.');

const admin = new PocketBase(url); await admin.collection('users').authWithPassword(adminAccount.email, SANDI_DEMO);
const allOrders = await admin.send('/api/pfriends/admin/redemptions');
ok(allOrders.redemptions.some((row) => row.id === first.redemption.id), 'Pesanan baru tidak muncul di konsol Admin.');
let adminForbidden = false;
try { await admin.send(`/api/pfriends/admin/redemptions/${first.redemption.id}/transition`, { method: 'POST', body: { status: 'DITOLAK', note: 'Admin tidak boleh memutuskan.' } }); } catch (error) { adminForbidden = error.status === 403; }
ok(adminForbidden, 'Admin dapat mengubah status pesanan yang hanya boleh diproses Verifikator.');
await verifier.send(`/api/pfriends/admin/redemptions/${first.redemption.id}/transition`, { method: 'POST', body: { status: 'DITOLAK', note: 'Ditolak untuk menguji refund idempoten.' } });
const afterRefund = await actor.send('/api/pfriends/achievements');
ok(afterRefund.wallet.balance === snapshot.wallet.balance, 'Penolakan Admin tidak mengembalikan saldo tepat satu kali.');
ok(afterRefund.redemptions.find((row) => row.id === first.redemption.id)?.status === 'DITOLAK', 'Status penolakan tidak terlihat oleh Awardee.');
let repeated = false;
try { await verifier.send(`/api/pfriends/admin/redemptions/${first.redemption.id}/transition`, { method: 'POST', body: { status: 'DITOLAK', note: 'Penolakan kedua harus gagal.' } }); } catch (error) { repeated = error.status === 400; }
ok(repeated, 'Keputusan Verifikator dapat diulang dan berisiko refund ganda.');

const fulfillment = await actor.send('/api/pfriends/redemptions', { method: 'POST', body: { rewardId: candidate.id, requestKey: `VERIFY-FULFILL-${Date.now()}` } });
let progressed = await verifier.send(`/api/pfriends/admin/redemptions/${fulfillment.redemption.id}/transition`, { method: 'POST', body: { status: 'DISETUJUI', note: 'Disetujui pengujian.' } });
ok(progressed.redemption.status === 'DISETUJUI', 'Verifikator gagal menyetujui pesanan.');
progressed = await verifier.send(`/api/pfriends/admin/redemptions/${fulfillment.redemption.id}/transition`, { method: 'POST', body: { status: 'DIKIRIM', note: 'Dikirim pengujian.' } });
ok(progressed.redemption.status === 'DIKIRIM' && progressed.redemption.shippedAt, 'Verifikator gagal menandai pesanan dikirim.');
progressed = await verifier.send(`/api/pfriends/admin/redemptions/${fulfillment.redemption.id}/transition`, { method: 'POST', body: { status: 'SELESAI', note: 'Selesai pengujian.' } });
ok(progressed.redemption.status === 'SELESAI' && progressed.redemption.fulfilledAt, 'Verifikator gagal menyelesaikan pesanan.');
const afterFulfillment = await actor.send('/api/pfriends/achievements');
ok(afterFulfillment.wallet.balance === snapshot.wallet.balance - candidate.priceCoins, 'Pesanan selesai tidak mempertahankan debit koin.');

const draftReward = { name: `Hadiah verifikasi ${Date.now()}`, category: 'MERCHANDISE', description: 'Dibuat oleh pengujian CRUD.', priceCoins: 33, minTierLevel: 'NEWCOMER', status: 'TERSEDIA', monthlyQuota: 2, requiresApproval: true, community: '', fulfillmentNote: 'Diproses Verifikator.', image: '' };
const createdReward = await verifier.send('/api/pfriends/staff/rewards', { method: 'POST', body: draftReward });
ok(createdReward.reward.name === draftReward.name, 'Verifikator gagal membuat hadiah.');
const updatedReward = await admin.send(`/api/pfriends/staff/rewards/${createdReward.reward.id}`, { method: 'PATCH', body: { ...draftReward, name: `${draftReward.name} diperbarui`, priceCoins: 44 } });
ok(updatedReward.reward.priceCoins === 44, 'Admin gagal mengubah hadiah.');
const staffCatalog = await admin.send('/api/pfriends/staff/rewards');
ok(staffCatalog.rewards.some((row) => row.id === createdReward.reward.id), 'Hadiah CRUD tidak terlihat di katalog staf.');
const deletedReward = await verifier.send(`/api/pfriends/staff/rewards/${createdReward.reward.id}`, { method: 'DELETE' });
ok(deletedReward.deleted === true, 'Verifikator gagal menghapus hadiah yang belum dipakai.');

console.log(`Reward PocketBase: ${passed} pemeriksaan lulus untuk ${expected.id}.`);
