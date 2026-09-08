migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	users.listRule = 'id = @request.auth.id';
	users.viewRule = 'id = @request.auth.id';
	users.createRule = null;
	// Profil dan atribut otorisasi hanya boleh dikelola server/superuser.
	users.updateRule = null;
	users.deleteRule = null;
	users.manageRule = null;
	users.fields.add(new TextField({ name: 'legacyAccountId', required: true, max: 80 }));
	users.fields.add(new TextField({ name: 'awardeeId', max: 80 }));
	users.fields.add(new SelectField({ name: 'role', required: true, maxSelect: 1, values: ['AWARDEE', 'VERIFIER', 'ADMIN'] }));
	users.fields.add(new TextField({ name: 'displayName', required: true, max: 160 }));
	users.fields.add(new TextField({ name: 'unit', max: 200 }));
	users.fields.add(new SelectField({ name: 'status', required: true, maxSelect: 1, values: ['AKTIF', 'TERKUNCI', 'NONAKTIF'] }));
	users.addIndex('idx_users_legacy', true, 'legacyAccountId', '');
	app.save(users);

	const submissions = new Collection({
		type: 'base',
		name: 'activity_submissions',
		listRule: '@request.auth.role = "VERIFIER" || owner = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || owner = @request.auth.id',
		createRule: '@request.auth.role = "AWARDEE" && owner = @request.auth.id',
		updateRule: '@request.auth.role = "AWARDEE" && owner = @request.auth.id && status = "NEEDS_REVISION"',
		deleteRule: null,
		fields: [
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'awardeeId', type: 'text', required: true, max: 80 },
			{ name: 'activityType', type: 'select', required: true, maxSelect: 1, values: ['SHARE_PUBLIC','STORY_SUBMIT','SESSION_ATTEND','KNOWLEDGE_QA','SPEAKER_MENTOR','LEAD_ACTION'] },
			{ name: 'activityDate', type: 'date', required: true },
			{ name: 'title', type: 'text', required: true, min: 3, max: 160 },
			{ name: 'description', type: 'text', required: true, min: 20, max: 3000 },
			{ name: 'externalUrl', type: 'url' },
			{ name: 'evidenceFiles', type: 'file', required: true, maxSelect: 5, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['SUBMITTED','NEEDS_REVISION','APPROVED'] },
			{ name: 'revisionCount', type: 'number', min: 0, onlyInt: true },
			{ name: 'reviewer', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'reviewNote', type: 'text', max: 2000 },
			{ name: 'submittedAt', type: 'date', required: true },
			{ name: 'reviewedAt', type: 'date' },
			{ name: 'awardedPoints', type: 'number', min: 0, onlyInt: true }
		],
		indexes: ['CREATE INDEX idx_activity_queue ON activity_submissions (status, submittedAt)', 'CREATE INDEX idx_activity_owner ON activity_submissions (owner)']
	});
	app.save(submissions);

	const reviews = new Collection({
		type: 'base', name: 'submission_reviews',
		listRule: '@request.auth.role = "VERIFIER" || submission.owner = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || submission.owner = @request.auth.id',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'submission', type: 'relation', required: true, maxSelect: 1, collectionId: submissions.id, cascadeDelete: true },
			{ name: 'reviewer', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'decision', type: 'select', required: true, maxSelect: 1, values: ['REQUEST_REVISION','APPROVE'] },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'decidedAt', type: 'date', required: true }
		]
	});
	app.save(reviews);

	const ledger = new Collection({
		type: 'base', name: 'verified_point_activities',
		listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'submission', type: 'relation', required: true, maxSelect: 1, collectionId: submissions.id, cascadeDelete: false },
			{ name: 'awardeeId', type: 'text', required: true, max: 80 },
			{ name: 'activityType', type: 'select', required: true, maxSelect: 1, values: ['SHARE_PUBLIC','STORY_SUBMIT','SESSION_ATTEND','KNOWLEDGE_QA','SPEAKER_MENTOR','LEAD_ACTION'] },
			{ name: 'points', type: 'number', min: 0, onlyInt: true },
			{ name: 'capReason', type: 'select', maxSelect: 1, values: ['DAILY_CAP'] },
			{ name: 'occurredAt', type: 'date', required: true },
			{ name: 'awardedAt', type: 'date', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_verified_submission ON verified_point_activities (submission)', 'CREATE INDEX idx_verified_awardee ON verified_point_activities (awardeeId, occurredAt)']
	});
	app.save(ledger);
}, (app) => {
	for (const name of ['verified_point_activities','submission_reviews','activity_submissions']) {
		try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	}
});
