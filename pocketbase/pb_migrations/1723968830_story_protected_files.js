migrate((app) => {
	const stories = app.findCollectionByNameOrId('stories');
	stories.viewRule = 'owner = @request.auth.id || (@request.auth.role = "VERIFIER" && status != "DRAFT")';
	app.save(stories);
}, (app) => {
	const stories = app.findCollectionByNameOrId('stories');
	stories.viewRule = null;
	app.save(stories);
});
