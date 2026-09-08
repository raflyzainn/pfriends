migrate((app) => {
	const awardees = app.findCollectionByNameOrId('awardees');
	const users = app.findCollectionByNameOrId('users');
	const stories = new Collection({
		type: 'base',
		name: 'stories',
		listRule: null,
		viewRule: null,
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'legacyId', type: 'text', required: true, max: 80 },
			{ name: 'slug', type: 'text', required: true, min: 3, max: 180 },
			{ name: 'author', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id },
			{ name: 'authorLegacyId', type: 'text', required: true, max: 80 },
			{ name: 'authorName', type: 'text', required: true, max: 180 },
			{ name: 'title', type: 'text', required: true, min: 5, max: 240 },
			{ name: 'summary', type: 'text', max: 1200 },
			{ name: 'body', type: 'text', required: true, min: 20, max: 60000 },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['DRAFT', 'DIAJUKAN', 'REVIEW', 'PERLU_REVISI', 'DISETUJUI', 'TERPUBLIKASI', 'DIARSIPKAN'] },
			{ name: 'community', type: 'select', required: true, maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] },
			{ name: 'chapterId', type: 'text', max: 40 },
			{ name: 'esgTags', type: 'json', maxSize: 20000 },
			{ name: 'mediaRefs', type: 'json', maxSize: 20000 },
			{ name: 'outcome', type: 'json', maxSize: 20000 },
			{ name: 'location', type: 'text', max: 240 },
			{ name: 'activityDate', type: 'date' },
			{ name: 'participantCount', type: 'number', min: 0, onlyInt: true },
			{ name: 'sensitivityScan', type: 'select', required: true, maxSelect: 1, values: ['MENUNGGU', 'CLEAR', 'FLAGGED'] },
			{ name: 'pfValidation', type: 'json', maxSize: 10000 },
			{ name: 'consentActive', type: 'bool' },
			{ name: 'consentLegacyId', type: 'text', max: 80 },
			{ name: 'reviewNotes', type: 'json', maxSize: 30000 },
			{ name: 'reviewer', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'reviewedAt', type: 'date' },
			{ name: 'publishedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'revisionCount', type: 'number', min: 0, onlyInt: true },
			{ name: 'submittedAt', type: 'date' },
			{ name: 'publishedAt', type: 'date' },
			{ name: 'archivedAt', type: 'date' },
			{ name: 'archiveReason', type: 'text', max: 2000 },
			{ name: 'views', type: 'number', min: 0, onlyInt: true }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_story_legacy ON stories (legacyId)',
			'CREATE UNIQUE INDEX idx_story_slug ON stories (slug)',
			'CREATE INDEX idx_story_public ON stories (status, consentActive, publishedAt)',
			'CREATE INDEX idx_story_author ON stories (author, status, submittedAt)'
		]
	});
	app.save(stories);
}, (app) => {
	try { app.delete(app.findCollectionByNameOrId('stories')); } catch (_) {}
});
