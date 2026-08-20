routerAdd('POST', '/api/pfriends/registrations', (e) => {
	const { REGISTRATION_STATUS, CONSENT_VERSION, bodyOf, normalizeEmail, normalizeWhatsapp, required, validateRegistration, setProfileFields } = require(`${__hooks}/registration-utils.js`);
	const data = bodyOf(e);
	const proofs = e.findUploadedFiles('proofs');
	const normalized = validateRegistration(data, proofs, false);
	const email = normalizeEmail(data.email);
	const password = String(data.password || '');
	if (!/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestError('Alamat email tidak sah.');
	if (password.length < 8) throw new BadRequestError('Kata sandi minimal delapan karakter.');
	if (password !== String(data.passwordConfirm || '')) throw new BadRequestError('Konfirmasi kata sandi tidak cocok.');
	const whatsapp = normalizeWhatsapp(data.whatsapp);
	try { e.app.findAuthRecordByEmail('users', email); throw new BadRequestError('Email sudah terdaftar.'); } catch (error) { if (error instanceof BadRequestError) throw error; }
	try { e.app.findFirstRecordByData('awardee_registrations', 'whatsapp', whatsapp); throw new BadRequestError('Nomor WhatsApp sudah terdaftar.'); } catch (error) { if (error instanceof BadRequestError) throw error; }

	let registrationId = '';
	e.app.runInTransaction((tx) => {
		const user = new Record(tx.findCollectionByNameOrId('users'));
		user.set('email', email);
		user.set('password', password);
		user.set('passwordConfirm', password);
		user.set('emailVisibility', false);
		user.set('legacyAccountId', 'PB-' + email);
		user.set('awardeeId', '');
		user.set('role', 'AWARDEE');
		user.set('displayName', required(data.fullName, 'Nama lengkap', 3));
		user.set('unit', '');
		user.set('status', 'NONAKTIF');
		user.set('onboardingStatus', REGISTRATION_STATUS.PENDING);
		tx.save(user);

		const registration = new Record(tx.findCollectionByNameOrId('awardee_registrations'));
		registration.set('owner', user.id);
		registration.set('email', email);
		setProfileFields(registration, data, normalized);
		registration.set('whatsapp', whatsapp);
		registration.set('proofs', proofs);
		registration.set('consentVersion', CONSENT_VERSION);
		registration.set('consentedAt', new Date().toISOString());
		registration.set('status', REGISTRATION_STATUS.PENDING);
		registration.set('revisionCount', 0);
		registration.set('submittedAt', new Date().toISOString());
		tx.save(registration);
		registrationId = registration.id;
	});
	return e.json(201, { id: registrationId, status: REGISTRATION_STATUS.PENDING, message: 'Registrasi berhasil dikirim.' });
});

routerAdd('PATCH', '/api/pfriends/registrations/me', (e) => {
	const { REGISTRATION_STATUS, bodyOf, validateRegistration, setProfileFields } = require(`${__hooks}/registration-utils.js`);
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE') throw new ForbiddenError('Sesi Awardee diperlukan.');
	const registration = e.app.findFirstRecordByFilter('awardee_registrations', 'owner = {:owner}', { owner: e.auth.id });
	if (registration.getString('status') !== REGISTRATION_STATUS.CLARIFICATION) throw new BadRequestError('Registrasi tidak sedang menunggu klarifikasi.');
	const data = bodyOf(e);
	const proofs = e.findUploadedFiles('proofs');
	const normalized = validateRegistration(data, proofs, true);
	e.app.runInTransaction((tx) => {
		const current = tx.findRecordById('awardee_registrations', registration.id);
		setProfileFields(current, data, normalized);
		if (proofs.length > 0) current.set('proofs', proofs);
		current.set('status', REGISTRATION_STATUS.PENDING);
		current.set('reviewer', '');
		current.set('reviewerName', '');
		current.set('reviewNote', '');
		current.set('reviewedAt', '');
		current.set('submittedAt', new Date().toISOString());
		tx.save(current);
		const user = tx.findRecordById('users', e.auth.id);
		user.set('displayName', current.getString('fullName'));
		user.set('onboardingStatus', REGISTRATION_STATUS.PENDING);
		tx.save(user);
		const review = new Record(tx.findCollectionByNameOrId('registration_reviews'));
		review.set('registration', current.id);
		review.set('reviewer', e.auth.id);
		review.set('reviewerName', current.getString('fullName'));
		review.set('decision', 'RESUBMIT');
		review.set('note', 'Data dan bukti klarifikasi dikirim ulang oleh pendaftar.');
		review.set('decidedAt', new Date().toISOString());
		tx.save(review);
	});
	return e.json(200, { status: REGISTRATION_STATUS.PENDING, message: 'Klarifikasi berhasil dikirim ulang.' });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/registrations/{id}/decision', (e) => {
	const { REGISTRATION_STATUS, bodyOf, text } = require(`${__hooks}/registration-utils.js`);
	if (!e.auth || e.auth.getString('role') !== 'VERIFIER' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Hanya Verifikator aktif yang dapat memutuskan registrasi.');
	const data = bodyOf(e);
	const decision = text(data.decision);
	const note = text(data.note);
	if (['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT', 'REOPEN'].indexOf(decision) === -1) throw new BadRequestError('Keputusan tidak dikenal.');
	if (decision !== 'APPROVE' && note.length < 5) throw new BadRequestError('Catatan keputusan minimal lima karakter.');
	const id = e.request.pathValue('id');
	let nextStatus = '';
	e.app.runInTransaction((tx) => {
		const registration = tx.findRecordById('awardee_registrations', id);
		const before = registration.getString('status');
		if (decision === 'REOPEN' && before !== REGISTRATION_STATUS.REJECTED) throw new BadRequestError('Hanya registrasi ditolak yang dapat dibuka kembali.');
		if (decision !== 'REOPEN' && before !== REGISTRATION_STATUS.PENDING) throw new BadRequestError('Registrasi tidak lagi menunggu keputusan.');
		if (decision === 'APPROVE') nextStatus = REGISTRATION_STATUS.APPROVED;
		if (decision === 'REQUEST_CLARIFICATION' || decision === 'REOPEN') nextStatus = REGISTRATION_STATUS.CLARIFICATION;
		if (decision === 'REJECT') nextStatus = REGISTRATION_STATUS.REJECTED;

		const user = tx.findRecordById('users', registration.getString('owner'));
		if (decision === 'APPROVE') {
			let existing = null;
			try { existing = tx.findFirstRecordByData('awardees', 'user', user.id); } catch (_) {}
			if (!existing) {
				const awardee = new Record(tx.findCollectionByNameOrId('awardees'));
				const awardeeId = 'AWD-' + user.id.toUpperCase();
				awardee.set('user', user.id);
				awardee.set('legacyId', awardeeId);
				awardee.set('fullName', registration.getString('fullName'));
				awardee.set('email', registration.getString('email'));
				awardee.set('whatsapp', registration.getString('whatsapp'));
				awardee.set('community', registration.getString('community'));
				awardee.set('programPillar', registration.getString('programPillar'));
				awardee.set('chapterId', registration.getString('batch'));
				awardee.set('city', registration.getString('region'));
				awardee.set('university', registration.getString('university'));
				awardee.set('graduationYear', registration.getInt('graduationYear'));
				awardee.set('businessName', registration.getString('businessName'));
				awardee.set('businessSector', registration.getString('businessSector'));
				awardee.set('businessCity', registration.getString('businessCity'));
				awardee.set('status', 'AKTIF');
				awardee.set('consentActive', true);
				awardee.set('joinedAt', new Date().toISOString());
				tx.save(awardee);
				user.set('awardeeId', awardeeId);
			}
			user.set('status', 'AKTIF');
		} else {
			user.set('status', 'NONAKTIF');
		}
		user.set('onboardingStatus', nextStatus);
		tx.save(user);

		registration.set('status', nextStatus);
		registration.set('reviewer', e.auth.id);
		registration.set('reviewerName', e.auth.getString('displayName'));
		registration.set('reviewNote', note);
		registration.set('reviewedAt', new Date().toISOString());
		if (nextStatus === REGISTRATION_STATUS.CLARIFICATION) registration.set('revisionCount', registration.getInt('revisionCount') + 1);
		tx.save(registration);

		const review = new Record(tx.findCollectionByNameOrId('registration_reviews'));
		review.set('registration', registration.id);
		review.set('reviewer', e.auth.id);
		review.set('reviewerName', e.auth.getString('displayName'));
		review.set('decision', decision);
		review.set('note', note);
		review.set('decidedAt', new Date().toISOString());
		tx.save(review);
	});
	return e.json(200, { status: nextStatus, message: 'Keputusan registrasi tersimpan.' });
}, $apis.requireAuth('users'));

// TODO(SSO): ganti login password staf dengan authWithOAuth2 setelah provider,
// domain korporat, dan pemetaan claim role disepakati. Selama SSO belum tersedia,
// login password staf tetap aktif. Set PB_REQUIRE_STAFF_SSO=1 saat provider SSO
// sudah siap untuk mematikan jalur password staf.
onRecordAuthWithPasswordRequest((e) => {
	if (e.record) {
		const role = e.record.getString('role');
		const staff = role === 'VERIFIER' || role === 'ADMIN';
		if (staff && $os.getenv('PB_REQUIRE_STAFF_SSO') === '1') {
			throw new ForbiddenError('Login staf menggunakan SSO dan belum tersedia pada lingkungan ini.');
		}
	}
	e.next();
}, 'users');
