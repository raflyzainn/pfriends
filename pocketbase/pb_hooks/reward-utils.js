const BADGE_BONUS = { UMUM: 25, LANGKA: 75, EPIK: 200, LEGENDARIS: 500 };

function findOne(app, collection, filter, params) {
	try { return app.findFirstRecordByFilter(collection, filter, params || {}); } catch (_) { return null; }
}

function addTransaction(app, awardee, sourceKey, type, amount, referenceId, note, occurredAt) {
	if (findOne(app, 'coin_transactions', 'sourceKey = {:key}', { key: sourceKey })) return;
	const collection = app.findCollectionByNameOrId('coin_transactions');
	const row = new Record(collection);
	row.set('awardee', awardee.id); row.set('user', awardee.getString('user'));
	row.set('sourceKey', sourceKey); row.set('type', type); row.set('amount', amount);
	row.set('referenceId', referenceId || ''); row.set('note', note || '');
	row.set('occurredAt', occurredAt || new Date().toISOString());
	app.save(row);
}

function recalculateAccount(app, awardee) {
	const rows = app.findRecordsByFilter('coin_transactions', 'awardee = {:awardee}', 'occurredAt', 0, 0, { awardee: awardee.id });
	const balance = rows.reduce((sum, row) => sum + row.getInt('amount'), 0);
	const earned = rows.filter((row) => row.getInt('amount') > 0).reduce((sum, row) => sum + row.getInt('amount'), 0);
	const spent = -rows.filter((row) => row.getInt('amount') < 0).reduce((sum, row) => sum + row.getInt('amount'), 0);
	let account = findOne(app, 'coin_accounts', 'awardee = {:awardee}', { awardee: awardee.id });
	if (!account) account = new Record(app.findCollectionByNameOrId('coin_accounts'));
	account.set('awardee', awardee.id); account.set('user', awardee.getString('user'));
	account.set('balance', balance); account.set('lifetimeEarned', earned); account.set('lifetimeSpent', spent);
	account.set('recalculatedAt', new Date().toISOString()); app.save(account);
	return account;
}

function syncWallet(app, awardee) {
	const legacyId = awardee.getString('legacyId');
	const points = app.findRecordsByFilter('verified_point_activities', 'awardeeId = {:id}', 'occurredAt', 0, 0, { id: legacyId });
	for (const row of points) {
		addTransaction(app, awardee, `POINT:${row.id}`, 'POINT_CREDIT', row.getInt('points'), row.id, 'Koin dari poin terverifikasi.', row.getString('awardedAt') || row.getString('occurredAt'));
		if (row.getString('status') === 'REVOKED') addTransaction(app, awardee, `POINT_REVOKE:${row.id}`, 'POINT_REVERSAL', -row.getInt('points'), row.id, row.getString('revokeReason'), row.getString('revokedAt'));
	}
	const badges = app.findRecordsByFilter('awardee_badges', 'awardee = {:awardee}', 'awardedAt', 0, 0, { awardee: awardee.id });
	for (const row of badges) {
		const badge = app.findRecordById('badges', row.getString('badge'));
		const bonus = BADGE_BONUS[badge.getString('rarity')] || 0;
		addTransaction(app, awardee, `BADGE:${row.id}`, 'BADGE_BONUS', bonus, row.id, `Bonus lencana ${badge.getString('name')}.`, row.getString('awardedAt'));
		if (row.getString('status') === 'REVOKED') addTransaction(app, awardee, `BADGE_REVOKE:${row.id}`, 'BADGE_REVERSAL', -bonus, row.id, `Pencabutan bonus lencana ${badge.getString('name')}.`, row.getString('revokedAt'));
	}
	return recalculateAccount(app, awardee);
}

function rewardDto(app, reward, month) {
	const used = app.findRecordsByFilter('redemptions', 'reward = {:reward} && quotaMonth = {:month} && status != "DITOLAK"', '', 0, 0, { reward: reward.id, month }).length;
	const quota = reward.getInt('monthlyQuota') || null;
	return { id: reward.id, legacyId: reward.getString('legacyId'), name: reward.getString('name'), category: reward.getString('category'), description: reward.getString('description'), priceCoins: reward.getInt('priceCoins'), minTierLevel: reward.getString('minTierLevel'), status: reward.getString('status'), monthlyQuota: quota, remaining: quota === null ? null : Math.max(0, quota - used), requiresApproval: reward.getBool('requiresApproval'), community: reward.getString('community'), fulfillmentNote: reward.getString('fulfillmentNote'), image: reward.getString('image') };
}

function redemptionDto(row) {
	return { id: row.id, awardeeId: row.getString('awardee'), awardeeName: row.getString('awardeeName'), awardeeWhatsapp: row.getString('awardeeWhatsapp'), rewardId: row.getString('reward'), rewardName: row.getString('rewardName'), coins: row.getInt('coins'), status: row.getString('status'), note: row.getString('note'), adminNote: row.getString('adminNote'), requestedAt: row.getString('requestedAt'), decidedAt: row.getString('decidedAt'), shippedAt: row.getString('shippedAt'), fulfilledAt: row.getString('fulfilledAt'), rejectedAt: row.getString('rejectedAt') };
}

module.exports = { BADGE_BONUS, findOne, addTransaction, recalculateAccount, syncWallet, rewardDto, redemptionDto };
