function eventSlug(value) {
	return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function requireRole(e, role) {
	if (!e.auth || e.auth.getString('role') !== role || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError(`Hanya ${role === 'AWARDEE' ? 'Awardee' : 'Verifikator'} aktif yang dapat melakukan tindakan ini.`);
}

function eventJson(app, record, auth) {
	const participants = app.findRecordsByFilter('event_participants', 'event = {:event}', '', 0, 0, { event: record.id });
	const mine = auth ? participants.find((row) => row.getString('owner') === auth.id) : null;
	const audit = auth && (auth.getString('role') === 'VERIFIER' || record.getString('proposedBy') === auth.id);
	return { id: record.id, title: record.getString('title'), slug: record.getString('slug'), type: record.getString('type'), status: record.getString('status'), description: record.getString('description'), speakerName: record.getString('speakerName'), chapterId: record.getString('chapterId'), community: record.getString('community'), location: record.getString('location'), isOnline: record.getBool('isOnline'), startsAt: record.getString('startsAt'), endsAt: record.getString('endsAt'), quota: record.getInt('quota'), proposedBy: audit ? record.getString('proposedBy') : '', proposedByName: audit ? record.getString('proposedByName') : '', proposedByAwardeeId: audit ? record.getString('proposedByAwardeeId') : '', submittedAt: audit ? record.getString('submittedAt') : '', reviewedBy: audit ? record.getString('reviewedBy') : '', reviewedAt: audit ? record.getString('reviewedAt') : '', reviewNote: audit ? record.getString('reviewNote') : '', publishedAt: record.getString('publishedAt'), outcomeNote: record.getString('outcomeNote'), registeredCount: participants.length, attendeeCount: participants.filter((row) => row.getString('attendanceStatus') === 'APPROVED').length, myParticipant: mine ? { id: mine.id, awardeeId: mine.getString('awardeeId'), attendanceStatus: mine.getString('attendanceStatus'), registeredAt: mine.getString('registeredAt'), attendedAt: mine.getString('attendedAt') } : null };
}

module.exports = { eventSlug, requireRole, eventJson };
