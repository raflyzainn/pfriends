migrate((app) => {
	const messages = app.findCollectionByNameOrId('forum_messages');
	for (const field of ['deletedBy','deletedAt']) try { messages.fields.removeByName(field); } catch (_) {}
	app.save(messages);
}, (app) => {
	const users = app.findCollectionByNameOrId('users');
	const messages = app.findCollectionByNameOrId('forum_messages');
	messages.fields.add(new DateField({ name:'deletedAt' }));
	messages.fields.add(new RelationField({ name:'deletedBy', maxSelect:1, collectionId:users.id, cascadeDelete:false }));
	app.save(messages);
});
