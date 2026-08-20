migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const broadcasts = new Collection({ type: 'base', name: 'broadcasts', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name:'title', type:'text', required:true, min:5, max:180 }, { name:'summary', type:'text', required:true, min:10, max:500 },
			{ name:'body', type:'text', required:true, min:20, max:20000 }, { name:'status', type:'select', required:true, maxSelect:1, values:['DRAF','TERJADWAL','TERKIRIM'] },
			{ name:'channel', type:'select', required:true, maxSelect:1, values:['WA_KOMUNITAS','MICROSITE','EMAIL','SEMUA'] },
			{ name:'contentSource', type:'text', max:160 }, { name:'lightCta', type:'text', max:1000 }, { name:'ctaLink', type:'url' },
			{ name:'audience', type:'select', required:true, maxSelect:1, values:['SEMUA','SOBI','WOMENPRENEUR'] },
			{ name:'scheduledAt', type:'date' }, { name:'sentAt', type:'date' }, { name:'recipientCount', type:'number', min:0, onlyInt:true },
			{ name:'createdBy', type:'relation', required:true, maxSelect:1, collectionId:users.id }, { name:'updatedBy', type:'relation', maxSelect:1, collectionId:users.id }
		], indexes:['CREATE INDEX idx_broadcast_status_time ON broadcasts (status, sentAt)','CREATE INDEX idx_broadcast_schedule ON broadcasts (status, scheduledAt)'] });
	app.save(broadcasts);
	const engagements = new Collection({ type:'base', name:'broadcast_engagements', listRule:null, viewRule:null, createRule:null, updateRule:null, deleteRule:null,
		fields:[
			{ name:'broadcast', type:'relation', required:true, maxSelect:1, collectionId:broadcasts.id, cascadeDelete:true },
			{ name:'owner', type:'relation', required:true, maxSelect:1, collectionId:users.id, cascadeDelete:true }, { name:'awardeeId', type:'text', required:true, max:80 },
			{ name:'type', type:'select', required:true, maxSelect:1, values:['BROADCAST_VIEW','CTA_REACT','SHARE_PRIVATE'] },
			{ name:'response', type:'text', max:1000 }, { name:'requestKey', type:'text', max:180 }, { name:'startedAt', type:'date' }, { name:'awardedAt', type:'date' }, { name:'points', type:'number', min:0, onlyInt:true }
		], indexes:['CREATE UNIQUE INDEX idx_broadcast_once ON broadcast_engagements (broadcast, owner, type) WHERE type != "SHARE_PRIVATE"','CREATE UNIQUE INDEX idx_broadcast_request ON broadcast_engagements (requestKey) WHERE requestKey != ""','CREATE INDEX idx_broadcast_engagement ON broadcast_engagements (broadcast, type, awardedAt)'] });
	app.save(engagements);
	const submissions = app.findCollectionByNameOrId('activity_submissions'); submissions.fields.add(new RelationField({ name:'broadcast', maxSelect:1, collectionId:broadcasts.id, cascadeDelete:false })); app.save(submissions);
	const ledger = app.findCollectionByNameOrId('verified_point_activities'); ledger.fields.getByName('source').values = ['EVIDENCE','DEMO_SEED','ENGAGEMENT']; ledger.fields.add(new RelationField({ name:'broadcast', maxSelect:1, collectionId:broadcasts.id, cascadeDelete:false })); ledger.fields.add(new RelationField({ name:'broadcastEngagement', maxSelect:1, collectionId:engagements.id, cascadeDelete:false })); ledger.indexes.push('CREATE UNIQUE INDEX idx_ledger_broadcast_engagement ON verified_point_activities (broadcastEngagement) WHERE broadcastEngagement != ""'); app.save(ledger);
}, (app) => {
	const ledger=app.findCollectionByNameOrId('verified_point_activities'); ledger.indexes=ledger.indexes.filter(x=>!x.includes('idx_ledger_broadcast_engagement')); for(const n of ['broadcastEngagement','broadcast']) try{ledger.fields.removeByName(n)}catch(_){} ledger.fields.getByName('source').values=['EVIDENCE','DEMO_SEED']; app.save(ledger);
	const submissions=app.findCollectionByNameOrId('activity_submissions'); try{submissions.fields.removeByName('broadcast')}catch(_){} app.save(submissions);
	for(const n of ['broadcast_engagements','broadcasts']) try{app.delete(app.findCollectionByNameOrId(n))}catch(_){}
});
