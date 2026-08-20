migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	users.fields.add(new DateField({ name: 'lastLoginAt' }));
	app.save(users);

	const awardees = app.findCollectionByNameOrId('awardees');
	const actions = new Collection({
		type: 'base',
		name: 'admin_awardee_actions',
		listRule: null,
		viewRule: null,
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'actorName', type: 'text', required: true, max: 160 },
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'targetUser', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'action', type: 'select', required: true, maxSelect: 1, values: ['ACCOUNT_STATUS_CHANGED','MEMBERSHIP_STATUS_CHANGED','IMPERSONATION_STARTED'] },
			{ name: 'fromStatus', type: 'text', max: 40 },
			{ name: 'toStatus', type: 'text', max: 40 },
			{ name: 'reason', type: 'text', max: 2000 },
			{ name: 'sessionKey', type: 'text', max: 80 },
			{ name: 'occurredAt', type: 'date', required: true },
			{ name: 'expiresAt', type: 'date' },
			{ name: 'endedAt', type: 'date' }
		],
		indexes: [
			'CREATE INDEX idx_admin_awardee_history ON admin_awardee_actions (awardee, occurredAt)',
			'CREATE UNIQUE INDEX idx_admin_impersonation_session ON admin_awardee_actions (sessionKey) WHERE sessionKey != ""'
		]
	});
	app.save(actions);
}, (app) => {
	try { app.delete(app.findCollectionByNameOrId('admin_awardee_actions')); } catch (_) {}
	const users = app.findCollectionByNameOrId('users');
	try { users.fields.removeByName('lastLoginAt'); } catch (_) {}
	app.save(users);
});
