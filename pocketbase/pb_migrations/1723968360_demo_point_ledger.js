migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.fields.getByName('submission').required = false;
	ledger.fields.getByName('activityType').values = ['BROADCAST_VIEW','CTA_REACT','SHARE_PRIVATE','SHARE_PUBLIC','STORY_SUBMIT','SESSION_ATTEND','KNOWLEDGE_QA','SPEAKER_MENTOR','LEAD_ACTION'];
	ledger.fields.add(new RelationField({ name: 'user', maxSelect: 1, collectionId: users.id, cascadeDelete: true }));
	ledger.fields.add(new SelectField({ name: 'source', required: true, maxSelect: 1, values: ['EVIDENCE','DEMO_SEED'] }));
	ledger.fields.add(new TextField({ name: 'legacyActivityId', max: 80 }));
	ledger.indexes = [...ledger.indexes, 'CREATE UNIQUE INDEX idx_verified_legacy_activity ON verified_point_activities (legacyActivityId) WHERE legacyActivityId != ""', 'CREATE INDEX idx_verified_user_time ON verified_point_activities (user, occurredAt)'];
	ledger.listRule = 'user = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"';
	ledger.viewRule = ledger.listRule;
	app.save(ledger);
	for (const row of app.findRecordsByFilter('verified_point_activities', 'id != ""', '', 0, 0)) {
		try { const awardee = app.findFirstRecordByData('awardees', 'legacyId', row.getString('awardeeId')); row.set('user', awardee.getString('user')); } catch (_) {}
		row.set('source', 'EVIDENCE'); app.save(row);
	}
}, (app) => {
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	for (const row of app.findRecordsByFilter('verified_point_activities', 'source = "DEMO_SEED"', '', 0, 0)) app.delete(row);
	ledger.listRule = '@request.auth.id != ""'; ledger.viewRule = '@request.auth.id != ""';
	ledger.indexes = ledger.indexes.filter((item) => item.indexOf('idx_verified_legacy_activity') === -1 && item.indexOf('idx_verified_user_time') === -1);
	for (const field of ['user','source','legacyActivityId']) try { ledger.fields.removeByName(field); } catch (_) {}
	ledger.fields.getByName('submission').required = true;
	ledger.fields.getByName('activityType').values = ['SHARE_PUBLIC','STORY_SUBMIT','SESSION_ATTEND','KNOWLEDGE_QA','SPEAKER_MENTOR','LEAD_ACTION'];
	app.save(ledger);
});
