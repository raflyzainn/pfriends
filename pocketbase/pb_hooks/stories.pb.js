routerAdd('GET', '/api/pfriends/stories/mine', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'AWARDEE');
	const rows = e.app.findRecordsByFilter('stories', 'owner = {:owner}', '-draftSavedAt,-submittedAt', 0, 0, { owner: e.auth.id });
	return e.json(200, { items: rows.map((row) => utils.storyDto(e.app, row, true)) });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/stories/drafts', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'AWARDEE'); const data = e.requestInfo().body || {}; const evidence = utils.storyFiles(e, 'evidenceFiles'); const covers = utils.storyFiles(e, 'coverCandidate'); let result;
	e.app.runInTransaction((tx) => {
		const awardee = tx.findFirstRecordByData('awardees', 'user', e.auth.id); const row = new Record(tx.findCollectionByNameOrId('stories')); const key = `${e.auth.id}-${Date.now()}`;
		row.set('legacyId', `DRAFT-${key}`); row.set('slug', `draft-${key}`); row.set('author', awardee.id); row.set('owner', e.auth.id); row.set('authorLegacyId', awardee.getString('legacyId')); row.set('authorName', awardee.getString('fullName')); row.set('status', 'DRAFT'); row.set('community', awardee.getString('community')); row.set('chapterId', awardee.getString('chapterId')); row.set('sensitivityScan', 'MENUNGGU'); row.set('consentActive', awardee.getBool('consentActive')); row.set('consentLegacyId', awardee.getBool('consentActive') ? `PROFILE-${awardee.getString('legacyId')}` : ''); row.set('revisionCount', 0); row.set('awardedPoints', 0); utils.applyDraft(row, data, evidence, covers); tx.save(row); utils.statusEvent(tx, row, e.auth, 'DRAFT_SAVED', '', 'DRAFT', ''); result = row;
	});
	return e.json(201, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('PATCH', '/api/pfriends/stories/{id}/draft', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'AWARDEE'); const data = e.requestInfo().body || {}; const evidence = utils.storyFiles(e, 'evidenceFiles'); const covers = utils.storyFiles(e, 'coverCandidate'); const row = e.app.findRecordById('stories', e.request.pathValue('id'));
	if (row.getString('owner') !== e.auth.id) throw new ForbiddenError('Draf ini bukan milik Anda.'); if (!['DRAFT','PERLU_REVISI'].includes(row.getString('status'))) throw new BadRequestError('Naskah tidak dapat disunting pada status ini.');
	utils.applyDraft(row, data, evidence, covers); e.app.save(row); return e.json(200, utils.storyDto(e.app, row, true));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/stories/{id}/submit', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'AWARDEE'); let result;
	e.app.runInTransaction((tx) => {
		const row = tx.findRecordById('stories', e.request.pathValue('id')); if (row.getString('owner') !== e.auth.id) throw new ForbiddenError('Naskah ini bukan milik Anda.'); const before = row.getString('status'); if (!['DRAFT','PERLU_REVISI'].includes(before)) throw new BadRequestError('Naskah tidak dapat dikirim pada status ini.');
		const awardee = tx.findFirstRecordByData('awardees', 'user', e.auth.id); if (!awardee.getBool('consentActive')) throw new BadRequestError('Consent publikasi Cerita belum aktif.'); utils.validateSubmission(row);
		let slug = `${utils.slugify(row.getString('title'))}-${awardee.getString('legacyId').toLowerCase()}`; try { const old = tx.findFirstRecordByData('stories', 'slug', slug); if (old.id !== row.id) slug = `${slug}-${row.id.slice(0,6)}`; } catch (_) {}
		const now = new Date().toISOString(); row.set('slug', slug); row.set('status', 'DIAJUKAN'); row.set('submittedAt', now); row.set('reviewer', ''); row.set('reviewedAt', ''); row.set('consentActive', true); row.set('consentLegacyId', `PROFILE-${awardee.getString('legacyId')}`); if (before === 'PERLU_REVISI') row.set('revisionCount', row.getInt('revisionCount') + 1);
		let points = row.getInt('awardedPoints'); if (before === 'DRAFT') { try { tx.findFirstRecordByFilter('verified_point_activities', 'story = {:story} && activityType = "STORY_SUBMIT"', { story: row.id }); } catch (_) { const date = now.slice(0,10); const count = tx.findRecordsByFilter('verified_point_activities', 'awardeeId = {:awardee} && activityType = "STORY_SUBMIT" && occurredAt >= {:start} && occurredAt <= {:end}', '', 0, 0, { awardee: awardee.getString('legacyId'), start: `${date} 00:00:00.000Z`, end: `${date} 23:59:59.999Z` }).length; points = count >= 1 ? 0 : 10; const ledger = new Record(tx.findCollectionByNameOrId('verified_point_activities')); ledger.set('user', e.auth.id); ledger.set('source', 'STORY'); ledger.set('story', row.id); ledger.set('awardeeId', awardee.getString('legacyId')); ledger.set('activityType', 'STORY_SUBMIT'); ledger.set('points', points); ledger.set('capReason', points ? '' : 'DAILY_CAP'); ledger.set('occurredAt', now); ledger.set('awardedAt', now); ledger.set('status', 'AWARDED'); tx.save(ledger); require(`${__hooks}/gamification-utils.js`).ensureProfile(tx, awardee); } }
		row.set('awardedPoints', points); tx.save(row); utils.statusEvent(tx, row, e.auth, before === 'DRAFT' ? 'SUBMITTED' : 'RESUBMITTED', before, 'DIAJUKAN', ''); result = row;
	});
	return e.json(200, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/verifier/stories', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER');
	const scope = e.request.url.query().get('scope') || 'queue';
	const filter = scope === 'all' ? 'status != "DRAFT"' : 'status = "DIAJUKAN" || status = "REVIEW" || status = "DISETUJUI"';
	const rows = e.app.findRecordsByFilter('stories', filter, scope === 'all' ? '-updated' : 'submittedAt', 0, 0);
	return e.json(200, { items: rows.map((row) => utils.storyDto(e.app, row, true)) });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/verifier/stories/{id}', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER'); const row = e.app.findRecordById('stories', e.request.pathValue('id')); if (row.getString('status') === 'DRAFT') throw new NotFoundError('Cerita tidak ditemukan.'); const reviews = e.app.findRecordsByFilter('story_reviews', 'story = {:story}', 'decidedAt', 0, 0, { story: row.id }).map((item) => ({ id: item.id, reviewerId: item.getString('reviewer'), reviewerName: item.getString('reviewerName'), decision: item.getString('decision'), note: item.getString('note'), sensitivityChecks: utils.arrayValue(item, 'sensitivityChecks'), decidedAt: item.getString('decidedAt') })); const events = e.app.findRecordsByFilter('story_status_events', 'story = {:story}', 'occurredAt', 0, 0, { story: row.id }).map((item) => ({ id: item.id, actorName: item.getString('actorName'), eventType: item.getString('eventType'), fromStatus: item.getString('fromStatus'), toStatus: item.getString('toStatus'), note: item.getString('note'), occurredAt: item.getString('occurredAt') })); return e.json(200, { story: utils.storyDto(e.app, row, true), reviews, events });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/verifier/stories/{id}/start-review', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER'); let result; e.app.runInTransaction((tx) => { const row = tx.findRecordById('stories', e.request.pathValue('id')); if (row.getString('status') !== 'DIAJUKAN') throw new BadRequestError('Naskah tidak lagi menunggu pemeriksaan.'); const now = new Date().toISOString(); row.set('status', 'REVIEW'); row.set('reviewer', e.auth.id); row.set('reviewedAt', now); tx.save(row); utils.statusEvent(tx, row, e.auth, 'REVIEW_STARTED', 'DIAJUKAN', 'REVIEW', ''); result = row; }); return e.json(200, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/verifier/stories/{id}/decision', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER'); const body = new DynamicModel({ decision: '', note: '', sensitivityChecks: [] }); e.bindBody(body); if (!['REQUEST_REVISION','APPROVE'].includes(body.decision)) throw new BadRequestError('Keputusan tidak dikenal.'); if (body.decision === 'REQUEST_REVISION' && String(body.note).trim().length < 5) throw new BadRequestError('Catatan revisi minimal 5 karakter.'); let result;
	e.app.runInTransaction((tx) => {
		const row = tx.findRecordById('stories', e.request.pathValue('id'));
		const before = row.getString('status');
		const revisiTerbit = body.decision === 'REQUEST_REVISION' && before === 'TERPUBLIKASI';
		if (before !== 'REVIEW' && !revisiTerbit) throw new BadRequestError('Naskah tidak dapat diputuskan pada status ini.');
		if (before === 'REVIEW' && row.getString('reviewer') !== e.auth.id) throw new ForbiddenError('Naskah sedang diperiksa Verifikator lain.');
		const awardee = tx.findRecordById('awardees', row.getString('author'));
		if (body.decision === 'APPROVE' && !awardee.getBool('consentActive')) throw new BadRequestError('Consent penulis sudah tidak aktif.');
		const checks = Array.isArray(body.sensitivityChecks) ? [...new Set(body.sensitivityChecks.map(Number))].sort((a,b)=>a-b) : [];
		if (body.decision === 'APPROVE' && (checks.length !== 21 || checks.some((value,index)=>value !== index + 1))) throw new BadRequestError('Seluruh checklist data sensitif wajib dikonfirmasi.');
		const now = new Date().toISOString(); const after = body.decision === 'APPROVE' ? 'DISETUJUI' : 'PERLU_REVISI';
		row.set('status', after); row.set('reviewedAt', now);
		if (after === 'DISETUJUI') { row.set('sensitivityScan', 'CLEAR'); row.set('pfValidation', { validatorId: e.auth.id, validatedAt: now }); }
		if (revisiTerbit) { row.set('sensitivityScan', 'MENUNGGU'); row.set('pfValidation', null); row.set('publishedAt', ''); row.set('publishedBy', ''); try { tx.delete(tx.findFirstRecordByData('story_public_covers', 'story', row.id)); } catch (_) {} }
		tx.save(row); utils.review(tx, row, e.auth, body.decision, body.note, checks); utils.statusEvent(tx, row, e.auth, body.decision === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED', before, after, body.note); result = row;
	}); return e.json(200, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/verifier/stories/{id}/publish', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER'); let result; e.app.runInTransaction((tx) => { const row = tx.findRecordById('stories', e.request.pathValue('id')); if (row.getString('status') !== 'DISETUJUI') throw new BadRequestError('Hanya naskah yang disetujui yang dapat diterbitkan.'); const awardee = tx.findRecordById('awardees', row.getString('author')); if (!awardee.getBool('consentActive') || !row.getBool('consentActive')) throw new BadRequestError('Consent penulis sudah tidak aktif.'); utils.validateSubmission(row); if (row.getString('sensitivityScan') !== 'CLEAR' || !utils.objectValue(row, 'pfValidation')) throw new BadRequestError('Validasi PF dan pemeriksaan data sensitif belum lengkap.'); const now = new Date().toISOString(); let cover; try { cover = tx.findFirstRecordByData('story_public_covers', 'story', row.id); } catch (_) { cover = new Record(tx.findCollectionByNameOrId('story_public_covers')); cover.set('story', row.id); } let fsys; try { fsys = tx.newFilesystem(); const file = fsys.getReuploadableFile(`${row.baseFilesPath()}/${row.getString('coverCandidate')}`, true); cover.set('image', file); cover.set('publishedAt', now); tx.save(cover); } finally { if (fsys) fsys.close(); } row.set('status', 'TERPUBLIKASI'); row.set('publishedAt', now); row.set('publishedBy', e.auth.id); tx.save(row); utils.review(tx, row, e.auth, 'PUBLISH', '', []); utils.statusEvent(tx, row, e.auth, 'PUBLISHED', 'DISETUJUI', 'TERPUBLIKASI', ''); result = row; }); return e.json(200, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/verifier/stories/{id}/archive', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'VERIFIER'); const body = new DynamicModel({ reason: '' }); e.bindBody(body); const allowed = ['DITOLAK','KEDALUWARSA','CONSENT_DICABUT','PERMINTAAN_ANGGOTA','IDLE_TIMEOUT']; if (!allowed.includes(body.reason)) throw new BadRequestError('Alasan arsip tidak dikenal.'); let result; e.app.runInTransaction((tx) => { const row = tx.findRecordById('stories', e.request.pathValue('id')); if (!['REVIEW','DISETUJUI','TERPUBLIKASI'].includes(row.getString('status'))) throw new BadRequestError('Naskah tidak dapat diarsipkan pada status ini.'); const before = row.getString('status'); row.set('status', 'DIARSIPKAN'); row.set('archiveReason', body.reason); row.set('archivedAt', new Date().toISOString()); tx.save(row); try { tx.delete(tx.findFirstRecordByData('story_public_covers', 'story', row.id)); } catch (_) {} utils.review(tx, row, e.auth, 'ARCHIVE', body.reason, []); utils.statusEvent(tx, row, e.auth, 'ARCHIVED', before, 'DIARSIPKAN', body.reason); result = row; }); return e.json(200, utils.storyDto(e.app, result, true));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/stories/consent/revoke', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'AWARDEE'); let withdrawn = 0; let blocked = 0; e.app.runInTransaction((tx) => { const awardee = tx.findFirstRecordByData('awardees', 'user', e.auth.id); awardee.set('consentActive', false); tx.save(awardee); for (const row of tx.findRecordsByFilter('stories', 'owner = {:owner}', '', 0, 0, { owner: e.auth.id })) { const before = row.getString('status'); row.set('consentActive', false); row.set('consentLegacyId', ''); if (['TERPUBLIKASI','DISETUJUI'].includes(before)) { row.set('status', 'DIARSIPKAN'); row.set('archiveReason', 'CONSENT_DICABUT'); row.set('archivedAt', new Date().toISOString()); try { tx.delete(tx.findFirstRecordByData('story_public_covers', 'story', row.id)); } catch (_) {} utils.statusEvent(tx, row, e.auth, 'CONSENT_REVOKED', before, 'DIARSIPKAN', 'CONSENT_DICABUT'); withdrawn++; } else { blocked++; } tx.save(row); } }); return e.json(200, { withdrawn, blocked });
}, $apis.requireAuth('users'));

onRecordViewRequest((e) => {
	if (e.auth && ['AWARDEE','VERIFIER'].includes(e.auth.getString('role'))) throw new ForbiddenError('Gunakan endpoint workflow Cerita untuk membaca naskah.');
	return e.next();
}, 'stories');
