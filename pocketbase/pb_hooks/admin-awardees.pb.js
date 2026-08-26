routerAdd('GET', '/api/pfriends/admin/awardees', (e) => {
	const utils = require(`${__hooks}/admin-awardee-utils.js`); utils.requireAdmin(e);
	const query = e.request.url.query();
	const page = Math.max(1, Number(query.get('page') || 1));
	const perPage = Math.min(50, Math.max(1, Number(query.get('perPage') || 20)));
	const keyword = String(query.get('q') || '').trim().toLowerCase();
	const accountStatus = String(query.get('accountStatus') || '');
	const membershipStatus = String(query.get('membershipStatus') || '');
	const community = String(query.get('community') || '');
	const chapter = String(query.get('chapter') || '');
	const all = e.app.findRecordsByFilter('awardees', 'id != ""', 'fullName', 0, 0);
	const mapped = all.map((row) => utils.dto(e.app, row));
	const filtered = mapped.filter((row) => {
		if (accountStatus && row.accountStatus !== accountStatus) return false;
		if (membershipStatus && row.membershipStatus !== membershipStatus) return false;
		if (community && row.community !== community) return false;
		if (chapter && row.chapterId !== chapter) return false;
		if (!keyword) return true;
		return `${row.name} ${row.email} ${row.legacyId} ${row.city} ${row.community} ${row.chapterId}`.toLowerCase().includes(keyword);
	});
	const offset = (page - 1) * perPage;
	return e.json(200, {
		items: filtered.slice(offset, offset + perPage),
		page, perPage, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
		stats: {
			total: mapped.length,
			activeAccounts: mapped.filter((row) => row.accountStatus === 'AKTIF').length,
			inactiveMemberships: mapped.filter((row) => row.membershipStatus === 'NONAKTIF').length,
			everLoggedIn: mapped.filter((row) => row.lastLoginAt).length
		}
	});
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/admin/awardees/{id}/history', (e) => {
	const utils = require(`${__hooks}/admin-awardee-utils.js`); utils.requireAdmin(e);
	const awardee = e.app.findRecordById('awardees', e.request.pathValue('id'));
	const rows = e.app.findRecordsByFilter('admin_awardee_actions', 'awardee = {:awardee}', '-occurredAt', 100, 0, { awardee: awardee.id });
	return e.json(200, { awardee: utils.dto(e.app, awardee), items: rows.map(utils.actionDto) });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/admin/awardees/{id}/account-status', (e) => {
	const utils = require(`${__hooks}/admin-awardee-utils.js`); utils.requireAdmin(e);
	const body = new DynamicModel({ status: '', reason: '' }); e.bindBody(body);
	if (!utils.ACCOUNT_STATUSES.includes(body.status)) throw new BadRequestError('Status akun tidak dikenal.');
	if (String(body.reason).trim().length < 10) throw new BadRequestError('Alasan perubahan minimal 10 karakter.');
	let result;
	e.app.runInTransaction((tx) => {
		const awardee = tx.findRecordById('awardees', e.request.pathValue('id'));
		const user = tx.findRecordById('users', awardee.getString('user'));
		const before = user.getString('status');
		if (before === body.status) throw new BadRequestError('Status akun sudah sesuai pilihan.');
		user.set('status', body.status);
		if (body.status !== 'AKTIF') user.refreshTokenKey();
		tx.save(user);
		utils.addAction(tx, e.auth, awardee, 'ACCOUNT_STATUS_CHANGED', { fromStatus: before, toStatus: body.status, reason: String(body.reason).trim() });
		result = awardee;
	});
	return e.json(200, utils.dto(e.app, result));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/admin/awardees/{id}/membership-status', (e) => {
	const utils = require(`${__hooks}/admin-awardee-utils.js`); utils.requireAdmin(e);
	const body = new DynamicModel({ status: '', reason: '' }); e.bindBody(body);
	if (!utils.MEMBERSHIP_STATUSES.includes(body.status)) throw new BadRequestError('Status keanggotaan tidak dikenal.');
	if (String(body.reason).trim().length < 10) throw new BadRequestError('Alasan perubahan minimal 10 karakter.');
	let result;
	e.app.runInTransaction((tx) => {
		const awardee = tx.findRecordById('awardees', e.request.pathValue('id'));
		const before = awardee.getString('status');
		if (before === body.status) throw new BadRequestError('Status keanggotaan sudah sesuai pilihan.');
		awardee.set('status', body.status); tx.save(awardee);
		utils.addAction(tx, e.auth, awardee, 'MEMBERSHIP_STATUS_CHANGED', { fromStatus: before, toStatus: body.status, reason: String(body.reason).trim() });
		result = awardee;
	});
	return e.json(200, utils.dto(e.app, result));
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/admin/awardees/{id}/impersonate', (e) => {
	const utils = require(`${__hooks}/admin-awardee-utils.js`); utils.requireAdmin(e);
	const awardee = e.app.findRecordById('awardees', e.request.pathValue('id'));
	const user = e.app.findRecordById('users', awardee.getString('user'));
	if (user.getString('role') !== 'AWARDEE' || user.getString('status') !== 'AKTIF') throw new BadRequestError('Hanya akun Awardee aktif yang dapat dibuka.');
	const now = new Date(); const expires = new Date(now.getTime() + 30 * 60 * 1000);
	const sessionKey = $security.randomString(32);
	const action = utils.addAction(e.app, e.auth, awardee, 'IMPERSONATION_STARTED', { sessionKey, occurredAt: now.toISOString(), expiresAt: expires.toISOString() });
	return e.json(200, { token: user.newStaticAuthToken(1800 * 1000000000), record: utils.userDto(user), impersonation: { id: action.id, awardeeId: awardee.id, awardeeName: awardee.getString('fullName'), expiresAt: expires.toISOString() } });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/admin/impersonations/{id}/end', (e) => {
	if (!e.auth || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Sesi tidak aktif.');
	const row = e.app.findRecordById('admin_awardee_actions', e.request.pathValue('id'));
	const ownsSession = row.getString('actor') === e.auth.id || row.getString('targetUser') === e.auth.id;
	if (!ownsSession || row.getString('action') !== 'IMPERSONATION_STARTED') throw new ForbiddenError('Sesi impersonasi tidak ditemukan.');
	if (!row.getString('endedAt')) { row.set('endedAt', new Date().toISOString()); e.app.save(row); }
	return e.json(200, { endedAt: row.getString('endedAt') });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/session/me', (e) => {
	if (!e.auth || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Sesi tidak aktif.');
	return e.json(200, { record: require(`${__hooks}/admin-awardee-utils.js`).userDto(e.auth) });
}, $apis.requireAuth('users'));

onRecordAuthRequest((e) => {
	const role = e.record.getString('role');
	const onboardingStatus = e.record.getString('onboardingStatus');
	const applicantStatuses = ['PENDING', 'CLARIFICATION', 'REJECTED'];
	const isApplicant = role === 'AWARDEE' && applicantStatuses.indexOf(onboardingStatus) !== -1;
	if (e.record.getString('status') !== 'AKTIF' && !isApplicant) throw new ForbiddenError('Akun tidak aktif.');
	if (e.authMethod !== 'refresh') { e.record.set('lastLoginAt', new Date().toISOString()); e.app.save(e.record); }
	e.next();
}, 'users');
