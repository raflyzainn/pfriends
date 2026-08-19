migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const awardees = app.findCollectionByNameOrId('awardees');

	const accounts = new Collection({
		type: 'base', name: 'coin_accounts', listRule: null, viewRule: null,
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'balance', type: 'number', onlyInt: true },
			{ name: 'lifetimeEarned', type: 'number', min: 0, onlyInt: true },
			{ name: 'lifetimeSpent', type: 'number', min: 0, onlyInt: true },
			{ name: 'recalculatedAt', type: 'date', required: true }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_coin_account_awardee ON coin_accounts (awardee)',
			'CREATE UNIQUE INDEX idx_coin_account_user ON coin_accounts (user)'
		]
	});
	app.save(accounts);

	const transactions = new Collection({
		type: 'base', name: 'coin_transactions', listRule: null, viewRule: null,
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'sourceKey', type: 'text', required: true, max: 180 },
			{ name: 'type', type: 'select', required: true, maxSelect: 1, values: ['POINT_CREDIT','POINT_REVERSAL','BADGE_BONUS','BADGE_REVERSAL','REDEMPTION_DEBIT','REDEMPTION_REFUND','MIGRATION_ADJUSTMENT'] },
			{ name: 'amount', type: 'number', required: true, onlyInt: true },
			{ name: 'referenceId', type: 'text', max: 120 },
			{ name: 'note', type: 'text', max: 1000 },
			{ name: 'occurredAt', type: 'date', required: true }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_coin_transaction_source ON coin_transactions (sourceKey)',
			'CREATE INDEX idx_coin_transaction_awardee_time ON coin_transactions (awardee, occurredAt)'
		]
	});
	app.save(transactions);

	const rewards = new Collection({
		type: 'base', name: 'rewards', listRule: null, viewRule: null,
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'legacyId', type: 'text', required: true, max: 80 },
			{ name: 'name', type: 'text', required: true, max: 180 },
			{ name: 'category', type: 'select', required: true, maxSelect: 1, values: ['MERCHANDISE','UPSKILLING','MENTORING','PROFIL','UNDANGAN','SERTIFIKAT','DAMPAK'] },
			{ name: 'description', type: 'text', max: 2000 },
			{ name: 'priceCoins', type: 'number', required: true, min: 1, onlyInt: true },
			{ name: 'minTierLevel', type: 'select', required: true, maxSelect: 1, values: ['NEWCOMER','ACTIVE_MEMBER','CONTRIBUTOR','FEATURED_CANDIDATE','CHAMPION'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['TERSEDIA','HABIS','SEGERA'] },
			{ name: 'monthlyQuota', type: 'number', min: 1, onlyInt: true },
			{ name: 'requiresApproval', type: 'bool' },
			{ name: 'community', type: 'select', maxSelect: 1, values: ['SOBI','WOMENPRENEUR'] },
			{ name: 'fulfillmentNote', type: 'text', max: 2000 },
			{ name: 'image', type: 'url' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_rewards_legacy ON rewards (legacyId)']
	});
	app.save(rewards);

	const redemptions = new Collection({
		type: 'base', name: 'redemptions', listRule: null, viewRule: null,
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'legacyId', type: 'text', max: 120 },
			{ name: 'requestKey', type: 'text', required: true, max: 180 },
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'reward', type: 'relation', required: true, maxSelect: 1, collectionId: rewards.id },
			{ name: 'awardeeName', type: 'text', required: true, max: 160 },
			{ name: 'awardeeWhatsapp', type: 'text', max: 40 },
			{ name: 'rewardName', type: 'text', required: true, max: 180 },
			{ name: 'coins', type: 'number', required: true, min: 1, onlyInt: true },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['DIAJUKAN','DISETUJUI','DIKIRIM','SELESAI','DITOLAK'] },
			{ name: 'quotaMonth', type: 'text', required: true, max: 7 },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'adminNote', type: 'text', max: 2000 },
			{ name: 'requestedAt', type: 'date', required: true },
			{ name: 'decidedAt', type: 'date' },
			{ name: 'shippedAt', type: 'date' },
			{ name: 'fulfilledAt', type: 'date' },
			{ name: 'rejectedAt', type: 'date' },
			{ name: 'actedBy', type: 'relation', maxSelect: 1, collectionId: users.id }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_redemptions_request ON redemptions (requestKey)',
			'CREATE UNIQUE INDEX idx_redemptions_legacy ON redemptions (legacyId) WHERE legacyId != \'\'',
			'CREATE INDEX idx_redemptions_queue ON redemptions (status, requestedAt)',
			'CREATE INDEX idx_redemptions_quota ON redemptions (reward, quotaMonth, status)'
		]
	});
	app.save(redemptions);
}, (app) => {
	for (const name of ['redemptions','rewards','coin_transactions','coin_accounts']) {
		try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	}
});
