const TIERS = [
	{ level: 'NEWCOMER', threshold: 0 },
	{ level: 'ACTIVE_MEMBER', threshold: 25 },
	{ level: 'CONTRIBUTOR', threshold: 50 },
	{ level: 'FEATURED_CANDIDATE', threshold: 100 },
	{ level: 'CHAMPION', threshold: 150 }
];

const ACTION_DAILY_CAPS = {
	BROADCAST_VIEW: 3,
	CTA_REACT: 5,
	SHARE_PRIVATE: 3,
	SHARE_PUBLIC: 2,
	STORY_SUBMIT: 1,
	SESSION_ATTEND: 2,
	KNOWLEDGE_QA: 2,
	SPEAKER_MENTOR: 1,
	LEAD_ACTION: 1
};

function tierFor(points) {
	let tier = TIERS[0].level;
	for (const item of TIERS) if (points >= item.threshold) tier = item.level;
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
		const type = entry.getString('activityType');
		counts[type] = (counts[type] || 0) + 1;
	}
	return Object.entries(ACTION_DAILY_CAPS).map(([type, cap]) => {
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

function ensureProfile(app, awardee) {
	const awardeeId = awardee.getString('legacyId');
	const userId = awardee.getString('user');
	let profile = null;
	try { profile = app.findFirstRecordByData('gamification_profiles', 'awardee', awardee.id); } catch (_) {}
	if (!profile) profile = new Record(app.findCollectionByNameOrId('gamification_profiles'));
	const entries = activeLedger(app, awardeeId);
	const total = entries.reduce((sum, row) => sum + row.getInt('points'), 0);
	const streak = streakOf(entries, new Date());
	const tier = tierFor(total);
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
	profile.set('lastActiveAt', entries.length ? entries[entries.length - 1].getString('occurredAt') : '');
	profile.set('recalculatedAt', new Date().toISOString());
	app.save(profile);

	const activeCodes = badgeCodes(entries, streak.current, tier, awardee.getString('community'));
	const existing = app.findRecordsByFilter('awardee_badges', 'awardee = {:awardee}', '', 0, 0, { awardee: awardee.id });
	const byCode = Object.fromEntries(existing.map((row) => [row.getString('badgeCode'), row]));
	for (const code of activeCodes) {
		let row = byCode[code];
		if (!row) row = new Record(app.findCollectionByNameOrId('awardee_badges'));
		const badge = app.findFirstRecordByData('badges', 'code', code);
		row.set('awardee', awardee.id); row.set('user', userId); row.set('badge', badge.id); row.set('badgeCode', code);
		row.set('status', 'ACTIVE'); row.set('revokedAt', '');
		if (!row.getString('awardedAt')) row.set('awardedAt', new Date().toISOString());
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

module.exports = { TIERS, ACTION_DAILY_CAPS, tierFor, pfWeek, streakOf, activeLedger, dailyUsage, ensureProfile, ensureAll };
