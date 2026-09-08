migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const stories = app.findCollectionByNameOrId('stories');
	stories.fields.getByName('title').required = false;
	stories.fields.getByName('title').min = 0;
	stories.fields.getByName('body').required = false;
	stories.fields.getByName('body').min = 0;
	stories.fields.add(new RelationField({ name: 'owner', maxSelect: 1, collectionId: users.id, cascadeDelete: false }));
	stories.fields.add(new FileField({ name: 'evidenceFiles', maxSelect: 5, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf'] }));
	stories.fields.add(new FileField({ name: 'coverCandidate', maxSelect: 1, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp'] }));
	stories.fields.add(new DateField({ name: 'draftSavedAt' }));
	stories.fields.add(new NumberField({ name: 'awardedPoints', min: 0, onlyInt: true }));
	stories.indexes.push('CREATE INDEX idx_story_owner_status ON stories (owner, status, draftSavedAt)');
	stories.indexes.push('CREATE INDEX idx_story_queue ON stories (status, submittedAt)');
	app.save(stories);

	for (const story of app.findRecordsByFilter('stories', 'id != ""', '', 0, 0)) {
		try {
			const author = app.findRecordById('awardees', story.getString('author'));
			if (author.getString('user')) story.set('owner', author.getString('user'));
			app.save(story);
		} catch (_) {}
	}

	const reviews = new Collection({
		type: 'base', name: 'story_reviews', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'story', type: 'relation', required: true, maxSelect: 1, collectionId: stories.id, cascadeDelete: true },
			{ name: 'reviewer', type: 'relation', maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'reviewerName', type: 'text', max: 160 },
			{ name: 'decision', type: 'select', required: true, maxSelect: 1, values: ['REQUEST_REVISION','APPROVE','ARCHIVE','PUBLISH'] },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'sensitivityChecks', type: 'json', maxSize: 10000 },
			{ name: 'decidedAt', type: 'date', required: true }
		],
		indexes: ['CREATE INDEX idx_story_reviews_history ON story_reviews (story, decidedAt)', 'CREATE INDEX idx_story_reviews_reviewer ON story_reviews (reviewer, decidedAt)']
	});
	app.save(reviews);

	const events = new Collection({
		type: 'base', name: 'story_status_events', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'story', type: 'relation', required: true, maxSelect: 1, collectionId: stories.id, cascadeDelete: true },
			{ name: 'actor', type: 'relation', maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'actorName', type: 'text', max: 160 },
			{ name: 'eventType', type: 'select', required: true, maxSelect: 1, values: ['DRAFT_SAVED','SUBMITTED','RESUBMITTED','REVIEW_STARTED','REVISION_REQUESTED','APPROVED','PUBLISHED','ARCHIVED','CONSENT_REVOKED'] },
			{ name: 'fromStatus', type: 'text', max: 40 },
			{ name: 'toStatus', type: 'text', required: true, max: 40 },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'occurredAt', type: 'date', required: true }
		],
		indexes: ['CREATE INDEX idx_story_status_history ON story_status_events (story, occurredAt)']
	});
	app.save(events);

	const covers = new Collection({
		type: 'base', name: 'story_public_covers', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'story', type: 'relation', required: true, maxSelect: 1, collectionId: stories.id, cascadeDelete: true },
			{ name: 'image', type: 'file', required: true, maxSelect: 1, maxSize: 5242880, protected: false, mimeTypes: ['image/jpeg','image/png','image/webp'] },
			{ name: 'publishedAt', type: 'date', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_story_public_cover ON story_public_covers (story)']
	});
	app.save(covers);

	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	if (ledger.fields.getByName('source').values.indexOf('STORY') === -1) ledger.fields.getByName('source').values.push('STORY');
	ledger.fields.add(new RelationField({ name: 'story', maxSelect: 1, collectionId: stories.id, cascadeDelete: false }));
	ledger.indexes.push('CREATE UNIQUE INDEX idx_ledger_story_submit ON verified_point_activities (story, activityType) WHERE story != "" AND activityType = "STORY_SUBMIT"');
	app.save(ledger);
}, (app) => {
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.indexes = ledger.indexes.filter((index) => !index.includes('idx_ledger_story_submit'));
	try { ledger.fields.removeByName('story'); } catch (_) {}
	ledger.fields.getByName('source').values = ledger.fields.getByName('source').values.filter((value) => value !== 'STORY');
	app.save(ledger);
	for (const name of ['story_public_covers','story_status_events','story_reviews']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	const stories = app.findCollectionByNameOrId('stories');
	stories.indexes = stories.indexes.filter((index) => !index.includes('idx_story_owner_status') && !index.includes('idx_story_queue'));
	for (const field of ['awardedPoints','draftSavedAt','coverCandidate','evidenceFiles','owner']) try { stories.fields.removeByName(field); } catch (_) {}
	stories.fields.getByName('title').required = true; stories.fields.getByName('title').min = 5;
	stories.fields.getByName('body').required = true; stories.fields.getByName('body').min = 20;
	app.save(stories);
});
