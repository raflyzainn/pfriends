migrate((app) => {
	const collection = app.findCollectionByNameOrId('movements');
	collection.fields.getByName('legacyId').required = false;
	app.save(collection);
}, (app) => {
	const collection = app.findCollectionByNameOrId('movements');
	collection.fields.getByName('legacyId').required = true;
	app.save(collection);
});
