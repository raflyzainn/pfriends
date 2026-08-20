const PROGRAM_YEAR = 2026;
const PROGRAM_MONTHS = 7;
const ACTIVE_WINDOW_DAYS = 90;
const AMPLIFICATION_TYPES = ['SHARE_PRIVATE', 'SHARE_PUBLIC'];
const SLA_LIMITS = { STORY_DIAJUKAN: 2, STORY_REVIEW: 3, STORY_DISETUJUI: 5, EVENT_DIUSULKAN: 2 };

function requireAdmin(e) {
	if (!e.auth || e.auth.getString('role') !== 'ADMIN' || e.auth.getString('status') !== 'AKTIF') {
		throw new ForbiddenError('Akses hanya tersedia untuk Admin aktif.');
	}
}

function jsonValue(record, field, fallback) {
	try { return JSON.parse(record.getString(field) || JSON.stringify(fallback)); } catch (_) {}
	const direct = record.get(field);
	if (Array.isArray(direct) && direct.every((value) => typeof value === 'number')) {
		try { return JSON.parse(direct.map((value) => String.fromCharCode(value)).join('')); } catch (_) {}
	}
	return direct || fallback;
}

function jakartaMonth(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

function jakartaDay(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function programMonths() {
	const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];
	return Array.from({ length: PROGRAM_MONTHS }, (_, index) => {
		const month = index + 1;
		const monthKey = `${PROGRAM_YEAR}-${String(month).padStart(2, '0')}`;
		const end = new Date(Date.UTC(PROGRAM_YEAR, month, 1) - 7 * 60 * 60 * 1000 - 1);
		return { monthKey, label: labels[index], end };
	});
}

function workingDaysSince(value, now) {
	const rawStart = new Date(value);
	if (Number.isNaN(rawStart.getTime())) return 0;
	const start = new Date(rawStart.getTime() + 7 * 60 * 60 * 1000);
	start.setUTCHours(0, 0, 0, 0);
	const end = new Date(new Date(now).getTime() + 7 * 60 * 60 * 1000); end.setUTCHours(0, 0, 0, 0);
	let days = 0;
	for (let cursor = new Date(start); cursor < end && days < 3650;) {
		cursor.setUTCDate(cursor.getUTCDate() + 1);
		if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) days++;
	}
	return days;
}

function median(values) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function slaRows(stories, events, now) {
	const queues = {
		STORY_DIAJUKAN: stories.filter((row) => row.getString('status') === 'DIAJUKAN').map((row) => row.getString('submittedAt')),
		STORY_REVIEW: stories.filter((row) => row.getString('status') === 'REVIEW').map((row) => row.getString('reviewedAt') || row.getString('submittedAt')),
		STORY_DISETUJUI: stories.filter((row) => row.getString('status') === 'DISETUJUI').map((row) => row.getString('reviewedAt') || row.getString('submittedAt')),
		EVENT_DIUSULKAN: events.filter((row) => row.getString('status') === 'DIUSULKAN').map((row) => row.getString('submittedAt'))
	};
	return Object.keys(SLA_LIMITS).map((queue) => {
		const ages = queues[queue].map((value) => workingDaysSince(value, now));
		return { queue, withinSla: ages.filter((days) => days <= SLA_LIMITS[queue]).length, breachedSla: ages.filter((days) => days > SLA_LIMITS[queue]).length, medianDays: median(ages) };
	});
}

function storyEvidence(story) {
	const tags = jsonValue(story, 'esgTags', []);
	const outcome = jsonValue(story, 'outcome', null);
	const pillars = [...new Set((Array.isArray(tags) ? tags : []).map((tag) => String(tag && tag.pillar || '')).filter((pillar) => ['E','S','G'].includes(pillar)))];
	const documented = Boolean(story.getString('title').trim() && story.getString('activityDate') && story.getString('location').trim() && story.getInt('participantCount') > 0);
	const outcomeReady = Boolean(outcome && String(outcome.note || '').trim().length >= 200);
	const tagged = pillars.length > 0;
	const hasEvidence = story.getStringSlice('evidenceFiles').length > 0 || (Array.isArray(jsonValue(story, 'mediaRefs', [])) && jsonValue(story, 'mediaRefs', []).length > 0);
	return { pillars, ready: documented && outcomeReady && tagged && hasEvidence };
}

function dashboard(app) {
	const capturedAt = new Date();
	const months = programMonths();
	const users = app.findRecordsByFilter('users', 'id != ""', '', 0, 0);
	const awardees = app.findRecordsByFilter('awardees', 'id != ""', '', 0, 0);
	const stories = app.findRecordsByFilter('stories', 'id != ""', '', 0, 0);
	const broadcasts = app.findRecordsByFilter('broadcasts', 'status = "TERKIRIM"', '', 0, 0);
	const activities = app.findRecordsByFilter('verified_point_activities', 'status = "AWARDED"', '', 0, 0);
	const events = app.findRecordsByFilter('events', 'id != ""', '', 0, 0);
	const activeAwardees = awardees.filter((row) => row.getString('status') === 'AKTIF');
	const activeIds = new Set(activeAwardees.map((row) => row.getString('legacyId')));
	const storyEvidenceRows = stories.map((story) => storyEvidence(story));

	const monthly = months.map((month) => {
		const sent = broadcasts.filter((row) => jakartaMonth(row.getString('sentAt')) === month.monthKey);
		const entries = activities.filter((row) => jakartaMonth(row.getString('occurredAt')) === month.monthKey);
		const amplifiers = new Set(entries.filter((row) => AMPLIFICATION_TYPES.includes(row.getString('activityType')) && activeIds.has(row.getString('awardeeId'))).map((row) => row.getString('awardeeId')));
		const windowStart = month.end.getTime() - ACTIVE_WINDOW_DAYS * 86400000;
		const windowEntries = activities.filter((row) => { const at = new Date(row.getString('occurredAt')).getTime(); return Number.isFinite(at) && at <= month.end.getTime() && at >= windowStart; });
		return {
			monthKey: month.monthKey,
			label: month.label,
			publishedStories: stories.filter((row) => row.getString('status') === 'TERPUBLIKASI' && jakartaMonth(row.getString('publishedAt')) === month.monthKey).length,
			disseminatedContents: new Set(sent.map((row) => row.id)).size,
			disseminationDays: new Set(sent.map((row) => jakartaDay(row.getString('sentAt'))).filter(Boolean)).size,
			amplifiers: amplifiers.size,
			amplificationRate: activeAwardees.length ? Math.round(amplifiers.size / activeAwardees.length * 100) : 0,
			points: entries.reduce((sum, row) => sum + row.getInt('points'), 0),
			registered: awardees.filter((row) => { const joined = new Date(row.getString('joinedAt')).getTime(); return Number.isFinite(joined) && joined <= month.end.getTime(); }).length,
			active: new Set(windowEntries.map((row) => row.getString('awardeeId')).filter(Boolean)).size,
			engagedAmplifiers: new Set(windowEntries.filter((row) => AMPLIFICATION_TYPES.includes(row.getString('activityType'))).map((row) => row.getString('awardeeId')).filter(Boolean)).size
		};
	});

	const completedEvents = events.filter((event) => {
		const month = jakartaMonth(event.getString('endsAt'));
		return month >= '2026-01' && month <= '2026-07' && event.getString('status') === 'SELESAI' && event.getString('outcomeNote').trim() && app.findRecordsByFilter('event_participants', 'event = {:event} && attendanceStatus = "APPROVED"', '', 0, 0, { event: event.id }).length >= 10;
	}).length;
	const july = monthly[monthly.length - 1];
	const coverageCount = activeAwardees.filter((row) => row.getBool('consentActive')).length;
	const esgPillars = ['E','S','G'].map((pillar) => { const rows = storyEvidenceRows.filter((row) => row.pillars.includes(pillar)); const ready = rows.filter((row) => row.ready).length; return { pillar, label: pillar === 'E' ? 'Environmental' : pillar === 'S' ? 'Social' : 'Governance', total: rows.length, ready, incomplete: rows.length - ready, readinessRate: rows.length ? Math.round(ready / rows.length * 100) : 0 }; });

	return {
		capturedAt: capturedAt.toISOString(),
		period: { startsAt: '2026-01-01', endsAt: '2026-07-31', referenceMonth: '2026-07' },
		summary: {
			stories: { total: stories.length, published: stories.filter((row) => row.getString('status') === 'TERPUBLIKASI').length, pending: stories.filter((row) => ['DIAJUKAN','REVIEW','DISETUJUI'].includes(row.getString('status'))).length },
			dissemination: { contents: monthly.reduce((sum, row) => sum + row.disseminatedContents, 0), days: monthly.reduce((sum, row) => sum + row.disseminationDays, 0) },
			accounts: { total: users.length, active: users.filter((row) => row.getString('status') === 'AKTIF').length, byRole: { AWARDEE: users.filter((row) => row.getString('role') === 'AWARDEE').length, VERIFIER: users.filter((row) => row.getString('role') === 'VERIFIER').length, ADMIN: users.filter((row) => row.getString('role') === 'ADMIN').length } }
		},
		kpiActuals: [
			{ id: 'M-01', actual: awardees.length ? Math.round(coverageCount / awardees.length * 100) : 0, numerator: coverageCount, denominator: awardees.length },
			{ id: 'M-02', actual: july.disseminatedContents, numerator: july.disseminatedContents, denominator: 2 },
			{ id: 'M-03', actual: july.disseminationDays, numerator: july.disseminationDays, denominator: 2 },
			{ id: 'M-04', actual: july.amplificationRate, numerator: july.amplifiers, denominator: activeAwardees.length },
			{ id: 'M-05', actual: completedEvents, numerator: completedEvents, denominator: 2 }
		],
		monthly,
		sla: slaRows(stories, events, capturedAt),
		esg: { pillars: esgPillars },
		engagement: monthly.map((row) => ({ monthKey: row.monthKey, label: row.label, registered: row.registered, active: row.active, amplifiers: row.engagedAmplifiers })),
		chapters: [...new Set(awardees.map((row) => row.getString('chapterId')).filter(Boolean))].sort().map((id) => ({ id, SOBI: awardees.filter((row) => row.getString('chapterId') === id && row.getString('community') === 'SOBI').length, WOMENPRENEUR: awardees.filter((row) => row.getString('chapterId') === id && row.getString('community') === 'WOMENPRENEUR').length }))
	};
}

module.exports = { dashboard, requireAdmin };
