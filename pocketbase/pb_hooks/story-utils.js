function requireRole(e, roles) {
	const allowed = Array.isArray(roles) ? roles : [roles];
	if (!e.auth || e.auth.getString('status') !== 'AKTIF' || !allowed.includes(e.auth.getString('role'))) throw new ForbiddenError('Akun ini tidak memiliki akses ke alur Cerita.');
}

function arrayValue(record, field) {
	try { const parsed = JSON.parse(record.getString(field) || '[]'); if (Array.isArray(parsed)) return parsed; } catch (_) {}
	const direct = record.get(field);
	if (Array.isArray(direct) && direct.every((value) => typeof value === 'number')) {
		try { const parsed = JSON.parse(direct.map((value) => String.fromCharCode(value)).join('')); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
	}
	return Array.isArray(direct) ? direct : [];
}

function objectValue(record, field) {
	try { const parsed = JSON.parse(record.getString(field) || 'null'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed; } catch (_) {}
	const direct = record.get(field);
	if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
	if (Array.isArray(direct) && direct.every((value) => typeof value === 'number')) {
		try { return JSON.parse(direct.map((value) => String.fromCharCode(value)).join('')); } catch (_) { return null; }
	}
	return null;
}

function publicCover(app, story) {
	try {
		const row = app.findFirstRecordByData('story_public_covers', 'story', story.id);
		const name = row.getString('image');
		return name ? `/api/files/${row.collection().id}/${row.id}/${name}` : '';
	} catch (_) { return ''; }
}

function storyDto(app, record, includePrivate) {
	const reviews = includePrivate ? app.findRecordsByFilter('story_reviews', 'story = {:story}', 'decidedAt', 0, 0, { story: record.id }) : [];
	const notes = reviews.filter((row) => row.getString('note')).map((row) => ({ reviewerId: row.getString('reviewer'), reviewerName: row.getString('reviewerName'), note: row.getString('note'), at: row.getString('decidedAt'), decision: row.getString('decision') }));
	const legacyNotes = arrayValue(record, 'reviewNotes');
	return {
		id: record.id, legacyId: record.getString('legacyId'), slug: record.getString('slug'), authorId: record.getString('authorLegacyId'), authorName: record.getString('authorName'),
		title: record.getString('title'), summary: record.getString('summary'), body: record.getString('body'), status: record.getString('status'), community: record.getString('community'), chapterId: record.getString('chapterId'),
		esgTags: arrayValue(record, 'esgTags'), mediaRefs: includePrivate ? record.getStringSlice('evidenceFiles') : arrayValue(record, 'mediaRefs'), evidenceFiles: includePrivate ? record.getStringSlice('evidenceFiles') : [], coverCandidate: includePrivate ? record.getString('coverCandidate') : '', coverUrl: publicCover(app, record),
		outcome: objectValue(record, 'outcome'), location: record.getString('location'), activityDate: record.getString('activityDate') || null, participantCount: record.getInt('participantCount'), sensitivityScan: record.getString('sensitivityScan'), pfValidation: objectValue(record, 'pfValidation'),
		consentActive: record.getBool('consentActive'), consentId: record.getString('consentLegacyId') || null, reviewNotes: notes.length ? notes : legacyNotes, reviewerId: record.getString('reviewer') || null, reviewedAt: record.getString('reviewedAt') || null,
		publishedById: record.getString('publishedBy'), revisionCount: record.getInt('revisionCount'), submittedAt: record.getString('submittedAt') || null, publishedAt: record.getString('publishedAt') || null, archivedAt: record.getString('archivedAt') || null, archiveReason: record.getString('archiveReason') || null, views: record.getInt('views'), draftSavedAt: record.getString('draftSavedAt') || null, awardedPoints: record.getInt('awardedPoints')
	};
}

function statusEvent(tx, story, actor, eventType, fromStatus, toStatus, note) {
	const row = new Record(tx.findCollectionByNameOrId('story_status_events'));
	row.set('story', story.id); if (actor) row.set('actor', actor.id); row.set('actorName', actor ? actor.getString('displayName') : 'Sistem'); row.set('eventType', eventType); row.set('fromStatus', fromStatus || ''); row.set('toStatus', toStatus); row.set('note', String(note || '').trim()); row.set('occurredAt', new Date().toISOString()); tx.save(row);
}

function review(tx, story, actor, decision, note, checks) {
	const row = new Record(tx.findCollectionByNameOrId('story_reviews'));
	row.set('story', story.id); row.set('reviewer', actor.id); row.set('reviewerName', actor.getString('displayName')); row.set('decision', decision); row.set('note', String(note || '').trim()); row.set('sensitivityChecks', checks || []); row.set('decidedAt', new Date().toISOString()); tx.save(row);
}

function slugify(value) {
	return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 130) || 'cerita';
}

function wordCount(value) { return String(value || '').trim().split(/\s+/).filter(Boolean).length; }

function storyFiles(e, field) { try { return e.findUploadedFiles(field) || []; } catch (_) { return []; } }

function applyDraft(row, data, evidence, covers) {
	for (const field of ['title','summary','body','location','activityDate']) if (data[field] !== undefined) row.set(field, String(data[field] || '').trim());
	if (data.participantCount !== undefined) row.set('participantCount', Math.max(0, Number(data.participantCount) || 0));
	if (data.esgTags !== undefined) { try { row.set('esgTags', typeof data.esgTags === 'string' ? JSON.parse(data.esgTags) : data.esgTags); } catch (_) {} }
	if (data.outcome !== undefined) { try { row.set('outcome', typeof data.outcome === 'string' ? JSON.parse(data.outcome) : data.outcome); } catch (_) {} }
	if (evidence.length) row.set('evidenceFiles', evidence);
	if (covers.length) row.set('coverCandidate', covers[0]);
	if (String(data.removeEvidence || '') === 'true') row.set('evidenceFiles', null);
	if (String(data.removeCover || '') === 'true') row.set('coverCandidate', null);
	row.set('draftSavedAt', new Date().toISOString());
}

function validateSubmission(record) {
	let tags = arrayValue(record, 'esgTags');
	try { tags = JSON.parse(JSON.stringify(tags)); } catch (_) {}
	if (record.getString('title').trim().length < 5) throw new BadRequestError('Judul minimal 5 karakter.');
	if (wordCount(record.getString('body')) < 300) throw new BadRequestError('Naskah minimal 300 kata.');
	if (!record.getString('location').trim() || !record.getString('activityDate') || record.getInt('participantCount') < 1) throw new BadRequestError('Tanggal aktivitas, lokasi, dan jumlah peserta wajib diisi.');
	const outcome = objectValue(record, 'outcome');
	if (!outcome || String(outcome.note || '').trim().length < 20) throw new BadRequestError('Catatan hasil minimal 20 karakter.');
	const tagsValid = tags.length > 0 && tags.every((tag) => {
		const pillar = String(tag?.pillar || '');
		const goal = parseInt(String(tag?.sdgGoal || ''), 10);
		return (pillar === 'E' || pillar === 'S' || pillar === 'G') && goal >= 1 && goal <= 17;
	});
	if (!tagsValid) throw new BadRequestError('Tag ESG dan SDG wajib sah.');
	if (record.getStringSlice('evidenceFiles').length < 1) throw new BadRequestError('Minimal satu berkas bukti wajib tersedia.');
	if (!record.getString('coverCandidate')) throw new BadRequestError('Foto sampul wajib tersedia.');
}

module.exports = { requireRole, storyDto, statusEvent, review, slugify, validateSubmission, arrayValue, objectValue, storyFiles, applyDraft };
