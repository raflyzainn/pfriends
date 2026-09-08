migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	users.fields.add(new SelectField({ name: 'community', maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] }));
	users.authRule = 'status = "AKTIF" || (role = "AWARDEE" && (onboardingStatus = "PENDING" || onboardingStatus = "CLARIFICATION" || onboardingStatus = "REJECTED"))';
	app.save(users);

	for (const awardee of app.findRecordsByFilter('awardees', 'user != ""', '', 0, 0)) {
		try {
			const user = app.findRecordById('users', awardee.getString('user'));
			user.set('community', awardee.getString('community'));
			app.save(user);
		} catch (_) {}
	}

	const submissions = app.findCollectionByNameOrId('activity_submissions');
	submissions.createRule = null;
	submissions.updateRule = null;
	app.save(submissions);

	const stories = app.findCollectionByNameOrId('stories');
	stories.listRule = null;
	stories.viewRule = null;
	app.save(stories);

	const forumRules = {
		forum_channels: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || community = "" || community = @request.auth.community)',
		forum_messages: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || channel.community = "" || channel.community = @request.auth.community)',
		forum_reactions: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || message.channel.community = "" || message.channel.community = @request.auth.community)',
		forum_presences: '@request.auth.id != "" && @request.auth.status = "AKTIF"'
	};
	for (const [name, rule] of Object.entries(forumRules)) {
		const collection = app.findCollectionByNameOrId(name);
		collection.listRule = rule;
		collection.viewRule = rule;
		app.save(collection);
	}

	const statusEvents = app.findCollectionByNameOrId('story_status_events');
	const type = statusEvents.fields.getByName('eventType');
	if (!type.values.includes('CONSENT_EXPIRED')) type.values.push('CONSENT_EXPIRED');
	app.save(statusEvents);

	const awardeeBadges = app.findCollectionByNameOrId('awardee_badges');
	awardeeBadges.fields.add(new NumberField({ name: 'awardCycle', min: 1, onlyInt: true }));
	app.save(awardeeBadges);
}, (app) => {
	const users = app.findCollectionByNameOrId('users');
	users.authRule = '';
	try { users.fields.removeByName('community'); } catch (_) {}
	app.save(users);

	const submissions = app.findCollectionByNameOrId('activity_submissions');
	submissions.createRule = '@request.auth.role = "AWARDEE" && owner = @request.auth.id';
	submissions.updateRule = '@request.auth.role = "AWARDEE" && owner = @request.auth.id && status = "NEEDS_REVISION"';
	app.save(submissions);

	const stories = app.findCollectionByNameOrId('stories');
	stories.listRule = null;
	stories.viewRule = 'owner = @request.auth.id || (@request.auth.role = "VERIFIER" && status != "DRAFT")';
	app.save(stories);

	for (const name of ['forum_channels', 'forum_messages', 'forum_reactions', 'forum_presences']) {
		const collection = app.findCollectionByNameOrId(name);
		collection.listRule = null;
		collection.viewRule = null;
		app.save(collection);
	}

	const statusEvents = app.findCollectionByNameOrId('story_status_events');
	const type = statusEvents.fields.getByName('eventType');
	type.values = type.values.filter((value) => value !== 'CONSENT_EXPIRED');
	app.save(statusEvents);

	const awardeeBadges = app.findCollectionByNameOrId('awardee_badges');
	try { awardeeBadges.fields.removeByName('awardCycle'); } catch (_) {}
	app.save(awardeeBadges);
});
