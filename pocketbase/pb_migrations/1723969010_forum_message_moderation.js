migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const messages = app.findCollectionByNameOrId('forum_messages');
	messages.fields.add(new DateField({ name:'deletedAt' }));
	messages.fields.add(new RelationField({ name:'deletedBy', maxSelect:1, collectionId:users.id, cascadeDelete:false }));
	messages.indexes.push('CREATE INDEX idx_forum_message_author_sent ON forum_messages (author, sentAt)');
	app.save(messages);
}, (app) => {
	const messages = app.findCollectionByNameOrId('forum_messages');
	messages.indexes = messages.indexes.filter((index) => !index.includes('idx_forum_message_author_sent'));
	for (const field of ['deletedBy','deletedAt']) try { messages.fields.removeByName(field); } catch (_) {}
	app.save(messages);
});
