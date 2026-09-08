const ACCOUNT_STATUSES = ['AKTIF', 'TERKUNCI', 'NONAKTIF'];
const MEMBERSHIP_STATUSES = ['AKTIF', 'NONAKTIF'];

function requireAdmin(e) {
	if (!e.auth || e.auth.getString('role') !== 'ADMIN' || e.auth.getString('status') !== 'AKTIF') {
		throw new ForbiddenError('Akses hanya tersedia untuk Admin aktif.');
	}
}

function dto(app, awardee) {
	const user = app.findRecordById('users', awardee.getString('user'));
	let profile = null;
	try { profile = app.findFirstRecordByData('gamification_profiles', 'awardee', awardee.id); } catch (_) {}
	return {
		id: awardee.id,
		legacyId: awardee.getString('legacyId'),
		userId: user.id,
		name: awardee.getString('fullName'),
		email: awardee.getString('email'),
		community: awardee.getString('community'),
		chapterId: awardee.getString('chapterId'),
		city: awardee.getString('city'),
		programPillar: awardee.getString('programPillar'),
		accountStatus: user.getString('status'),
		membershipStatus: awardee.getString('status'),
		lastLoginAt: user.getString('lastLoginAt') || null,
		joinedAt: awardee.getString('joinedAt') || null,
		totalPoints: profile ? profile.getInt('totalPoints') : 0,
		tierLevel: profile ? profile.getString('tierLevel') : ''
	};
}

function userDto(user) {
	return {
		id: user.id,
		collectionId: user.collection().id,
		collectionName: user.collection().name,
		email: user.email(),
		legacyAccountId: user.getString('legacyAccountId'),
		awardeeId: user.getString('awardeeId'),
		role: user.getString('role'),
		displayName: user.getString('displayName'),
		unit: user.getString('unit'),
		status: user.getString('status'),
		onboardingStatus: user.getString('onboardingStatus')
	};
}

function addAction(app, actor, awardee, action, data) {
	const row = new Record(app.findCollectionByNameOrId('admin_awardee_actions'));
	row.set('actor', actor.id);
	row.set('actorName', actor.getString('displayName'));
	row.set('awardee', awardee.id);
	row.set('targetUser', awardee.getString('user'));
	row.set('action', action);
	row.set('fromStatus', data.fromStatus || '');
	row.set('toStatus', data.toStatus || '');
	row.set('reason', data.reason || '');
	row.set('sessionKey', data.sessionKey || '');
	row.set('occurredAt', data.occurredAt || new Date().toISOString());
	row.set('expiresAt', data.expiresAt || '');
	app.save(row);
	return row;
}

function actionDto(row) {
	return {
		id: row.id,
		actorName: row.getString('actorName'),
		action: row.getString('action'),
		fromStatus: row.getString('fromStatus') || null,
		toStatus: row.getString('toStatus') || null,
		reason: row.getString('reason') || null,
		occurredAt: row.getString('occurredAt'),
		expiresAt: row.getString('expiresAt') || null,
		endedAt: row.getString('endedAt') || null
	};
}

module.exports = { ACCOUNT_STATUSES, MEMBERSHIP_STATUSES, requireAdmin, dto, userDto, addAction, actionDto };
