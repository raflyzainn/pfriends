onRecordCreateRequest((e) => {
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE') throw new ForbiddenError('Hanya Awardee yang dapat mengirim bukti.');
	if (e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Akun Awardee tidak aktif.');
	if (!e.auth.getString('awardeeId')) throw new BadRequestError('Profil Awardee belum terhubung.');
	e.record.set('owner', e.auth.id);
	e.record.set('awardeeId', e.auth.getString('awardeeId'));
	e.record.set('awardeeName', e.auth.getString('displayName'));
	e.record.set('status', 'SUBMITTED');
	e.record.set('revisionCount', 0);
	e.record.set('reviewer', ''); e.record.set('reviewNote', ''); e.record.set('reviewStartedAt', ''); e.record.set('reviewedAt', ''); e.record.set('awardedPoints', 0);
	e.record.set('submittedAt', new Date().toISOString());
	const action = require(`${__hooks}/point-action-utils.js`).resolve(e.app, e.record, true);
	if (action.getString('workflow') !== 'EVIDENCE') throw new BadRequestError('Aksi ini tidak diajukan melalui Bukti Keaktifan.');
	e.record.set('pointAction', action.id); e.record.set('actionCode', action.getString('code'));
	if (action.getBool('isCore')) e.record.set('activityType', action.getString('code'));
	if (e.record.getString('activityType') === 'SESSION_ATTEND') {
		const eventId = e.record.getString('event');
		if (!eventId) throw new BadRequestError('Bukti hadir wajib terhubung ke event.');
		const event = e.app.findRecordById('events', eventId);
		if (!['TERJADWAL','BERLANGSUNG','SELESAI'].includes(event.getString('status')) || new Date(event.getString('endsAt')) > new Date()) throw new BadRequestError('Bukti hadir baru dapat dikirim setelah event selesai.');
		const participant = e.app.findFirstRecordByFilter('event_participants', 'event = {:event} && owner = {:owner}', { event: eventId, owner: e.auth.id });
		e.record.set('eventParticipant', participant.id); e.record.set('activityDate', event.getString('endsAt')); e.record.set('title', `Kehadiran: ${event.getString('title')}`); e.record.set('description', `Bukti kehadiran pada event ${event.getString('title')}.`);
	} else if (['SHARE_PRIVATE','SHARE_PUBLIC'].includes(e.record.getString('activityType'))) {
		const id=e.record.getString('broadcast'); if(!id) throw new BadRequestError('Bukti share wajib terhubung ke kabar.'); const broadcast=e.app.findRecordById('broadcasts',id); if(broadcast.getString('status')!=='TERKIRIM') throw new BadRequestError('Kabar belum diterbitkan.'); const isPublic=e.record.getString('activityType')==='SHARE_PUBLIC'; if(isPublic&&!e.record.getString('externalUrl')) throw new BadRequestError('Tautan unggahan wajib diisi.'); e.record.set('title',`${isPublic?'Share publik':'Share WhatsApp'}: ${broadcast.getString('title')}`); e.record.set('description',`Bukti amplifikasi kabar ${broadcast.getString('title')}.`); e.record.set('event',''); e.record.set('eventParticipant','');
	} else { e.record.set('event', ''); e.record.set('eventParticipant', ''); e.record.set('broadcast',''); }
	e.next();
}, 'activity_submissions');

onRecordUpdateRequest((e) => {
	if (!e.auth || e.auth.id !== e.record.getString('owner') || e.record.original().getString('status') !== 'NEEDS_REVISION') {
		throw new ForbiddenError('Pengajuan ini tidak dapat diperbarui.');
	}
	for (const field of ['owner','awardeeId','awardeeName','activityType','pointAction','actionCode','event','eventParticipant','broadcast','status','revisionCount','reviewer','reviewNote','reviewStartedAt','reviewedAt','awardedPoints']) {
		e.record.set(field, e.record.original().get(field));
	}
	e.record.set('status', 'SUBMITTED');
	e.record.set('reviewer', '');
	e.record.set('reviewStartedAt', '');
		e.record.set('submittedAt', new Date().toISOString());
		if (e.record.getString('eventParticipant')) { const participant = e.app.findRecordById('event_participants', e.record.getString('eventParticipant')); participant.set('attendanceStatus', 'SUBMITTED'); e.app.save(participant); }
	e.next();
}, 'activity_submissions');

onRecordAfterCreateSuccess((e) => {
	if (e.record.getString('eventParticipant')) { const participant = e.app.findRecordById('event_participants', e.record.getString('eventParticipant')); participant.set('attendanceStatus', 'SUBMITTED'); e.app.save(participant); }
	const event = new Record(e.app.findCollectionByNameOrId('submission_status_events'));
	event.set('submission', e.record.id); event.set('actor', e.record.getString('owner')); event.set('actorName', e.record.getString('awardeeName')); event.set('eventType', 'SUBMITTED'); event.set('toStatus', 'SUBMITTED'); event.set('occurredAt', e.record.getString('submittedAt'));
	e.app.save(event);
	e.next();
}, 'activity_submissions');

onRecordAfterUpdateSuccess((e) => {
	if (e.record.original().getString('status') === 'NEEDS_REVISION' && e.record.getString('status') === 'SUBMITTED') {
		const event = new Record(e.app.findCollectionByNameOrId('submission_status_events'));
		event.set('submission', e.record.id); event.set('actor', e.record.getString('owner')); event.set('actorName', e.record.getString('awardeeName')); event.set('eventType', 'RESUBMITTED'); event.set('fromStatus', 'NEEDS_REVISION'); event.set('toStatus', 'SUBMITTED'); event.set('occurredAt', e.record.getString('submittedAt'));
		e.app.save(event);
	}
	e.next();
}, 'activity_submissions');

routerAdd('POST', '/api/pfriends/activity-submissions/{id}/start-review', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'VERIFIER' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Hanya Verifikator aktif yang dapat memulai pemeriksaan.');
	const id = e.request.pathValue('id');
	let response = null;
	e.app.runInTransaction((tx) => {
		const submission = tx.findRecordById('activity_submissions', id);
		if (submission.getString('status') !== 'SUBMITTED') throw new BadRequestError('Pengajuan tidak lagi menunggu pemeriksaan.');
		const now = new Date().toISOString();
		submission.set('status', 'IN_REVIEW');
		submission.set('reviewer', e.auth.id);
		submission.set('reviewStartedAt', now);
		tx.save(submission);
		if (submission.getString('eventParticipant')) { const participant = tx.findRecordById('event_participants', submission.getString('eventParticipant')); participant.set('attendanceStatus', 'IN_REVIEW'); tx.save(participant); }
		const event = new Record(tx.findCollectionByNameOrId('submission_status_events'));
		event.set('submission', submission.id); event.set('actor', e.auth.id); event.set('actorName', e.auth.getString('displayName')); event.set('eventType', 'REVIEW_STARTED'); event.set('fromStatus', 'SUBMITTED'); event.set('toStatus', 'IN_REVIEW'); event.set('occurredAt', now);
		tx.save(event);
		response = submission;
	});
	return e.json(200, response);
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/activity-submissions/{id}/review', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'VERIFIER' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Hanya Verifikator aktif yang dapat memutuskan bukti.');
	const body = new DynamicModel({ decision: '', note: '' });
	e.bindBody(body);
	if (body.decision !== 'APPROVE' && body.decision !== 'REQUEST_REVISION') throw new BadRequestError('Keputusan tidak dikenal.');
	if (body.decision === 'REQUEST_REVISION' && String(body.note || '').trim().length < 5) throw new BadRequestError('Catatan revisi minimal 5 karakter.');
	const id = e.request.pathValue('id');
	let response = null;
	e.app.runInTransaction((tx) => {
		const submission = tx.findRecordById('activity_submissions', id);
		if (submission.getString('status') !== 'IN_REVIEW') throw new BadRequestError('Pengajuan harus mulai diperiksa sebelum diputuskan.');
		const now = new Date().toISOString();
		const reviews = tx.findCollectionByNameOrId('submission_reviews');
		const review = new Record(reviews);
		review.set('submission', id); review.set('reviewer', e.auth.id); review.set('reviewerName', e.auth.getString('displayName')); review.set('decision', body.decision); review.set('note', String(body.note || '').trim()); review.set('decidedAt', now);
		tx.save(review);
		if (body.decision === 'REQUEST_REVISION') {
			submission.set('status', 'NEEDS_REVISION'); submission.set('revisionCount', submission.getInt('revisionCount') + 1); submission.set('awardedPoints', 0);
		} else {
			const actionUtils = require(`${__hooks}/point-action-utils.js`);
			const action = actionUtils.resolve(tx, submission, true);
			const type = action.getString('code');
			const awardeeId = submission.getString('awardeeId');
			const date = submission.getString('activityDate').slice(0, 10);
			const count = tx.findRecordsByFilter('verified_point_activities', 'awardeeId = {:awardee} && (actionCode = {:type} || activityType = {:type}) && occurredAt >= {:start} && occurredAt <= {:end}', '', 0, 0, { awardee: awardeeId, type, start: date + ' 00:00:00.000Z', end: date + ' 23:59:59.999Z' }).length;
			const capped = count >= action.getInt('dailyCap');
			const points = capped ? 0 : action.getInt('points');
			const ledger = new Record(tx.findCollectionByNameOrId('verified_point_activities'));
			ledger.set('submission', id); ledger.set('user', submission.getString('owner')); ledger.set('source', 'EVIDENCE'); ledger.set('awardeeId', awardeeId); actionUtils.attach(ledger, action); ledger.set('points', points); ledger.set('capReason', capped ? 'DAILY_CAP' : ''); ledger.set('occurredAt', submission.getString('activityDate')); ledger.set('awardedAt', now); ledger.set('status', 'AWARDED');
			if (submission.getString('broadcast')) ledger.set('broadcast', submission.getString('broadcast'));
			tx.save(ledger);
			submission.set('status', 'APPROVED'); submission.set('awardedPoints', points);
		}
		if (submission.getString('eventParticipant')) { const participant = tx.findRecordById('event_participants', submission.getString('eventParticipant')); participant.set('attendanceStatus', body.decision === 'APPROVE' ? 'APPROVED' : 'NEEDS_REVISION'); if (body.decision === 'APPROVE') participant.set('attendedAt', now); tx.save(participant); }
		submission.set('reviewer', e.auth.id); submission.set('reviewNote', String(body.note || '').trim()); submission.set('reviewedAt', now);
		tx.save(submission);
		const event = new Record(tx.findCollectionByNameOrId('submission_status_events'));
		event.set('submission', submission.id); event.set('actor', e.auth.id); event.set('actorName', e.auth.getString('displayName')); event.set('eventType', body.decision === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED'); event.set('fromStatus', 'IN_REVIEW'); event.set('toStatus', submission.getString('status')); event.set('note', String(body.note || '').trim()); event.set('occurredAt', now);
		tx.save(event);
		response = submission;
	});
	return e.json(200, response);
}, $apis.requireAuth('users'));
