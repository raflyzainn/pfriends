migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const actions = new Collection({
		type: 'base', name: 'point_actions', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'code', type: 'text', required: true, min: 3, max: 80 },
			{ name: 'label', type: 'text', required: true, min: 3, max: 160 },
			{ name: 'description', type: 'text', required: true, min: 10, max: 2000 },
			{ name: 'actionClass', type: 'select', required: true, maxSelect: 1, values: ['A','B','C','D'] },
			{ name: 'pillar', type: 'text', required: true, min: 3, max: 160 },
			{ name: 'points', type: 'number', required: true, min: 1, max: 999, onlyInt: true },
			{ name: 'dailyCap', type: 'number', required: true, min: 1, max: 100, onlyInt: true },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['ACTIVE','INACTIVE'] },
			{ name: 'workflow', type: 'select', required: true, maxSelect: 1, values: ['SYSTEM','EVIDENCE'] },
			{ name: 'isCore', type: 'bool' },
			{ name: 'createdBy', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'updatedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'createdAt', type: 'date', required: true },
			{ name: 'updatedAt', type: 'date', required: true }
		], indexes: ['CREATE UNIQUE INDEX idx_point_actions_code ON point_actions (code)', 'CREATE INDEX idx_point_actions_catalog ON point_actions (status, actionClass, label)']
	});
	app.save(actions);
	const audits = new Collection({
		type: 'base', name: 'point_action_audits', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'pointAction', type: 'relation', maxSelect: 1, collectionId: actions.id },
			{ name: 'actionCode', type: 'text', required: true, max: 80 },
			{ name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'actorName', type: 'text', required: true, max: 160 },
			{ name: 'actorRole', type: 'select', required: true, maxSelect: 1, values: ['ADMIN','VERIFIER'] },
			{ name: 'operation', type: 'select', required: true, maxSelect: 1, values: ['CREATE','UPDATE','ARCHIVE','DELETE'] },
			{ name: 'before', type: 'json' }, { name: 'after', type: 'json' },
			{ name: 'occurredAt', type: 'date', required: true }
		], indexes: ['CREATE INDEX idx_point_action_audit ON point_action_audits (actionCode, occurredAt)']
	});
	app.save(audits);
	const submissions = app.findCollectionByNameOrId('activity_submissions');
	submissions.fields.getByName('activityType').required = false;
	submissions.fields.add(new RelationField({ name: 'pointAction', maxSelect: 1, collectionId: actions.id }));
	submissions.fields.add(new TextField({ name: 'actionCode', max: 80 }));
	app.save(submissions);
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.fields.getByName('activityType').required = false;
	ledger.fields.add(new RelationField({ name: 'pointAction', maxSelect: 1, collectionId: actions.id }));
	ledger.fields.add(new TextField({ name: 'actionCode', max: 80 }));
	ledger.fields.add(new TextField({ name: 'actionLabel', max: 160 }));
	app.save(ledger);
	const rows = [
		['BROADCAST_VIEW','Membaca kabar mingguan','Membaca kabar mingguan yang diterbitkan Pertamina Foundation.','A','Diseminasi & Amplifikasi',1,3,'SYSTEM'],
		['CTA_REACT','Menanggapi ajakan ringan','Memberikan tanggapan yang bermakna pada ajakan dalam kabar.','A','Diseminasi & Amplifikasi',2,5,'SYSTEM'],
		['SHARE_PRIVATE','Membagikan konten ke WA atau jaringan pribadi','Membagikan kabar ke jaringan pribadi dengan bukti yang dapat diperiksa.','B','Diseminasi & Amplifikasi',5,3,'EVIDENCE'],
		['SHARE_PUBLIC','Membagikan konten ke media sosial publik','Membagikan kabar ke media sosial publik dengan tautan dan bukti.','B','Diseminasi & Amplifikasi',8,2,'EVIDENCE'],
		['STORY_SUBMIT','Mengirim cerita, nominasi, atau survei','Mengirim kontribusi cerita komunitas untuk ditinjau.','C','Community Journalism',10,1,'SYSTEM'],
		['SESSION_ATTEND','Menghadiri sesi daring','Menghadiri sesi komunitas dan mengirim bukti kehadiran.','C','Kalender Komunitas',15,2,'EVIDENCE'],
		['KNOWLEDGE_QA','Bertanya atau menjawab dengan bermanfaat','Membagikan pertanyaan atau jawaban yang berguna bagi komunitas.','C','Open Community Ecosystem',15,2,'EVIDENCE'],
		['SPEAKER_MENTOR','Menjadi narasumber, mentor, atau fasilitator','Berkontribusi sebagai narasumber, mentor, atau fasilitator.','D','Recognition & Gamifikasi',30,1,'EVIDENCE'],
		['LEAD_ACTION','Memimpin aksi atau kampanye lokal','Memimpin gerakan atau kampanye lokal yang terverifikasi.','D','Movement-Based Program',50,1,'SYSTEM']
	];
	const now = new Date().toISOString();
	for (const item of rows) { const row = new Record(actions); row.set('code',item[0]); row.set('label',item[1]); row.set('description',item[2]); row.set('actionClass',item[3]); row.set('pillar',item[4]); row.set('points',item[5]); row.set('dailyCap',item[6]); row.set('workflow',item[7]); row.set('status','ACTIVE'); row.set('isCore',true); row.set('createdAt',now); row.set('updatedAt',now); app.save(row); }
	for (const row of app.findRecordsByFilter('activity_submissions', 'activityType != ""', '', 0, 0)) { try { const action=app.findFirstRecordByData('point_actions','code',row.getString('activityType')); row.set('pointAction',action.id); row.set('actionCode',action.getString('code')); app.save(row); } catch (_) {} }
	for (const row of app.findRecordsByFilter('verified_point_activities', 'activityType != ""', '', 0, 0)) { try { const action=app.findFirstRecordByData('point_actions','code',row.getString('activityType')); row.set('pointAction',action.id); row.set('actionCode',action.getString('code')); row.set('actionLabel',action.getString('label')); app.save(row); } catch (_) {} }
}, (app) => {
	for (const name of ['activity_submissions','verified_point_activities']) { const collection=app.findCollectionByNameOrId(name); for (const field of ['pointAction','actionCode','actionLabel']) try { collection.fields.removeByName(field); } catch (_) {} collection.fields.getByName('activityType').required=true; app.save(collection); }
	for (const name of ['point_action_audits','point_actions']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
});
