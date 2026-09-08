migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const awardees = app.findCollectionByNameOrId('awardees');
	const ledger = app.findCollectionByNameOrId('verified_point_activities');
	ledger.fields.add(new SelectField({ name: 'status', maxSelect: 1, values: ['AWARDED', 'REVOKED'] }));
	ledger.fields.add(new DateField({ name: 'revokedAt' }));
	ledger.fields.add(new TextField({ name: 'revokeReason', max: 1000 }));
	ledger.fields.add(new RelationField({ name: 'revokedBy', maxSelect: 1, collectionId: users.id }));
	app.save(ledger);

	const profiles = new Collection({
		type: 'base', name: 'gamification_profiles',
		listRule: '@request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN" || user = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN" || user = @request.auth.id',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'awardeeId', type: 'text', required: true, max: 80 },
			{ name: 'fullName', type: 'text', required: true, max: 160 },
			{ name: 'community', type: 'select', required: true, maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] },
			{ name: 'chapterId', type: 'text', required: true, max: 40 },
			{ name: 'totalPoints', type: 'number', min: 0, onlyInt: true },
			{ name: 'tier', type: 'select', required: true, maxSelect: 1, values: ['NEWCOMER','ACTIVE_MEMBER','CONTRIBUTOR','FEATURED_CANDIDATE','CHAMPION'] },
			{ name: 'currentStreakWeeks', type: 'number', min: 0, onlyInt: true },
			{ name: 'longestStreakWeeks', type: 'number', min: 0, onlyInt: true },
			{ name: 'anonymousOnLeaderboard', type: 'bool' },
			{ name: 'lastActiveAt', type: 'date' },
			{ name: 'recalculatedAt', type: 'date', required: true }
		],
		indexes: [
			'CREATE UNIQUE INDEX idx_gamification_awardee ON gamification_profiles (awardee)',
			'CREATE UNIQUE INDEX idx_gamification_user ON gamification_profiles (user)',
			'CREATE INDEX idx_gamification_rank ON gamification_profiles (totalPoints, fullName)'
		]
	});
	app.save(profiles);

	const badges = new Collection({
		type: 'base', name: 'badges',
		listRule: '@request.auth.id != ""', viewRule: '@request.auth.id != ""',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'code', type: 'text', required: true, max: 80 },
			{ name: 'name', type: 'text', required: true, max: 160 },
			{ name: 'family', type: 'text', required: true, max: 80 },
			{ name: 'rarity', type: 'select', required: true, maxSelect: 1, values: ['UMUM','LANGKA','EPIK','LEGENDARIS'] },
			{ name: 'criteria', type: 'text', required: true, max: 1000 },
			{ name: 'icon', type: 'text', required: true, max: 80 },
			{ name: 'community', type: 'select', maxSelect: 1, values: ['SOBI','WOMENPRENEUR'] }
		],
		indexes: ['CREATE UNIQUE INDEX idx_badges_code ON badges (code)']
	});
	app.save(badges);

	const awards = new Collection({
		type: 'base', name: 'awardee_badges',
		listRule: '@request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN" || user = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || @request.auth.role = "ADMIN" || user = @request.auth.id',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'badge', type: 'relation', required: true, maxSelect: 1, collectionId: badges.id, cascadeDelete: true },
			{ name: 'badgeCode', type: 'text', required: true, max: 80 },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['ACTIVE','REVOKED'] },
			{ name: 'awardedAt', type: 'date', required: true },
			{ name: 'revokedAt', type: 'date' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_awardee_badge ON awardee_badges (awardee, badge)']
	});
	app.save(awards);

	const definitions = [
		['BDG_LANGKAH_AWAL','Langkah Awal','ONBOARDING','UMUM','Menyelesaikan pendaftaran dan mencatatkan aksi berpoin pertama.','sparkles',''],
		['BDG_PEMBACA_SETIA','Pembaca Setia','AMPLIFIKASI','UMUM','Membaca sepuluh kabar mingguan Pfriends.','book-open',''],
		['BDG_PENANGGAP','Penanggap Aktif','AMPLIFIKASI','UMUM','Menanggapi sepuluh ajakan ringan pada kabar komunitas.','chat-bubble',''],
		['BDG_CORONG_KOMUNITAS','Corong Komunitas','AMPLIFIKASI','LANGKA','Lima share publik dengan bukti terverifikasi.','megaphone',''],
		['BDG_PENYAMBUNG_KABAR','Penyambung Kabar','AMPLIFIKASI','UMUM','Meneruskan konten ke jaringan pribadi delapan kali.','share',''],
		['BDG_HADIR_TERUS','Selalu Hadir','KONSISTENSI','LANGKA','Menghadiri lima sesi daring komunitas.','calendar-check',''],
		['BDG_RANTAI_PEKAN','Rantai Pekan','KONSISTENSI','LANGKA','Menjaga keaktifan enam pekan berturut-turut.','fire',''],
		['BDG_JURU_WARTA','Juru Warta','JURNALISME','LANGKA','Mengirim dua cerita komunitas terverifikasi.','pencil',''],
		['BDG_PENJAGA_PENGETAHUAN','Penjaga Pengetahuan','PENGETAHUAN','LANGKA','Empat kontribusi tanya jawab bermanfaat.','light-bulb',''],
		['BDG_MENTOR_SEJAWAT','Mentor Sejawat','MENTORING','EPIK','Menjadi narasumber atau mentor dua kali.','users',''],
		['BDG_PENGGERAK_LAPANGAN','Penggerak Lapangan','KEPEMIMPINAN','EPIK','Memimpin satu aksi lokal terverifikasi.','flag',''],
		['BDG_SAHABAT_BUMI','Sahabat Bumi','LINGKUNGAN','EPIK','Memimpin dua aksi lingkungan terverifikasi.','globe','SOBI'],
		['BDG_TUMBUH_BERSAMA','Tumbuh Bersama','EKONOMI','LANGKA','Tiga sesi upskilling dan satu cerita terverifikasi.','trending-up','WOMENPRENEUR'],
		['BDG_PILAR_KOMUNITAS','Pilar Komunitas','KEHORMATAN','LEGENDARIS','Champion yang pernah memimpin aksi dan menjadi mentor.','trophy','']
	];
	for (const item of definitions) {
		const record = new Record(badges);
		for (const [index, field] of ['code','name','family','rarity','criteria','icon','community'].entries()) record.set(field, item[index]);
		app.save(record);
	}
	for (const row of app.findRecordsByFilter('verified_point_activities', 'id != ""', '', 0, 0)) {
		row.set('status', 'AWARDED');
		app.save(row);
	}
}, (app) => {
	for (const name of ['awardee_badges','badges','gamification_profiles']) {
		try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	}
	try {
		const ledger = app.findCollectionByNameOrId('verified_point_activities');
		for (const field of ['status','revokedAt','revokeReason','revokedBy']) try { ledger.fields.removeByName(field); } catch (_) {}
		app.save(ledger);
	} catch (_) {}
});
