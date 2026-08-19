migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	users.fields.add(new SelectField({
		name: 'onboardingStatus',
		maxSelect: 1,
		values: ['PENDING', 'CLARIFICATION', 'APPROVED', 'REJECTED']
	}));
	app.save(users);

	const registrations = new Collection({
		type: 'base',
		name: 'awardee_registrations',
		listRule: 'owner = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"',
		viewRule: 'owner = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"',
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'fullName', type: 'text', required: true, min: 3, max: 160 },
			{ name: 'email', type: 'email', required: true },
			{ name: 'whatsapp', type: 'text', required: true, min: 10, max: 16 },
			{ name: 'community', type: 'select', required: true, maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] },
			{ name: 'programPillar', type: 'select', required: true, maxSelect: 1, values: ['PFprestasi', 'PFmuda', 'PFsains', 'PFlestari'] },
			{ name: 'batch', type: 'select', required: true, maxSelect: 1, values: ['PF10', 'PF11', 'PF12'] },
			{ name: 'region', type: 'text', required: true, min: 2, max: 120 },
			{ name: 'university', type: 'text', max: 180 },
			{ name: 'graduationYear', type: 'number', min: 1980, max: 2100, onlyInt: true },
			{ name: 'businessName', type: 'text', max: 180 },
			{ name: 'businessSector', type: 'text', max: 120 },
			{ name: 'businessCity', type: 'text', max: 120 },
			{ name: 'proofs', type: 'file', required: true, maxSelect: 3, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
			{ name: 'consentVersion', type: 'text', required: true, max: 40 },
			{ name: 'consentedAt', type: 'date', required: true },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['PENDING', 'CLARIFICATION', 'APPROVED', 'REJECTED'] },
			{ name: 'reviewer', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'reviewerName', type: 'text', max: 160 },
			{ name: 'reviewNote', type: 'text', max: 2000 },
			{ name: 'revisionCount', type: 'number', min: 0, onlyInt: true },
			{ name: 'submittedAt', type: 'date', required: true },
			{ name: 'reviewedAt', type: 'date' }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_registration_owner ON awardee_registrations (owner)',
			'CREATE UNIQUE INDEX idx_registration_email ON awardee_registrations (email)',
			'CREATE UNIQUE INDEX idx_registration_whatsapp ON awardee_registrations (whatsapp)',
			'CREATE INDEX idx_registration_queue ON awardee_registrations (status, submittedAt)'
		]
	});
	app.save(registrations);

	const awardees = new Collection({
		type: 'base',
		name: 'awardees',
		listRule: '@request.auth.status = "AKTIF"',
		viewRule: '@request.auth.status = "AKTIF"',
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'legacyId', type: 'text', required: true, max: 80 },
			{ name: 'fullName', type: 'text', required: true, max: 160 },
			{ name: 'email', type: 'email', required: true },
			{ name: 'whatsapp', type: 'text', max: 16 },
			{ name: 'community', type: 'select', required: true, maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] },
			{ name: 'programPillar', type: 'select', required: true, maxSelect: 1, values: ['PFprestasi', 'PFmuda', 'PFsains', 'PFlestari'] },
			{ name: 'chapterId', type: 'select', required: true, maxSelect: 1, values: ['PF10', 'PF11', 'PF12'] },
			{ name: 'city', type: 'text', max: 120 },
			{ name: 'university', type: 'text', max: 180 },
			{ name: 'graduationYear', type: 'number', min: 1980, max: 2100, onlyInt: true },
			{ name: 'businessName', type: 'text', max: 180 },
			{ name: 'businessSector', type: 'text', max: 120 },
			{ name: 'businessCity', type: 'text', max: 120 },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['AKTIF', 'NONAKTIF'] },
			{ name: 'joinedAt', type: 'date', required: true }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_awardees_user ON awardees (user)',
			'CREATE UNIQUE INDEX idx_awardees_legacy ON awardees (legacyId)',
			'CREATE INDEX idx_awardees_directory ON awardees (status, community, chapterId)'
		]
	});
	app.save(awardees);

	const reviews = new Collection({
		type: 'base',
		name: 'registration_reviews',
		listRule: 'registration.owner = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"',
		viewRule: 'registration.owner = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"',
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'registration', type: 'relation', required: true, maxSelect: 1, collectionId: registrations.id, cascadeDelete: true },
			{ name: 'reviewer', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'reviewerName', type: 'text', required: true, max: 160 },
			{ name: 'decision', type: 'select', required: true, maxSelect: 1, values: ['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT', 'REOPEN', 'RESUBMIT'] },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'decidedAt', type: 'date', required: true }
		],
		indexes: ['CREATE INDEX idx_registration_reviews ON registration_reviews (registration, decidedAt)']
	});
	app.save(reviews);
}, (app) => {
	for (const name of ['registration_reviews', 'awardees', 'awardee_registrations']) {
		try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	}
	try {
		const users = app.findCollectionByNameOrId('users');
		users.fields.removeByName('onboardingStatus');
		app.save(users);
	} catch (_) {}
});
