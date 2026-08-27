const CANONICAL_TIERS = [
	{ level: 'NEWCOMER', threshold: 0 },
	{ level: 'ACTIVE_MEMBER', threshold: 25 },
	{ level: 'CONTRIBUTOR', threshold: 50 },
	{ level: 'FEATURED_CANDIDATE', threshold: 100 },
	{ level: 'CHAMPION', threshold: 150 }
];

function tiers(app) {
	if (!app) return CANONICAL_TIERS.map((item, rank) => ({ ...item, rank }));
	return app.findRecordsByFilter('gamification_tiers', 'id != ""', 'rank', 0, 0).map((row) => ({ id:row.id, level:row.getString('level'), rank:row.getInt('rank'), threshold:row.getInt('threshold'), canonicalThreshold:row.getInt('canonicalThreshold'), label:row.getString('label'), description:row.getString('description'), benefit:row.getString('benefit'), color:row.getString('color'), updatedAt:row.getString('updatedAt') }));
}

function tierFor(app, points) {
	const list = typeof app === 'number' ? tiers(null) : tiers(app);
	const value = typeof app === 'number' ? app : points;
	let tier = list[0].level;
	for (const item of list) if (value >= item.threshold) tier = item.level;
	return tier;
}

// Pekan PF dimulai Selasa 00:00 WIB. Nilai integer ini aman dibandingkan lintas tahun.
function pfWeek(value) {
	const date = new Date(value);
	const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	const day = Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
	return Math.floor((day - 5) / 7); // 1970-01-06 (Selasa) adalah anchor pekan.
}

function streakOf(entries, now) {
	const weeks = [...new Set(entries.filter((row) => row.getInt('points') > 0).map((row) => pfWeek(row.getString('occurredAt'))))].sort((a, b) => a - b);
	let longest = 0;
	let run = 0;
	let previous = null;
	for (const week of weeks) {
		run = previous !== null && week === previous + 1 ? run + 1 : 1;
		if (run > longest) longest = run;
		previous = week;
	}
	const currentWeek = pfWeek(now || new Date());
	if (previous === null || previous < currentWeek - 1) return { current: 0, longest };
	let current = 1;
	for (let index = weeks.length - 2; index >= 0 && weeks[index] === weeks[index + 1] - 1; index--) current++;
	return { current, longest };
}

function activeLedger(app, awardeeId) {
	return app.findRecordsByFilter(
		'verified_point_activities',
		'awardeeId = {:awardee} && status = "AWARDED"',
		'occurredAt', 0, 0, { awardee: awardeeId }
	);
}

function wibDay(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	return Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
}

function dailyStreakOf(entries, now) {
	const today = wibDay(now || new Date());
	const days = [...new Set(entries
		.filter((row) => row.getInt('points') > 0)
		.map((row) => wibDay(row.getString('awardedAt')))
		.filter((day) => day !== null && day <= today))].sort((a, b) => a - b);
	let longest = 0, run = 0, previous = null;
	for (const day of days) {
		run = previous !== null && day === previous + 1 ? run + 1 : 1;
		if (run > longest) longest = run;
		previous = day;
	}
	if (previous === null || previous < today - 1) return { current: 0, longest, activeToday: false };
	let current = 1;
	for (let index = days.length - 2; index >= 0 && days[index] === days[index + 1] - 1; index--) current++;
	return { current, longest, activeToday: previous === today };
}

function dailyUsage(app, awardeeId, value) {
	const periodKey = new Date(value || new Date()).toISOString().slice(0, 10);
	const entries = app.findRecordsByFilter(
		'verified_point_activities',
		'awardeeId = {:awardee} && occurredAt >= {:start} && occurredAt <= {:end}',
		'occurredAt', 0, 0,
		{ awardee: awardeeId, start: `${periodKey} 00:00:00.000Z`, end: `${periodKey} 23:59:59.999Z` }
	);
	const counts = {};
	for (const entry of entries) {
		const type = entry.getString('actionCode') || entry.getString('activityType');
		counts[type] = (counts[type] || 0) + 1;
	}
	const actions = app.findRecordsByFilter('point_actions', 'status = "ACTIVE"', 'actionClass,label', 0, 0);
	return actions.map((action) => {
		const type = action.getString('code'), cap = action.getInt('dailyCap');
		const used = Math.min(cap, counts[type] || 0);
		return { type, used, cap, remaining: Math.max(0, cap - used), exhausted: used >= cap, periodKey };
	});
}

function badgeCodes(entries, streak, tier, community) {
	const counts = {};
	for (const row of entries) {
		const type = row.getString('activityType');
		counts[type] = (counts[type] || 0) + (row.getInt('points') > 0 ? 1 : 0);
	}
	const result = [];
	const has = (type, count) => (counts[type] || 0) >= count;
	if (entries.some((row) => row.getInt('points') > 0)) result.push('BDG_LANGKAH_AWAL');
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

function ensureProfile(app, awardee, pointsOverride) {
	const awardeeId = awardee.getString('legacyId');
	const userId = awardee.getString('user');
	let profile = null;
	try { profile = app.findFirstRecordByData('gamification_profiles', 'awardee', awardee.id); } catch (_) {}
	if (!profile) profile = new Record(app.findCollectionByNameOrId('gamification_profiles'));
	const entries = activeLedger(app, awardeeId);
	const total = pointsOverride === undefined ? entries.reduce((sum, row) => sum + row.getInt('points'), 0) : Number(pointsOverride);
	const streak = streakOf(entries, new Date());
	const dailyStreak = dailyStreakOf(entries, new Date());
	const tier = tierFor(app, total);
	profile.set('awardee', awardee.id);
	profile.set('user', userId);
	profile.set('awardeeId', awardeeId);
	profile.set('fullName', awardee.getString('fullName'));
	profile.set('community', awardee.getString('community'));
	profile.set('chapterId', awardee.getString('chapterId'));
	profile.set('totalPoints', total);
	profile.set('tier', tier);
	profile.set('currentStreakWeeks', streak.current);
	profile.set('longestStreakWeeks', streak.longest);
	profile.set('currentStreakDays', dailyStreak.current);
	profile.set('longestStreakDays', dailyStreak.longest);
	const awarded = entries.filter((row) => row.getInt('points') > 0 && row.getString('awardedAt')).map((row) => row.getString('awardedAt')).sort();
	profile.set('lastPointAwardedAt', awarded.length ? awarded[awarded.length - 1] : '');
	profile.set('lastActiveAt', entries.length ? entries[entries.length - 1].getString('occurredAt') : '');
	profile.set('recalculatedAt', new Date().toISOString());
	app.save(profile);

	const activeCodes = badgeCodes(entries, streak.current, tier, awardee.getString('community'));
	const existing = app.findRecordsByFilter('awardee_badges', 'awardee = {:awardee}', '', 0, 0, { awardee: awardee.id });
	const byCode = Object.fromEntries(existing.map((row) => [row.getString('badgeCode'), row]));
	for (const code of activeCodes) {
		let row = byCode[code];
		const reactivated = row && row.getString('status') === 'REVOKED';
		if (!row) row = new Record(app.findCollectionByNameOrId('awardee_badges'));
		const badge = app.findFirstRecordByData('badges', 'code', code);
		row.set('awardee', awardee.id); row.set('user', userId); row.set('badge', badge.id); row.set('badgeCode', code);
		row.set('status', 'ACTIVE'); row.set('revokedAt', '');
		if (!row.getString('awardedAt') || reactivated) row.set('awardedAt', new Date().toISOString());
		if (!row.getInt('awardCycle')) row.set('awardCycle', 1); else if (reactivated) row.set('awardCycle', row.getInt('awardCycle') + 1);
		app.save(row);
	}
	for (const row of existing) if (activeCodes.indexOf(row.getString('badgeCode')) === -1 && row.getString('status') === 'ACTIVE') {
		row.set('status', 'REVOKED'); row.set('revokedAt', new Date().toISOString()); app.save(row);
	}
	return { profile, entries, badgeCodes: activeCodes };
}

function ensureAll(app) {
	const rows = app.findRecordsByFilter('awardees', 'status = "AKTIF"', 'fullName', 0, 0);
	return rows.map((awardee) => ensureProfile(app, awardee));
}

module.exports = { CANONICAL_TIERS, tiers, tierFor, pfWeek, streakOf, wibDay, dailyStreakOf, activeLedger, dailyUsage, ensureProfile, ensureAll };
