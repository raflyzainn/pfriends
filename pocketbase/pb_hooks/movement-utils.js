function requireRole(e, roles) {
	const allowed = Array.isArray(roles) ? roles : [roles];
	if (!e.auth || e.auth.getString('status') !== 'AKTIF' || !allowed.includes(e.auth.getString('role'))) throw new ForbiddenError('Akun ini tidak memiliki akses ke alur Gerakan.');
}

function parseTags(record) {
	try { const value = JSON.parse(record.getString('esgTags') || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; }
}

function reportDto(record) {
	return { id: record.id, movement: record.getString('movement'), owner: record.getString('owner'), awardeeId: record.getString('awardeeId'), awardeeName: record.getString('awardeeName'), role: record.getString('role'), activityDate: record.getString('activityDate'), location: record.getString('location'), participantCount: record.getInt('participantCount'), outcomeNote: record.getString('outcomeNote'), evidenceFiles: record.getStringSlice('evidenceFiles'), status: record.getString('status'), revisionCount: record.getInt('revisionCount'), reviewNote: record.getString('reviewNote'), submittedAt: record.getString('submittedAt'), reviewedAt: record.getString('reviewedAt'), awardedPoints: record.getInt('awardedPoints') };
}

function movementDto(app, record, auth) {
	const participants = app.findRecordsByFilter('movement_participants', 'movement = {:movement} && status = "ACTIVE"', 'joinedAt', 0, 0, { movement: record.id });
	const reports = app.findRecordsByFilter('movement_reports', 'movement = {:movement}', '-submittedAt', 0, 0, { movement: record.id });
	const mine = auth ? participants.find((row) => row.getString('owner') === auth.id) : null;
	const role = auth ? auth.getString('role') : '';
	const visibleReports = role === 'AWARDEE' ? reports.filter((row) => row.getString('owner') === auth.id) : reports;
	return { id: record.id, slug: record.getString('slug'), title: record.getString('title'), category: record.getString('category'), status: record.getString('status'), objective: record.getString('objective'), description: record.getString('description'), region: record.getString('region'), leaderLegacyId: record.getString('leaderLegacyId'), leaderName: record.getString('leaderName'), startsAt: record.getString('startsAt'), endsAt: record.getString('endsAt'), targetParticipants: record.getInt('targetParticipants'), esgTags: parseTags(record), impact: record.get('impact') || {}, proposedBy: record.getString('proposedBy'), submittedAt: record.getString('submittedAt'), reviewedAt: record.getString('reviewedAt'), reviewNote: record.getString('reviewNote'), revisionCount: record.getInt('revisionCount'), participantCount: participants.length, approvedReportCount: reports.filter((row) => row.getString('status') === 'APPROVED').length, myParticipant: mine ? { id: mine.id, role: mine.getString('role'), joinedAt: mine.getString('joinedAt') } : null, reports: visibleReports.map(reportDto) };
}

function decision(tx, movement, report, actor, action, fromStatus, toStatus, note) {
	const row = new Record(tx.findCollectionByNameOrId('movement_decisions'));
	row.set('movement', movement.id); if (report) row.set('report', report.id); row.set('kind', report ? 'REPORT' : 'MOVEMENT'); row.set('actor', actor.id); row.set('actorName', actor.getString('displayName')); row.set('decision', action); row.set('fromStatus', fromStatus); row.set('toStatus', toStatus); row.set('note', String(note || '').trim()); row.set('decidedAt', new Date().toISOString()); tx.save(row);
}

module.exports = { requireRole, reportDto, movementDto, decision };
