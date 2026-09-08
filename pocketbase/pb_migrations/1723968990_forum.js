migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const channels = new Collection({ type:'base', name:'forum_channels', listRule:null, viewRule:null, createRule:null, updateRule:null, deleteRule:null,
		fields:[
			{ name:'slug', type:'text', required:true, min:2, max:60, pattern:'^[a-z0-9-]+$' },
			{ name:'name', type:'text', required:true, min:2, max:80 }, { name:'topic', type:'text', required:true, max:500 },
			{ name:'note', type:'text', max:500 }, { name:'community', type:'select', maxSelect:1, values:['SOBI','WOMENPRENEUR'] },
			{ name:'staffOnlyWrite', type:'bool' }, { name:'position', type:'number', min:1, max:100, onlyInt:true }, { name:'active', type:'bool' }
		], indexes:['CREATE UNIQUE INDEX idx_forum_channel_slug ON forum_channels (slug)','CREATE INDEX idx_forum_channel_position ON forum_channels (active, position)'] });
	app.save(channels);
	const messages = new Collection({ type:'base', name:'forum_messages', listRule:null, viewRule:null, createRule:null, updateRule:null, deleteRule:null,
		fields:[
			{ name:'channel', type:'relation', required:true, maxSelect:1, collectionId:channels.id, cascadeDelete:true },
			{ name:'author', type:'relation', maxSelect:1, collectionId:users.id, cascadeDelete:false },
			{ name:'authorKind', type:'select', required:true, maxSelect:1, values:['USER','SYSTEM'] },
			{ name:'authorName', type:'text', required:true, max:160 }, { name:'authorLabel', type:'text', required:true, max:200 },
			{ name:'content', type:'text', required:true, min:1, max:600 }, { name:'requestKey', type:'text', max:120 }, { name:'sentAt', type:'date', required:true }
		], indexes:['CREATE UNIQUE INDEX idx_forum_message_request ON forum_messages (author, requestKey) WHERE author != "" AND requestKey != ""','CREATE INDEX idx_forum_message_channel_sent ON forum_messages (channel, sentAt)'] });
	app.save(messages);
	const reactions = new Collection({ type:'base', name:'forum_reactions', listRule:null, viewRule:null, createRule:null, updateRule:null, deleteRule:null,
		fields:[
			{ name:'message', type:'relation', required:true, maxSelect:1, collectionId:messages.id, cascadeDelete:true },
			{ name:'user', type:'relation', required:true, maxSelect:1, collectionId:users.id, cascadeDelete:true },
			{ name:'emoji', type:'select', required:true, maxSelect:1, values:['👍','❤️','🎉'] }
		], indexes:['CREATE UNIQUE INDEX idx_forum_reaction_once ON forum_reactions (message, user, emoji)','CREATE INDEX idx_forum_reaction_message ON forum_reactions (message)'] });
	app.save(reactions);
	const presences = new Collection({ type:'base', name:'forum_presences', listRule:null, viewRule:null, createRule:null, updateRule:null, deleteRule:null,
		fields:[
			{ name:'user', type:'relation', required:true, maxSelect:1, collectionId:users.id, cascadeDelete:true },
			{ name:'channel', type:'relation', maxSelect:1, collectionId:channels.id, cascadeDelete:false },
			{ name:'lastSeenAt', type:'date', required:true }
		], indexes:['CREATE UNIQUE INDEX idx_forum_presence_user ON forum_presences (user)','CREATE INDEX idx_forum_presence_seen ON forum_presences (lastSeenAt)'] });
	app.save(presences);

	const definitions = [
		['pengumuman','pengumuman','Kabar resmi dari tim Corporate Secretary Pertamina Foundation.','Kanal searah: balasan dibuka di #tanya-jawab supaya pengumuman tetap mudah dicari.','',true,1],
		['sobi-alumni','sobi-alumni','Ruang santai alumni Beasiswa Sobat Bumi lintas angkatan dan kampus.','Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.','SOBI',false,2],
		['pfpreneur','pfpreneur','Obrolan pelaku UMKM binaan PFpreneur: pemasaran, produksi, dan permodalan.','Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.','WOMENPRENEUR',false,3],
		['mangrove','mangrove','Koordinasi aksi tanam dan perawatan mangrove tiap chapter.','Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.','',false,4],
		['tanya-jawab','tanya-jawab','Tempat bertanya apa saja. Tidak ada pertanyaan yang terlalu mendasar di sini.','Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.','',false,5]
	];
	for (const item of definitions) {
		const channel = new Record(channels); channel.set('slug',item[0]); channel.set('name',item[1]); channel.set('topic',item[2]); channel.set('note',item[3]); channel.set('community',item[4]); channel.set('staffOnlyWrite',item[5]); channel.set('position',item[6]); channel.set('active',true); app.save(channel);
		const message = new Record(messages); message.set('channel',channel.id); message.set('authorKind','SYSTEM'); message.set('authorName','Tim PFriends'); message.set('authorLabel','Pertamina Foundation'); message.set('content',`Selamat datang di #${item[1]}. Ruang ini sudah aktif dan seluruh percakapan tersimpan di PFriends.`); message.set('sentAt',new Date().toISOString()); app.save(message);
	}
}, (app) => {
	for (const name of ['forum_presences','forum_reactions','forum_messages','forum_channels']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
});
