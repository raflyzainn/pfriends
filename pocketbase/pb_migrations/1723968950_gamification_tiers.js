migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const tiers = new Collection({
		type: 'base', name: 'gamification_tiers', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'level', type: 'select', required: true, maxSelect: 1, values: ['NEWCOMER','ACTIVE_MEMBER','CONTRIBUTOR','FEATURED_CANDIDATE','CHAMPION'] },
			{ name: 'rank', type: 'number', min: 0, max: 4, onlyInt: true },
			{ name: 'threshold', type: 'number', min: 0, onlyInt: true },
			{ name: 'canonicalThreshold', type: 'number', min: 0, onlyInt: true },
			{ name: 'label', type: 'text', required: true, max: 80 },
			{ name: 'description', type: 'text', required: true, max: 1000 },
			{ name: 'benefit', type: 'text', required: true, max: 1000 },
			{ name: 'color', type: 'text', required: true, max: 20 },
			{ name: 'updatedBy', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'updatedAt', type: 'date', required: true }
		], indexes: ['CREATE UNIQUE INDEX idx_gamification_tier_level ON gamification_tiers (level)', 'CREATE UNIQUE INDEX idx_gamification_tier_rank ON gamification_tiers (rank)']
	});
	app.save(tiers);
	const audits = new Collection({
		type: 'base', name: 'gamification_tier_audits', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'actorName', type: 'text', required: true, max: 160 },
			{ name: 'before', type: 'json', required: true },
			{ name: 'after', type: 'json', required: true },
			{ name: 'impact', type: 'json', required: true },
			{ name: 'occurredAt', type: 'date', required: true }
		], indexes: ['CREATE INDEX idx_gamification_tier_audit_time ON gamification_tier_audits (occurredAt)']
	});
	app.save(audits);
	const definitions = [
		['NEWCOMER',0,0,'Newcomer','Anggota baru yang sedang mengumpulkan kontribusi pertamanya.','Akses penuh kanal komunitas, kalender kegiatan, dan pusat aksi poin','#CBD5E1'],
		['ACTIVE_MEMBER',1,25,'Active Member','Anggota yang rutin membaca dan menanggapi kabar komunitas.','Berhak disebut dalam ringkasan bulanan komunitas','#6FBEB2'],
		['CONTRIBUTOR',2,50,'Contributor','Anggota yang aktif berbagi konten dan menghidupkan diskusi komunitas.','Berhak menerima pengakuan komunitas','#34908B'],
		['FEATURED_CANDIDATE',3,100,'Featured Candidate','Anggota yang memenuhi ambang untuk dipertimbangkan tampil di ruang publik.','Berhak ditampilkan di situs web atau media sosial','#1E4B49'],
		['CHAMPION',4,150,'Champion','Penggerak komunitas yang memimpin aksi dan membimbing anggota lain.','Berhak diundang sebagai mentor, narasumber, atau champion regional','#D9B81F']
	];
	const now = new Date().toISOString();
	for (const item of definitions) { const row=new Record(tiers); row.set('level',item[0]); row.set('rank',item[1]); row.set('threshold',item[2]); row.set('canonicalThreshold',item[2]); row.set('label',item[3]); row.set('description',item[4]); row.set('benefit',item[5]); row.set('color',item[6]); row.set('updatedAt',now); app.save(row); }
	const awards=app.findCollectionByNameOrId('awardee_badges'); awards.fields.add(new NumberField({name:'awardCycle',min:1,onlyInt:true})); app.save(awards);
	for (const row of app.findRecordsByFilter('awardee_badges','id != ""','',0,0)) { row.set('awardCycle',1); app.save(row); }
}, (app) => {
	try { const awards=app.findCollectionByNameOrId('awardee_badges'); awards.fields.removeByName('awardCycle'); app.save(awards); } catch (_) {}
	for (const name of ['gamification_tier_audits','gamification_tiers']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
});
