import { Badge } from '$lib/domain/entities/Badge.js';
import { PointActivity } from '$lib/domain/entities/PointActivity.js';
import { getPocketBase, pocketBaseMessage } from './client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

function pointActivity(record) {
	return new PointActivity({
		id: record.id, awardeeId: record.awardeeId, activityType: record.activityType,
		points: record.status === 'REVOKED' ? 0 : record.points,
		status: record.status || 'AWARDED', refId: record.broadcast || record.submission || null,
		capReason: record.capReason || null, note: record.revokeReason || null,
		occurredAt: record.occurredAt
	});
}

function badgeEntry(record) {
	return {
		badge: new Badge({ code: record.code, name: record.name, family: record.family,
			rarity: record.rarity, criteria: record.criteria, icon: record.icon,
			community: record.community || '' }),
		unlocked: Boolean(record.unlocked)
	};
}

export async function myGamification() {
	try {
		const response = await client().send('/api/pfriends/gamification/me');
		return { profile: response.profile, wallet: response.wallet || { balance: 0 }, dailyUsage: response.dailyUsage || [], ledger: (response.ledger || []).map(pointActivity), badges: (response.badges || []).map(badgeEntry) };
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Gamifikasi gagal dimuat.')); }
}

export async function leaderboardData(query = {}) {
	try {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) if (value !== '' && value !== undefined) params.set(key, String(value));
		return await client().send(`/api/pfriends/gamification/leaderboard?${params}`);
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Papan peringkat gagal dimuat.')); }
}

export async function verifierDashboard() {
	try { return await client().send('/api/pfriends/verifier/dashboard'); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Dasbor Verifikator gagal dimuat.')); }
}
