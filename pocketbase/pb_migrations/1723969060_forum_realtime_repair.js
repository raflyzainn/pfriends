migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	try { users.fields.getByName('community'); }
	catch (_) { users.fields.add(new SelectField({ name: 'community', maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] })); }
	app.save(users);

	for (const awardee of app.findRecordsByFilter('awardees', 'user != ""', '', 0, 0)) {
		try {
			const user = app.findRecordById('users', awardee.getString('user'));
			if (user.getString('community') !== awardee.getString('community')) {
				user.set('community', awardee.getString('community'));
				app.save(user);
			}
		} catch (_) {}
	}

	const rules = {
		forum_channels: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || community = "" || community = @request.auth.community)',
		forum_messages: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || channel.community = "" || channel.community = @request.auth.community)',
		forum_reactions: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || message.channel.community = "" || message.channel.community = @request.auth.community)',
		forum_presences: '@request.auth.id != "" && @request.auth.status = "AKTIF"'
	};
	for (const [name, rule] of Object.entries(rules)) {
		const collection = app.findCollectionByNameOrId(name);
		collection.listRule = rule;
		collection.viewRule = rule;
		app.save(collection);
	}
}, (app) => {
	for (const name of ['forum_channels', 'forum_messages', 'forum_reactions', 'forum_presences']) {
		const collection = app.findCollectionByNameOrId(name);
		collection.listRule = null;
		collection.viewRule = null;
		app.save(collection);
	}
});
