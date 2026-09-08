import { recordId } from './registration.js';
import { ApiError } from './auth.js';
import { dailyStreakOf, streakOf } from './streak.js';
export { dailyProfileStatus, dailyStreakOf, pfWeek, streakOf, wibDay } from './streak.js';

function badgeCodes(entries, streak, tier, community) {
	const counts = {};
	for (const row of entries) { const type = row.actionCode || row.activityType; counts[type] = (counts[type] || 0) + (Number(row.points) > 0 ? 1 : 0); }
	const result = [], has = (type, count) => (counts[type] || 0) >= count;
	if (entries.some((row) => Number(row.points) > 0)) result.push('BDG_LANGKAH_AWAL');
	if (has('BROADCAST_VIEW', 10)) result.push('BDG_PEMBACA_SETIA');
	if (has('CTA_REACT', 10)) result.push('BDG_PENANGGAP');
	if (has('SHARE_PUBLIC', 5)) result.push('BDG_CORONG_KOMUNITAS');
	if (has('SHARE_PRIVATE', 8)) result.push('BDG_PENYAMBUNG_KABAR');
	if (has('SESSION_ATTEND', 5)) result.push('BDG_HADIR_TERUS');
	if (streak >= 6) result.push('BDG_RANTAI_PEKAN');
	if (has('STORY_SUBMIT', 2)) result.push('BDG_JURU_WARTA');
	if (has('KNOWLEDGE_QA', 4)) result.push('BDG_PENJAGA_PENGETAHUAN');
	if (has('SPEAKER_MENTOR', 2)) result.push('BDG_MENTOR_SEJAWAT');
	if (has('LEAD_ACTION', 1)) result.push('BDG_PENGGERAK_LAPANGAN');
	if (community === 'SOBI' && has('LEAD_ACTION', 2)) result.push('BDG_SAHABAT_BUMI');
	if (community === 'WOMENPRENEUR' && has('SESSION_ATTEND', 3) && has('STORY_SUBMIT', 1)) result.push('BDG_TUMBUH_BERSAMA');
	if (tier === 'CHAMPION' && has('LEAD_ACTION', 1) && has('SPEAKER_MENTOR', 1)) result.push('BDG_PILAR_KOMUNITAS');
	return result;
}

async function optionalOne(pb, collection, filter) {
	try { return await pb.collection(collection).getFirstListItem(filter); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}

async function saveProfile(pb, profile, values) {
	if (profile) return pb.collection('gamification_profiles').update(profile.id, values);
	try { return await pb.collection('gamification_profiles').create({ id: recordId(), ...values }); }
	catch (error) {
		if (error?.status !== 400) throw error;
		const concurrent = await optionalOne(pb, 'gamification_profiles', pb.filter('user = {:user}', { user: values.user }));
		if (!concurrent) throw error;
		return pb.collection('gamification_profiles').update(concurrent.id, values);
	}
}

async function activateBadge(pb, existing, awardee, userId, badge, code, now) {
	if (existing?.status === 'ACTIVE') return existing;
	if (existing) return pb.collection('awardee_badges').update(existing.id, { status: 'ACTIVE', revokedAt: '', awardedAt: now, awardCycle: Math.max(1, Number(existing.awardCycle || 1)) + 1 });
	try { return await pb.collection('awardee_badges').create({ id: recordId(), awardee: awardee.id, user: userId, badge: badge.id, badgeCode: code, status: 'ACTIVE', awardedAt: now, awardCycle: 1 }); }
	catch (error) {
		if (error?.status !== 400) throw error;
		const concurrent = await optionalOne(pb, 'awardee_badges', pb.filter('awardee = {:awardee} && badge = {:badge}', { awardee: awardee.id, badge: badge.id }));
		if (!concurrent) throw error;
		return concurrent.status === 'REVOKED'
			? pb.collection('awardee_badges').update(concurrent.id, { status: 'ACTIVE', revokedAt: '', awardedAt: now, awardCycle: Math.max(1, Number(concurrent.awardCycle || 1)) + 1 })
			: concurrent;
	}
}

export async function recalculateGamification(pb, userId) {
	const awardee = await pb.collection('awardees').getFirstListItem(pb.filter('user = {:user}', { user: userId }));
	const [entries, tiers, badges, existingAwards, profile] = await Promise.all([
		pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:id} && status = "AWARDED"', { id: awardee.legacyId }), sort: 'occurredAt' }),
		pb.collection('gamification_tiers').getFullList({ sort: 'rank' }),
		pb.collection('badges').getFullList(),
		pb.collection('awardee_badges').getFullList({ filter: pb.filter('awardee = {:id}', { id: awardee.id }) }),
		optionalOne(pb, 'gamification_profiles', pb.filter('awardee = {:id}', { id: awardee.id }))
	]);
	const total = entries.reduce((sum, row) => sum + Number(row.points || 0), 0);
	const weeklyStreak = streakOf(entries), dailyStreak = dailyStreakOf(entries);
	const tier = tiers.filter((row) => total >= Number(row.threshold)).at(-1)?.level || 'NEWCOMER';
	const now = new Date().toISOString();
	const lastPointAwardedAt = entries.filter((row) => Number(row.points) > 0 && row.awardedAt).map((row) => row.awardedAt).sort().at(-1) || '';
	const values = { awardee: awardee.id, user: userId, awardeeId: awardee.legacyId, fullName: awardee.fullName, community: awardee.community, chapterId: awardee.chapterId, totalPoints: total, tier, currentStreakWeeks: weeklyStreak.current, longestStreakWeeks: weeklyStreak.longest, currentStreakDays: dailyStreak.current, longestStreakDays: dailyStreak.longest, lastPointAwardedAt, lastActiveAt: entries.at(-1)?.occurredAt || '', recalculatedAt: now };
	const savedProfile = await saveProfile(pb, profile, values);
	const activeCodes = badgeCodes(entries, weeklyStreak.current, tier, awardee.community);
	const byCode = new Map(existingAwards.map((row) => [row.badgeCode, row]));
	for (const code of activeCodes) {
		const existing = byCode.get(code), badge = badges.find((row) => row.code === code);
		if (!badge) continue;
		await activateBadge(pb, existing, awardee, userId, badge, code, now);
	}
	for (const row of existingAwards) if (!activeCodes.includes(row.badgeCode) && row.status === 'ACTIVE') await pb.collection('awardee_badges').update(row.id, { status: 'REVOKED', revokedAt: now });
	return { awardee, profile: { ...savedProfile, currentStreakDays: dailyStreak.current, longestStreakDays: dailyStreak.longest, lastPointAwardedAt, activeToday: dailyStreak.activeToday }, entries, tiers, activeCodes };
}

export async function pointAction(pb, code) {
	const action = await pb.collection('point_actions').getFirstListItem(pb.filter('code = {:code} && status = "ACTIVE"', { code })).catch((error) => {
		if (error?.status === 404) return null;
		throw error;
	});
	if (!action) throw new ApiError(503, `Katalog aksi ${code} belum tersedia.`);
	return action;
}
