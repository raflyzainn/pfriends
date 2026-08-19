migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const events = new Collection({
		type: 'base', name: 'events',
		listRule: null,
		viewRule: null,
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'title', type: 'text', required: true, min: 10, max: 120 },
			{ name: 'slug', type: 'text', required: true, max: 160 },
			{ name: 'type', type: 'select', required: true, maxSelect: 1, values: ['UPSKILLING','PERTEMUAN','SHARING'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['DIUSULKAN','TERJADWAL','BERLANGSUNG','SELESAI','DITOLAK','DIBATALKAN'] },
			{ name: 'description', type: 'text', required: true, min: 40, max: 3000 },
			{ name: 'speakerName', type: 'text', max: 160 },
			{ name: 'chapterId', type: 'text', max: 80 },
			{ name: 'community', type: 'text', max: 80 },
			{ name: 'location', type: 'text', required: true, max: 300 },
			{ name: 'isOnline', type: 'bool' },
			{ name: 'startsAt', type: 'date', required: true },
			{ name: 'endsAt', type: 'date', required: true },
			{ name: 'quota', type: 'number', min: 0, onlyInt: true },
			{ name: 'proposedBy', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'proposedByName', type: 'text', required: true, max: 160 },
			{ name: 'proposedByAwardeeId', type: 'text', required: true, max: 80 },
			{ name: 'submittedAt', type: 'date', required: true },
			{ name: 'reviewedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'reviewedAt', type: 'date' },
			{ name: 'reviewNote', type: 'text', max: 2000 },
			{ name: 'publishedAt', type: 'date' },
			{ name: 'outcomeNote', type: 'text', max: 3000 }
		],
		indexes: ['CREATE UNIQUE INDEX idx_events_slug ON events (slug)', 'CREATE INDEX idx_events_public ON events (status, startsAt)', 'CREATE INDEX idx_events_proposer ON events (proposedBy, submittedAt)']
	});
	app.save(events);

	const participants = new Collection({
		type: 'base', name: 'event_participants',
		listRule: '@request.auth.role = "VERIFIER" || owner = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || owner = @request.auth.id',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'event', type: 'relation', required: true, maxSelect: 1, collectionId: events.id, cascadeDelete: true },
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'awardeeId', type: 'text', required: true, max: 80 },
			{ name: 'awardeeName', type: 'text', required: true, max: 160 },
			{ name: 'registeredAt', type: 'date', required: true },
			{ name: 'attendanceStatus', type: 'select', required: true, maxSelect: 1, values: ['NOT_SUBMITTED','SUBMITTED','IN_REVIEW','NEEDS_REVISION','APPROVED'] },
			{ name: 'attendedAt', type: 'date' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_event_participant ON event_participants (event, owner)', 'CREATE INDEX idx_event_attendance ON event_participants (event, attendanceStatus)']
	});
	app.save(participants);

	const submissions = app.findCollectionByNameOrId('activity_submissions');
	submissions.fields.add(new RelationField({ name: 'event', maxSelect: 1, collectionId: events.id, cascadeDelete: false }));
	submissions.fields.add(new RelationField({ name: 'eventParticipant', maxSelect: 1, collectionId: participants.id, cascadeDelete: false }));
	submissions.indexes.push('CREATE UNIQUE INDEX idx_attendance_submission ON activity_submissions (event, owner) WHERE event != ""');
	app.save(submissions);
}, (app) => {
	const submissions = app.findCollectionByNameOrId('activity_submissions');
	try { submissions.fields.removeByName('eventParticipant'); } catch (_) {}
	try { submissions.fields.removeByName('event'); } catch (_) {}
	submissions.indexes = submissions.indexes.filter((index) => !index.includes('idx_attendance_submission'));
	app.save(submissions);
	for (const name of ['event_participants','events']) {
		try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	}
});
