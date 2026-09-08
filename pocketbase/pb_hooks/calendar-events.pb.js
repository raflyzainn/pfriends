function eventSlug(value) {
	return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function requireRole(e, role) {
	if (!e.auth || e.auth.getString('role') !== role || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError(`Hanya ${role === 'AWARDEE' ? 'Awardee' : 'Verifikator'} aktif yang dapat melakukan tindakan ini.`);
}

function eventJson(app, record, auth) {
	const participants = app.findRecordsByFilter('event_participants', 'event = {:event}', '', 0, 0, { event: record.id });
	const mine = auth ? participants.find((row) => row.getString('owner') === auth.id) : null;
	return {
		id: record.id, title: record.getString('title'), slug: record.getString('slug'), type: record.getString('type'), status: record.getString('status'), description: record.getString('description'), speakerName: record.getString('speakerName'), chapterId: record.getString('chapterId'), community: record.getString('community'), location: record.getString('location'), isOnline: record.getBool('isOnline'), startsAt: record.getString('startsAt'), endsAt: record.getString('endsAt'), quota: record.getInt('quota'), proposedBy: record.getString('proposedBy'), proposedByName: record.getString('proposedByName'), proposedByAwardeeId: record.getString('proposedByAwardeeId'), submittedAt: record.getString('submittedAt'), reviewedBy: record.getString('reviewedBy'), reviewedAt: record.getString('reviewedAt'), reviewNote: record.getString('reviewNote'), publishedAt: record.getString('publishedAt'), outcomeNote: record.getString('outcomeNote'), registeredCount: participants.length, attendeeCount: participants.filter((row) => row.getString('attendanceStatus') === 'APPROVED').length, myParticipant: mine ? { id: mine.id, awardeeId: mine.getString('awardeeId'), attendanceStatus: mine.getString('attendanceStatus'), registeredAt: mine.getString('registeredAt'), attendedAt: mine.getString('attendedAt') } : null
	};
}

routerAdd('GET', '/api/pfriends/events', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`);
	const role = e.auth ? e.auth.getString('role') : '';
	let filter = 'status = "TERJADWAL" || status = "BERLANGSUNG" || status = "SELESAI"';
	if (role === 'VERIFIER') filter = 'id != ""';
	else if (role === 'AWARDEE') filter = `(${filter}) || proposedBy = {:owner}`;
	const records = e.app.findRecordsByFilter('events', filter, 'startsAt', 0, 0, { owner: e.auth ? e.auth.id : '' });
	return e.json(200, { items: records.map((record) => calendar.eventJson(e.app, record, e.auth)) });
});

routerAdd('POST', '/api/pfriends/events', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`); calendar.requireRole(e, 'AWARDEE');
	const body = new DynamicModel({ title: '', type: '', description: '', speakerName: '', chapterId: '', community: '', location: '', isOnline: false, startsAt: '', endsAt: '', quota: 0 });
	e.bindBody(body);
	const start = new Date(body.startsAt); const end = new Date(body.endsAt);
	if (String(body.title).trim().length < 10 || String(body.description).trim().length < 40 || !String(body.location).trim()) throw new BadRequestError('Judul, deskripsi, dan lokasi kegiatan belum lengkap.');
	if (!['UPSKILLING','PERTEMUAN','SHARING'].includes(body.type)) throw new BadRequestError('Jenis kegiatan tidak dikenal.');
	if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start || start <= new Date()) throw new BadRequestError('Waktu kegiatan harus sah dan berada di masa depan.');
	let result = null;
	e.app.runInTransaction((tx) => {
		const record = new Record(tx.findCollectionByNameOrId('events'));
		const base = calendar.eventSlug(body.title) || `event-${Date.now()}`;
		let slug = base; try { tx.findFirstRecordByData('events', 'slug', slug); slug = `${base}-${Date.now().toString(36)}`; } catch (_) {}
		record.set('title', String(body.title).trim()); record.set('slug', slug); record.set('type', body.type); record.set('status', 'DIUSULKAN'); record.set('description', String(body.description).trim()); record.set('speakerName', String(body.speakerName || '').trim()); record.set('chapterId', String(body.chapterId || '')); record.set('community', String(body.community || e.auth.getString('community') || '')); record.set('location', String(body.location).trim()); record.set('isOnline', Boolean(body.isOnline)); record.set('startsAt', start.toISOString()); record.set('endsAt', end.toISOString()); record.set('quota', Math.max(0, Number(body.quota) || 0)); record.set('proposedBy', e.auth.id); record.set('proposedByName', e.auth.getString('displayName')); record.set('proposedByAwardeeId', e.auth.getString('awardeeId')); record.set('submittedAt', new Date().toISOString()); tx.save(record); result = record;
	});
	return e.json(201, result);
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/events/{id}/decision', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`); calendar.requireRole(e, 'VERIFIER');
	const body = new DynamicModel({ decision: '', note: '' }); e.bindBody(body);
	if (!['APPROVE','REJECT'].includes(body.decision)) throw new BadRequestError('Keputusan tidak dikenal.');
	if (body.decision === 'REJECT' && String(body.note || '').trim().length < 5) throw new BadRequestError('Alasan penolakan minimal 5 karakter.');
	let result = null; e.app.runInTransaction((tx) => {
		const record = tx.findRecordById('events', e.request.pathValue('id'));
		if (record.getString('status') !== 'DIUSULKAN') throw new BadRequestError('Usulan tidak lagi menunggu keputusan.');
		if (record.getString('proposedBy') === e.auth.id) throw new ForbiddenError('Pengusul tidak boleh memutuskan usulannya sendiri.');
		const now = new Date().toISOString(); record.set('status', body.decision === 'APPROVE' ? 'TERJADWAL' : 'DITOLAK'); record.set('reviewedBy', e.auth.id); record.set('reviewedAt', now); record.set('reviewNote', String(body.note || '').trim()); if (body.decision === 'APPROVE') record.set('publishedAt', now); tx.save(record); result = record;
	}); return e.json(200, result);
}, $apis.requireAuth('users'));

routerAdd('PATCH', '/api/pfriends/events/{id}', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`); calendar.requireRole(e, 'VERIFIER');
	const body = new DynamicModel({ title: '', type: '', description: '', location: '', isOnline: false, startsAt: '', endsAt: '', quota: 0, outcomeNote: '' }); e.bindBody(body);
	const start = new Date(body.startsAt); const end = new Date(body.endsAt); if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) throw new BadRequestError('Rentang waktu tidak sah.');
	const record = e.app.findRecordById('events', e.request.pathValue('id')); for (const field of ['title','type','description','location','outcomeNote']) if (body[field] !== undefined) record.set(field, String(body[field] || '').trim()); record.set('isOnline', Boolean(body.isOnline)); record.set('startsAt', start.toISOString()); record.set('endsAt', end.toISOString()); record.set('quota', Math.max(0, Number(body.quota) || 0)); e.app.save(record); return e.json(200, record);
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/events/{id}/transition', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`); calendar.requireRole(e, 'VERIFIER'); const body = new DynamicModel({ status: '', note: '' }); e.bindBody(body);
	const allowed = { TERJADWAL: ['BERLANGSUNG','DIBATALKAN'], BERLANGSUNG: ['SELESAI','DIBATALKAN'] };
	const record = e.app.findRecordById('events', e.request.pathValue('id')); if (!(allowed[record.getString('status')] || []).includes(body.status)) throw new BadRequestError('Transisi status kegiatan tidak sah.'); if (body.status === 'DIBATALKAN' && String(body.note || '').trim().length < 5) throw new BadRequestError('Alasan pembatalan minimal 5 karakter.'); record.set('status', body.status); record.set('reviewedBy', e.auth.id); record.set('reviewedAt', new Date().toISOString()); record.set('reviewNote', String(body.note || '').trim()); e.app.save(record); return e.json(200, record);
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/events/{id}/register', (e) => {
	const calendar = require(`${__hooks}/calendar-utils.js`); calendar.requireRole(e, 'AWARDEE'); let result = null; e.app.runInTransaction((tx) => {
		const event = tx.findRecordById('events', e.request.pathValue('id')); if (event.getString('status') !== 'TERJADWAL' || new Date(event.getString('startsAt')) <= new Date()) throw new BadRequestError('Pendaftaran kegiatan sudah ditutup.');
		try { tx.findFirstRecordByFilter('event_participants', 'event = {:event} && owner = {:owner}', { event: event.id, owner: e.auth.id }); throw new BadRequestError('Anda sudah terdaftar pada kegiatan ini.'); } catch (error) { if (error instanceof BadRequestError) throw error; }
		const quota = event.getInt('quota'); if (quota > 0 && tx.findRecordsByFilter('event_participants', 'event = {:event}', '', 0, 0, { event: event.id }).length >= quota) throw new BadRequestError('Kuota kegiatan sudah penuh.');
		const participant = new Record(tx.findCollectionByNameOrId('event_participants')); participant.set('event', event.id); participant.set('owner', e.auth.id); participant.set('awardeeId', e.auth.getString('awardeeId')); participant.set('awardeeName', e.auth.getString('displayName')); participant.set('registeredAt', new Date().toISOString()); participant.set('attendanceStatus', 'NOT_SUBMITTED'); tx.save(participant); result = participant;
	}); return e.json(201, result);
}, $apis.requireAuth('users'));
