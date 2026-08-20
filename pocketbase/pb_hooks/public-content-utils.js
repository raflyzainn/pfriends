function jsonField(record, field, fallback) {
	try { return JSON.parse(record.getString(field)); } catch (_) {}
	const direct = record.get(field);
	if (Array.isArray(direct) && direct.every((value) => typeof value === 'number')) {
		try { return JSON.parse(direct.map((value) => String.fromCharCode(value)).join('')); } catch (_) {}
	}
	return direct || fallback;
}

function storyDto(record, app) {
	let coverUrl = '';
	try { const cover = app.findFirstRecordByData('story_public_covers', 'story', record.id); const image = cover.getString('image'); if (image) coverUrl = `/api/files/${cover.collection().id}/${cover.id}/${image}`; } catch (_) {}
	return {
		id: record.getString('legacyId'),
		slug: record.getString('slug'),
		authorId: record.getString('authorLegacyId'),
		authorName: record.getString('authorName'),
		title: record.getString('title'),
		summary: record.getString('summary'),
		body: record.getString('body'),
		status: record.getString('status'),
		community: record.getString('community'),
		chapterId: record.getString('chapterId'),
		esgTags: jsonField(record, 'esgTags', []),
		mediaRefs: jsonField(record, 'mediaRefs', []),
		coverUrl,
		outcome: jsonField(record, 'outcome', null),
		location: record.getString('location'),
		activityDate: record.getString('activityDate') || null,
		participantCount: record.getInt('participantCount'),
		sensitivityScan: record.getString('sensitivityScan'),
		pfValidation: jsonField(record, 'pfValidation', null),
		consentGranted: true,
		submittedAt: record.getString('submittedAt') || null,
		publishedAt: record.getString('publishedAt') || null,
		views: record.getInt('views')
	};
}

function storyFilter(extra) {
	const base = 'status = "TERPUBLIKASI" && consentActive = true && consentLegacyId != ""';
	return extra ? `${base} && ${extra}` : base;
}

function movementDto(record, app) {
	const participants = app.findRecordsByFilter('movement_participants', 'movement = {:movement} && status = "ACTIVE"', '', 0, 0, { movement: record.id });
	const reports = app.findRecordsByFilter('movement_reports', 'movement = {:movement} && status = "APPROVED"', '', 0, 0, { movement: record.id });
	return {
		id: record.id,
		slug: record.getString('slug'),
		title: record.getString('title'),
		category: record.getString('category'),
		status: record.getString('status'),
		objective: record.getString('objective'),
		region: record.getString('region'),
		startsAt: record.getString('startsAt'),
		endsAt: record.getString('endsAt'),
		targetParticipants: record.getInt('targetParticipants'),
		participantCount: participants.length,
		reportCount: reports.length
	};
}

function movementFilter() {
	return 'status = "BERJALAN" || status = "SELESAI"';
}

function communitySummary(app) {
	const awardees = app.findRecordsByFilter('awardees', 'status = "AKTIF"', 'chapterId', 0, 0);
	const communityIds = ['SOBI', 'WOMENPRENEUR'];
	const communities = communityIds.map((id) => {
		const members = awardees.filter((awardee) => awardee.getString('community') === id);
		return {
			id,
			activeMembers: members.length,
			activeChapters: new Set(members.map((awardee) => awardee.getString('chapterId')).filter(Boolean)).size
		};
	});
	const chapterIds = [...new Set(awardees.map((awardee) => awardee.getString('chapterId')).filter(Boolean))].sort();
	const chapters = chapterIds.map((id) => {
		const members = awardees.filter((awardee) => awardee.getString('chapterId') === id);
		return {
			id,
			activeMembers: members.length,
			sobiMembers: members.filter((awardee) => awardee.getString('community') === 'SOBI').length,
			womenpreneurMembers: members.filter((awardee) => awardee.getString('community') === 'WOMENPRENEUR').length
		};
	});
	return {
		activeMembers: awardees.length,
		activeChapters: chapterIds.length,
		communities,
		chapters
	};
}

function publicImpact(app) {
	const capturedAt = new Date();
	const activeAwardees = app.findRecordsByFilter('awardees', 'status = "AKTIF"', '', 0, 0);
	const activeIds = new Set(activeAwardees.map((awardee) => awardee.getString('legacyId')));
	const registeredAwardees = activeAwardees.filter((awardee) => awardee.getBool('consentActive')).length;
	const activeChapters = new Set(activeAwardees.map((awardee) => awardee.getString('chapterId')).filter(Boolean)).size;
	const publishedStories = app.findRecordsByFilter('stories', storyFilter(''), '', 0, 0).length;
	const events = app.findRecordsByFilter('events', 'id != ""', '', 0, 0);
	const completedEvents = events.filter((event) => {
		if (event.getString('status') !== 'SELESAI' || !event.getString('outcomeNote')) return false;
		return app.findRecordsByFilter(
			'event_participants',
			'event = {:event} && attendanceStatus = "APPROVED"',
			'', 0, 0, { event: event.id }
		).length >= 10;
	}).length;
	const upcomingEvents = events.filter((event) =>
		['TERJADWAL', 'BERLANGSUNG'].includes(event.getString('status')) &&
		new Date(event.getString('endsAt')).getTime() >= capturedAt.getTime()
	).length;
	const runningMovements = app.findRecordsByFilter('movements', 'status = "BERJALAN"', '', 0, 0).length;
	const recordedActions = app.findRecordsByFilter('verified_point_activities', 'status = "AWARDED"', '', 0, 0).length;

	const jakarta = new Date(capturedAt.getTime() + 7 * 60 * 60 * 1000);
	const year = jakarta.getUTCFullYear();
	const month = jakarta.getUTCMonth();
	const start = new Date(Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000).toISOString();
	const end = new Date(Date.UTC(year, month + 1, 1) - 7 * 60 * 60 * 1000).toISOString();
	const amplification = app.findRecordsByFilter(
		'verified_point_activities',
		'status = "AWARDED" && occurredAt >= {:start} && occurredAt < {:end} && (activityType = "SHARE_PRIVATE" || activityType = "SHARE_PUBLIC")',
		'', 0, 0, { start, end }
	);
	const amplifiersThisMonth = new Set(
		amplification.map((entry) => entry.getString('awardeeId')).filter((id) => activeIds.has(id))
	).size;

	return {
		capturedAt: capturedAt.toISOString(),
		registeredAwardees,
		activeChapters,
		totalChapters: 3,
		publishedStories,
		completedEvents,
		upcomingEvents,
		runningMovements,
		recordedActions,
		amplifiersThisMonth,
		beneficiaryRegistry: { value: null, source: 'Penyebut registry penerima manfaat belum tersedia.' }
	};
}

module.exports = { communitySummary, movementDto, movementFilter, publicImpact, storyDto, storyFilter };
