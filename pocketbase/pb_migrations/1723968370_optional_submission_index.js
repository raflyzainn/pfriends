migrate((app) => {
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.indexes = ledger.indexes.filter((item) => item.indexOf('idx_verified_submission') === -1);
	ledger.indexes.push('CREATE UNIQUE INDEX idx_verified_submission ON verified_point_activities (submission) WHERE submission != ""');
	app.save(ledger);
}, (app) => {
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.indexes = ledger.indexes.filter((item) => item.indexOf('idx_verified_submission') === -1);
	ledger.indexes.push('CREATE UNIQUE INDEX idx_verified_submission ON verified_point_activities (submission)');
	app.save(ledger);
});
