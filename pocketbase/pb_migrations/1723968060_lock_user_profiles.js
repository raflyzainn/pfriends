migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	users.updateRule = null;
	users.manageRule = null;
	app.save(users);
}, (app) => {
	const users = app.findCollectionByNameOrId('users');
	users.updateRule = 'id = @request.auth.id';
	app.save(users);
});
