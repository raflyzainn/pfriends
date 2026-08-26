function jsonValue(value, fallback) {
	if (value === null || value === undefined || value === '') return fallback;
	if (typeof value !== 'string') return value;
	try { return JSON.parse(value); } catch { return fallback; }
}

export function storyDto(record, coverUrl = '') {
	return {
		id: record.legacyId,
		slug: record.slug,
		authorId: record.authorLegacyId,
		authorName: record.authorName,
		title: record.title,
		summary: record.summary,
		body: record.body,
		status: record.status,
		community: record.community,
		chapterId: record.chapterId,
		esgTags: jsonValue(record.esgTags, []),
		mediaRefs: jsonValue(record.mediaRefs, []),
		coverUrl,
		outcome: jsonValue(record.outcome, null),
		location: record.location,
		activityDate: record.activityDate || null,
		participantCount: Number(record.participantCount) || 0,
		sensitivityScan: record.sensitivityScan,
		pfValidation: jsonValue(record.pfValidation, null),
		consentGranted: true,
		submittedAt: record.submittedAt || null,
		publishedAt: record.publishedAt || null,
		views: Number(record.views) || 0
	};
}

export function communitySummary(awardees) {
	const rows = awardees.filter((row) => row.status === 'AKTIF');
	const communities = ['SOBI', 'WOMENPRENEUR'].map((id) => {
		const members = rows.filter((row) => row.community === id);
		return { id, activeMembers: members.length, activeChapters: new Set(members.map((row) => row.chapterId).filter(Boolean)).size };
	});
	const chapterIds = [...new Set(rows.map((row) => row.chapterId).filter(Boolean))].sort();
	const chapters = chapterIds.map((id) => {
		const members = rows.filter((row) => row.chapterId === id);
		return { id, activeMembers: members.length, sobiMembers: members.filter((row) => row.community === 'SOBI').length, womenpreneurMembers: members.filter((row) => row.community === 'WOMENPRENEUR').length };
	});
	return { activeMembers: rows.length, activeChapters: chapterIds.length, communities, chapters };
}

export function movementDto(record, participantCount, reportCount) {
	return { id: record.id, slug: record.slug, title: record.title, category: record.category, status: record.status, objective: record.objective, region: record.region, startsAt: record.startsAt, endsAt: record.endsAt, targetParticipants: Number(record.targetParticipants) || 0, participantCount, reportCount };
}

export function jakartaMonthBounds(date = new Date()) {
	const jakarta = new Date(date.getTime() + 7 * 60 * 60 * 1000);
	const start = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), 1) - 7 * 60 * 60 * 1000);
	const end = new Date(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth() + 1, 1) - 7 * 60 * 60 * 1000);
	return { start: start.toISOString(), end: end.toISOString() };
}
