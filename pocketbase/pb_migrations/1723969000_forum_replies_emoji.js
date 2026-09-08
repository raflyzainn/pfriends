migrate((app) => {
	const messages = app.findCollectionByNameOrId('forum_messages');
	messages.fields.add(new RelationField({ name:'replyTo', maxSelect:1, collectionId:messages.id, cascadeDelete:false }));
	messages.indexes.push('CREATE INDEX idx_forum_message_reply ON forum_messages (replyTo)');
	app.save(messages);

	const reactions = app.findCollectionByNameOrId('forum_reactions');
	reactions.indexes = reactions.indexes.filter((index) => !index.includes('idx_forum_reaction_once'));
	reactions.fields.add(new TextField({ name:'emojiValue', max:40 }));
	app.save(reactions);
	for (const row of app.findAllRecords('forum_reactions')) { row.set('emojiValue', row.getString('emoji')); app.save(row); }
	reactions.fields.removeByName('emoji');
	app.save(reactions);
	reactions.fields.add(new TextField({ name:'emoji', required:true, min:1, max:40 }));
	app.save(reactions);
	for (const row of app.findAllRecords('forum_reactions')) { row.set('emoji', row.getString('emojiValue')); app.save(row); }
	reactions.fields.removeByName('emojiValue');
	reactions.indexes.push('CREATE UNIQUE INDEX idx_forum_reaction_once ON forum_reactions (message, user, emoji)');
	app.save(reactions);
}, (app) => {
	const reactions = app.findCollectionByNameOrId('forum_reactions');
	const allowed = ['👍','❤️','🎉'];
	for (const row of app.findAllRecords('forum_reactions')) if (!allowed.includes(row.getString('emoji'))) app.delete(row);
	reactions.indexes = reactions.indexes.filter((index) => !index.includes('idx_forum_reaction_once'));
	reactions.fields.add(new TextField({ name:'emojiValue', max:40 })); app.save(reactions);
	for (const row of app.findAllRecords('forum_reactions')) { row.set('emojiValue', row.getString('emoji')); app.save(row); }
	reactions.fields.removeByName('emoji'); app.save(reactions);
	reactions.fields.add(new SelectField({ name:'emoji', required:true, maxSelect:1, values:allowed })); app.save(reactions);
	for (const row of app.findAllRecords('forum_reactions')) { row.set('emoji', row.getString('emojiValue')); app.save(row); }
	reactions.fields.removeByName('emojiValue');
	reactions.indexes.push('CREATE UNIQUE INDEX idx_forum_reaction_once ON forum_reactions (message, user, emoji)'); app.save(reactions);
	const messages = app.findCollectionByNameOrId('forum_messages');
	messages.indexes = messages.indexes.filter((index) => !index.includes('idx_forum_message_reply'));
	try { messages.fields.removeByName('replyTo'); } catch (_) {}
	app.save(messages);
});
