import { ApiError } from './auth.js';
import { recordId } from './registration.js';

const BADGE_BONUS = { UMUM: 25, LANGKA: 75, EPIK: 200, LEGENDARIS: 500 };
export const TIER_RANKS = ['NEWCOMER', 'ACTIVE_MEMBER', 'CONTRIBUTOR', 'FEATURED_CANDIDATE', 'CHAMPION'];

export async function optionalOne(pb, collection, query) {
	try { return await pb.collection(collection).getFirstListItem(query); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}
export async function awardeeFor(pb, userId) {
	const awardee = await optionalOne(pb, 'awardees', pb.filter('user = {:user}', { user: userId }));
	if (!awardee) throw new ApiError(403, 'Profil Awardee aktif belum tersedia.');
	return awardee;
}
export function walletDto(account) { return { balance: Number(account.balance || 0), lifetimeEarned: Number(account.lifetimeEarned || 0), lifetimeSpent: Number(account.lifetimeSpent || 0) }; }
export async function recalculateWallet(pb, awardee) {
	const rows = await pb.collection('coin_transactions').getFullList({ filter: pb.filter('awardee = {:awardee}', { awardee: awardee.id }), sort: 'occurredAt' });
	const balance = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0), earned = rows.filter((row) => Number(row.amount) > 0).reduce((sum, row) => sum + Number(row.amount), 0), spent = -rows.filter((row) => Number(row.amount) < 0).reduce((sum, row) => sum + Number(row.amount), 0);
	const existing = await optionalOne(pb, 'coin_accounts', pb.filter('awardee = {:awardee}', { awardee: awardee.id }));
	const data = { awardee: awardee.id, user: awardee.user, balance, lifetimeEarned: earned, lifetimeSpent: spent, recalculatedAt: new Date().toISOString() };
	return existing ? pb.collection('coin_accounts').update(existing.id, data) : pb.collection('coin_accounts').create({ id: recordId(), ...data });
}
async function addTransaction(pb, existingKeys, awardee, sourceKey, type, amount, referenceId, note, occurredAt) {
	if (!amount || existingKeys.has(sourceKey)) return;
	try {
		await pb.collection('coin_transactions').create({ id: recordId(), awardee: awardee.id, user: awardee.user, sourceKey, type, amount, referenceId: referenceId || '', note: note || '', occurredAt: occurredAt || new Date().toISOString() });
		existingKeys.add(sourceKey);
	} catch (error) { if (error?.status !== 400) throw error; }
}
export async function syncWallet(pb, awardee) {
	const [points, badgeAwards, badgeCatalog, transactions] = await Promise.all([
		pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:id}', { id: awardee.legacyId }), sort: 'occurredAt' }),
		pb.collection('awardee_badges').getFullList({ filter: pb.filter('awardee = {:awardee}', { awardee: awardee.id }), sort: 'awardedAt' }),
		pb.collection('badges').getFullList(),
		pb.collection('coin_transactions').getFullList({ filter: pb.filter('awardee = {:awardee}', { awardee: awardee.id }) })
	]);
	const keys = new Set(transactions.map((row) => row.sourceKey));
	for (const row of points) {
		await addTransaction(pb, keys, awardee, `POINT:${row.id}`, 'POINT_CREDIT', Number(row.points || 0), row.id, 'Koin dari poin terverifikasi.', row.awardedAt || row.occurredAt);
		if (row.status === 'REVOKED') await addTransaction(pb, keys, awardee, `POINT_REVOKE:${row.id}`, 'POINT_REVERSAL', -Number(row.points || 0), row.id, row.revokeReason, row.revokedAt);
	}
	for (const row of badgeAwards) {
		const badge = badgeCatalog.find((item) => item.id === row.badge), bonus = BADGE_BONUS[badge?.rarity] || 0, cycle = Math.max(1, Number(row.awardCycle || 1)), suffix = cycle === 1 ? '' : `:CYCLE:${cycle}`;
		await addTransaction(pb, keys, awardee, `BADGE:${row.id}${suffix}`, 'BADGE_BONUS', bonus, row.id, `Bonus lencana ${badge?.name || row.badgeCode}.`, row.awardedAt);
		if (row.status === 'REVOKED') await addTransaction(pb, keys, awardee, `BADGE_REVOKE:${row.id}${suffix}`, 'BADGE_REVERSAL', -bonus, row.id, `Pencabutan bonus lencana ${badge?.name || row.badgeCode}.`, row.revokedAt);
	}
	return recalculateWallet(pb, awardee);
}
export function rewardDto(reward, redemptions, month) {
	const used = redemptions.filter((row) => row.reward === reward.id && row.quotaMonth === month && row.status !== 'DITOLAK').length, quota = Number(reward.monthlyQuota || 0) || null;
	return { id: reward.id, legacyId: reward.legacyId, name: reward.name, category: reward.category, description: reward.description || '', priceCoins: Number(reward.priceCoins || 0), minTierLevel: reward.minTierLevel, status: reward.status, monthlyQuota: quota, remaining: quota === null ? null : Math.max(0, quota - used), requiresApproval: Boolean(reward.requiresApproval), community: reward.community || '', fulfillmentNote: reward.fulfillmentNote || '', image: reward.image || '' };
}
export function redemptionDto(row) {
	return { id: row.id, awardeeId: row.awardee, awardeeName: row.awardeeName, awardeeWhatsapp: row.awardeeWhatsapp, rewardId: row.reward, rewardName: row.rewardName, coins: Number(row.coins || 0), status: row.status, note: row.note || '', adminNote: row.adminNote || '', requestedAt: row.requestedAt, decidedAt: row.decidedAt || '', shippedAt: row.shippedAt || '', fulfilledAt: row.fulfilledAt || '', rejectedAt: row.rejectedAt || '' };
}
