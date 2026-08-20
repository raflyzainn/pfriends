migrate((app) => {
	const collection = app.findCollectionByNameOrId('movements');
	collection.indexes = collection.indexes.filter((index) => !index.includes('idx_movement_legacy'));
	collection.indexes.push('CREATE UNIQUE INDEX idx_movement_legacy ON movements (legacyId) WHERE legacyId != ""');
	app.save(collection);
}, (app) => {
	const collection = app.findCollectionByNameOrId('movements');
	collection.indexes = collection.indexes.filter((index) => !index.includes('idx_movement_legacy'));
	collection.indexes.push('CREATE UNIQUE INDEX idx_movement_legacy ON movements (legacyId)');
	app.save(collection);
});
