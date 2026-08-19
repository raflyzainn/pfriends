migrate((app) => {
	const awardees = app.findCollectionByNameOrId('awardees');
	awardees.fields.add(new TextField({ name: 'occupation', max: 160 }));
	awardees.fields.add(new TextField({ name: 'bio', max: 1200 }));
	awardees.fields.add(new JSONField({ name: 'skills', maxSize: 10000 }));
	awardees.fields.add(new BoolField({ name: 'openToMentoring' }));
	awardees.fields.add(new NumberField({ name: 'businessEmployees', min: 0, max: 100000, onlyInt: true }));
	awardees.fields.add(new NumberField({ name: 'businessGrowthPercent', min: -100, max: 100000 }));
	// Direktori umum memakai endpoint tersanitasi; record lengkap mengandung kontak pribadi.
	awardees.listRule = 'user = @request.auth.id || @request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN"';
	awardees.viewRule = awardees.listRule;
	app.save(awardees);
}, (app) => {
	const awardees = app.findCollectionByNameOrId('awardees');
	for (const field of ['occupation','bio','skills','openToMentoring','businessEmployees','businessGrowthPercent']) {
		try { awardees.fields.removeByName(field); } catch (_) {}
	}
	awardees.listRule = '@request.auth.status = "AKTIF"';
	awardees.viewRule = '@request.auth.status = "AKTIF"';
	app.save(awardees);
});
