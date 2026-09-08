migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const movements = app.findCollectionByNameOrId('movements');
	movements.fields.getByName('status').values = ['DIUSULKAN','PERLU_REVISI','BERJALAN','SELESAI','DITOLAK'];
	movements.fields.add(new RelationField({ name: 'proposedBy', maxSelect: 1, collectionId: users.id, cascadeDelete: false }));
	movements.fields.add(new DateField({ name: 'submittedAt' }));
	movements.fields.add(new RelationField({ name: 'reviewedBy', maxSelect: 1, collectionId: users.id, cascadeDelete: false }));
	movements.fields.add(new DateField({ name: 'reviewedAt' }));
	movements.fields.add(new TextField({ name: 'reviewNote', max: 2000 }));
	movements.fields.add(new NumberField({ name: 'revisionCount', min: 0, onlyInt: true }));
	movements.fields.add(new DateField({ name: 'publishedAt' }));
	app.save(movements);

	const participants = new Collection({
		type: 'base', name: 'movement_participants', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'movement', type: 'relation', required: true, maxSelect: 1, collectionId: movements.id, cascadeDelete: true },
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'awardeeId', type: 'text', required: true, max: 80 },
			{ name: 'awardeeName', type: 'text', required: true, max: 160 },
			{ name: 'role', type: 'select', required: true, maxSelect: 1, values: ['LEADER','PARTICIPANT'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['ACTIVE','WITHDRAWN'] },
			{ name: 'joinedAt', type: 'date', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_movement_participant ON movement_participants (movement, owner)', 'CREATE INDEX idx_movement_participant_status ON movement_participants (movement, status)']
	});
	app.save(participants);

	const reports = new Collection({
		type: 'base', name: 'movement_reports', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'legacyId', type: 'text', max: 100 },
			{ name: 'movement', type: 'relation', required: true, maxSelect: 1, collectionId: movements.id, cascadeDelete: true },
			{ name: 'participant', type: 'relation', maxSelect: 1, collectionId: participants.id, cascadeDelete: false },
			{ name: 'owner', type: 'relation', maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'awardeeId', type: 'text', max: 80 },
			{ name: 'awardeeName', type: 'text', max: 160 },
			{ name: 'role', type: 'select', required: true, maxSelect: 1, values: ['LEADER','PARTICIPANT'] },
			{ name: 'activityDate', type: 'date', required: true },
			{ name: 'location', type: 'text', required: true, max: 500 },
			{ name: 'participantCount', type: 'number', required: true, min: 1, onlyInt: true },
			{ name: 'outcomeNote', type: 'text', required: true, min: 40, max: 4000 },
			{ name: 'evidenceFiles', type: 'file', maxSelect: 5, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp','application/pdf'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['SUBMITTED','IN_REVIEW','NEEDS_REVISION','APPROVED','REJECTED'] },
			{ name: 'revisionCount', type: 'number', min: 0, onlyInt: true },
			{ name: 'reviewer', type: 'relation', maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'reviewNote', type: 'text', max: 2000 },
			{ name: 'submittedAt', type: 'date', required: true },
			{ name: 'reviewStartedAt', type: 'date' },
			{ name: 'reviewedAt', type: 'date' },
			{ name: 'awardedPoints', type: 'number', min: 0, onlyInt: true },
			{ name: 'isLegacy', type: 'bool' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_movement_report_legacy ON movement_reports (legacyId) WHERE legacyId != ""', 'CREATE INDEX idx_movement_report_queue ON movement_reports (status, submittedAt)', 'CREATE INDEX idx_movement_report_owner ON movement_reports (owner, submittedAt)']
	});
	app.save(reports);

	const decisions = new Collection({
		type: 'base', name: 'movement_decisions', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'movement', type: 'relation', required: true, maxSelect: 1, collectionId: movements.id, cascadeDelete: true },
			{ name: 'report', type: 'relation', maxSelect: 1, collectionId: reports.id, cascadeDelete: true },
			{ name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['MOVEMENT','REPORT'] },
			{ name: 'actor', type: 'relation', maxSelect: 1, collectionId: users.id, cascadeDelete: false },
			{ name: 'actorName', type: 'text', max: 160 },
			{ name: 'decision', type: 'select', required: true, maxSelect: 1, values: ['SUBMIT','RESUBMIT','START_REVIEW','REQUEST_REVISION','APPROVE','REJECT','COMPLETE'] },
			{ name: 'fromStatus', type: 'text', max: 40 },
			{ name: 'toStatus', type: 'text', required: true, max: 40 },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'decidedAt', type: 'date', required: true }
		],
		indexes: ['CREATE INDEX idx_movement_decision_history ON movement_decisions (movement, decidedAt)', 'CREATE INDEX idx_movement_report_decision ON movement_decisions (report, decidedAt)']
	});
	app.save(decisions);

	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.fields.getByName('source').values = ['EVIDENCE','DEMO_SEED','ENGAGEMENT','MOVEMENT'];
	ledger.fields.add(new RelationField({ name: 'movement', maxSelect: 1, collectionId: movements.id, cascadeDelete: false }));
	ledger.fields.add(new RelationField({ name: 'movementReport', maxSelect: 1, collectionId: reports.id, cascadeDelete: false }));
	ledger.indexes.push('CREATE UNIQUE INDEX idx_ledger_movement_leader ON verified_point_activities (movement, user, activityType) WHERE movement != "" AND activityType = "LEAD_ACTION"');
	app.save(ledger);

	const parseArray = (row, field) => { try { const value = JSON.parse(row.getString(field) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } };
	for (const movement of app.findRecordsByFilter('movements', 'id != ""', '', 0, 0)) {
		const now = new Date().toISOString();
		const participantByAwardee = {};
		for (const awardeeId of parseArray(movement, 'participantIds')) {
			try {
				const awardee = app.findFirstRecordByData('awardees', 'legacyId', awardeeId);
				if (!awardee.getString('user')) continue;
				const row = new Record(participants); row.set('movement', movement.id); row.set('owner', awardee.getString('user')); row.set('awardeeId', awardeeId); row.set('awardeeName', awardee.getString('fullName')); row.set('role', awardeeId === movement.getString('leaderLegacyId') ? 'LEADER' : 'PARTICIPANT'); row.set('status', 'ACTIVE'); row.set('joinedAt', movement.getString('startsAt') || now); app.save(row); participantByAwardee[awardeeId] = row;
			} catch (_) {}
		}
		for (const legacyId of parseArray(movement, 'reportIds')) {
			const row = new Record(reports); row.set('legacyId', legacyId); row.set('movement', movement.id); row.set('role', 'PARTICIPANT'); row.set('activityDate', movement.getString('endsAt') || now); row.set('location', movement.getString('region') || 'Wilayah kegiatan'); row.set('participantCount', 1); row.set('outcomeNote', movement.getString('description') || movement.getString('objective')); row.set('status', 'APPROVED'); row.set('submittedAt', movement.getString('endsAt') || now); row.set('reviewedAt', movement.getString('endsAt') || now); row.set('isLegacy', true); app.save(row);
		}
	}
}, (app) => {
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.indexes = ledger.indexes.filter((index) => !index.includes('idx_ledger_movement_leader'));
	for (const field of ['movementReport','movement']) try { ledger.fields.removeByName(field); } catch (_) {}
	ledger.fields.getByName('source').values = ['EVIDENCE','DEMO_SEED','ENGAGEMENT']; app.save(ledger);
	for (const name of ['movement_decisions','movement_reports','movement_participants']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	const movements = app.findCollectionByNameOrId('movements');
	for (const field of ['publishedAt','revisionCount','reviewNote','reviewedAt','reviewedBy','submittedAt','proposedBy']) try { movements.fields.removeByName(field); } catch (_) {}
	movements.fields.getByName('status').values = ['DIUSULKAN','BERJALAN','SELESAI','DITOLAK']; app.save(movements);
});
