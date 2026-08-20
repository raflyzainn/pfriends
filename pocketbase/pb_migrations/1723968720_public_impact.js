migrate((app) => {
	const awardees = app.findCollectionByNameOrId('awardees');
	awardees.fields.add(new BoolField({ name: 'consentActive' }));
	app.save(awardees);

	for (const awardee of app.findRecordsByFilter('awardees', 'id != ""', '', 0, 0)) {
		let registration = null;
		try {
			registration = app.findFirstRecordByFilter(
				'awardee_registrations',
				'owner = {:owner} && status = "APPROVED"',
				{ owner: awardee.getString('user') }
			);
		} catch (_) {}
		if (registration) {
			awardee.set('consentActive', true);
			app.save(awardee);
		}
	}

	const movements = new Collection({
		type: 'base',
		name: 'movements',
		listRule: null,
		viewRule: null,
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'legacyId', type: 'text', required: true, max: 80 },
			{ name: 'slug', type: 'text', required: true, max: 160 },
			{ name: 'title', type: 'text', required: true, max: 180 },
			{ name: 'category', type: 'select', required: true, maxSelect: 1, values: ['AKSI_LINGKUNGAN','EDUKASI_MASYARAKAT','PEMBERDAYAAN_EKONOMI'] },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['DIUSULKAN','BERJALAN','SELESAI','DITOLAK'] },
			{ name: 'objective', type: 'text', required: true, max: 1000 },
			{ name: 'description', type: 'text', max: 10000 },
			{ name: 'region', type: 'text', max: 500 },
			{ name: 'leaderLegacyId', type: 'text', max: 80 },
			{ name: 'leaderName', type: 'text', max: 160 },
			{ name: 'startsAt', type: 'date', required: true },
			{ name: 'endsAt', type: 'date', required: true },
			{ name: 'targetParticipants', type: 'number', min: 0, onlyInt: true },
			{ name: 'participantIds', type: 'json', maxSize: 100000 },
			{ name: 'esgTags', type: 'json', maxSize: 30000 },
			{ name: 'reportIds', type: 'json', maxSize: 100000 },
			{ name: 'impact', type: 'json', maxSize: 30000 }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_movement_legacy ON movements (legacyId)',
			'CREATE UNIQUE INDEX idx_movement_slug ON movements (slug)',
			'CREATE INDEX idx_movement_status ON movements (status, startsAt)'
		]
	});
	app.save(movements);
}, (app) => {
	try { app.delete(app.findCollectionByNameOrId('movements')); } catch (_) {}
	const awardees = app.findCollectionByNameOrId('awardees');
	try { awardees.fields.removeByName('consentActive'); } catch (_) {}
	app.save(awardees);
});
