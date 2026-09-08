migrate((app) => {
	const collection = app.findCollectionByNameOrId('point_actions');
	const rows = [
		['BROADCAST_VIEW', 'Membaca kabar mingguan', 'Membaca kabar mingguan yang diterbitkan Pertamina Foundation.', 'A', 'Diseminasi & Amplifikasi', 1, 3, 'SYSTEM'],
		['CTA_REACT', 'Menanggapi ajakan ringan', 'Memberikan tanggapan yang bermakna pada ajakan dalam kabar.', 'A', 'Diseminasi & Amplifikasi', 2, 5, 'SYSTEM'],
		['SHARE_PRIVATE', 'Membagikan konten ke WA atau jaringan pribadi', 'Membagikan kabar ke jaringan pribadi dengan bukti yang dapat diperiksa.', 'B', 'Diseminasi & Amplifikasi', 5, 3, 'EVIDENCE'],
		['SHARE_PUBLIC', 'Membagikan konten ke media sosial publik', 'Membagikan kabar ke media sosial publik dengan tautan dan bukti.', 'B', 'Diseminasi & Amplifikasi', 8, 2, 'EVIDENCE'],
		['STORY_SUBMIT', 'Mengirim cerita, nominasi, atau survei', 'Mengirim kontribusi cerita komunitas untuk ditinjau.', 'C', 'Community Journalism', 10, 1, 'SYSTEM'],
		['SESSION_ATTEND', 'Menghadiri sesi daring', 'Menghadiri sesi komunitas dan mengirim bukti kehadiran.', 'C', 'Kalender Komunitas', 15, 2, 'EVIDENCE'],
		['KNOWLEDGE_QA', 'Bertanya atau menjawab dengan bermanfaat', 'Membagikan pertanyaan atau jawaban yang berguna bagi komunitas.', 'C', 'Open Community Ecosystem', 15, 2, 'EVIDENCE'],
		['SPEAKER_MENTOR', 'Menjadi narasumber, mentor, atau fasilitator', 'Berkontribusi sebagai narasumber, mentor, atau fasilitator.', 'D', 'Recognition & Gamifikasi', 30, 1, 'EVIDENCE'],
		['LEAD_ACTION', 'Memimpin aksi atau kampanye lokal', 'Memimpin gerakan atau kampanye lokal yang terverifikasi.', 'D', 'Movement-Based Program', 50, 1, 'SYSTEM']
	];
	const now = new Date().toISOString();
	for (const item of rows) {
		let row;
		try { row = app.findFirstRecordByData('point_actions', 'code', item[0]); }
		catch (_) { row = new Record(collection); row.set('code', item[0]); row.set('createdAt', now); }
		row.set('label', item[1]);
		row.set('description', item[2]);
		row.set('actionClass', item[3]);
		row.set('pillar', item[4]);
		row.set('points', item[5]);
		row.set('dailyCap', item[6]);
		row.set('workflow', item[7]);
		row.set('status', 'ACTIVE');
		row.set('isCore', true);
		row.set('updatedAt', now);
		app.save(row);
	}
}, () => {});
