routerAdd('GET', '/api/pfriends/achievements', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Sesi Awardee aktif diperlukan.');
	const utils = require(`${__hooks}/reward-utils.js`);
	const awardee = e.app.findFirstRecordByData('awardees', 'user', e.auth.id);
	require(`${__hooks}/gamification-utils.js`).ensureProfile(e.app, awardee);
	const account = utils.syncWallet(e.app, awardee);
	const month = new Date().toISOString().slice(0, 7);
	const rewards = e.app.findRecordsByFilter('rewards', 'community = "" || community = {:community}', 'priceCoins', 0, 0, { community: awardee.getString('community') }).map((row) => utils.rewardDto(e.app, row, month));
	const orders = e.app.findRecordsByFilter('redemptions', 'awardee = {:awardee}', '-requestedAt', 0, 0, { awardee: awardee.id }).map(utils.redemptionDto);
	return e.json(200, { wallet: { balance: account.getInt('balance'), lifetimeEarned: account.getInt('lifetimeEarned'), lifetimeSpent: account.getInt('lifetimeSpent') }, rewards, redemptions: orders });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/redemptions', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Sesi Awardee aktif diperlukan.');
	const body = new DynamicModel({ rewardId: '', requestKey: '' }); e.bindBody(body);
	const rewardId = String(body.rewardId || '').trim(); const requestKey = String(body.requestKey || '').trim();
	if (!rewardId || requestKey.length < 8 || requestKey.length > 180) throw new BadRequestError('Permintaan penukaran tidak valid.');
	let response = null;
	e.app.runInTransaction((tx) => {
		const utils = require(`${__hooks}/reward-utils.js`);
		const existing = utils.findOne(tx, 'redemptions', 'requestKey = {:key}', { key: requestKey });
		if (existing) { if (existing.getString('user') !== e.auth.id) throw new ForbiddenError('Kunci permintaan sudah digunakan.'); response = existing; return; }
		const awardee = tx.findFirstRecordByData('awardees', 'user', e.auth.id);
		require(`${__hooks}/gamification-utils.js`).ensureProfile(tx, awardee);
		const account = utils.syncWallet(tx, awardee);
		const reward = tx.findRecordById('rewards', rewardId);
		if (reward.getString('status') !== 'TERSEDIA') throw new BadRequestError('Hadiah belum tersedia.');
		if (reward.getString('community') && reward.getString('community') !== awardee.getString('community')) throw new BadRequestError('Hadiah tidak tersedia untuk komunitas Anda.');
		const profile = tx.findFirstRecordByData('gamification_profiles', 'awardee', awardee.id);
		const ranks = ['NEWCOMER','ACTIVE_MEMBER','CONTRIBUTOR','FEATURED_CANDIDATE','CHAMPION'];
		if (ranks.indexOf(profile.getString('tier')) < ranks.indexOf(reward.getString('minTierLevel'))) throw new BadRequestError('Jenjang Anda belum memenuhi syarat hadiah.');
		if (account.getInt('balance') < reward.getInt('priceCoins')) throw new BadRequestError('Saldo Koin Tukar tidak mencukupi.');
		const now = new Date().toISOString(); const month = now.slice(0, 7); const quota = reward.getInt('monthlyQuota');
		if (quota > 0) {
			const used = tx.findRecordsByFilter('redemptions', 'reward = {:reward} && quotaMonth = {:month} && status != "DITOLAK"', '', 0, 0, { reward: reward.id, month }).length;
			if (used >= quota) throw new BadRequestError('Kuota penukaran bulan ini sudah habis.');
		}
		const row = new Record(tx.findCollectionByNameOrId('redemptions'));
		row.set('requestKey', requestKey); row.set('awardee', awardee.id); row.set('user', e.auth.id); row.set('reward', reward.id);
		row.set('awardeeName', awardee.getString('fullName')); row.set('awardeeWhatsapp', awardee.getString('whatsapp'));
		row.set('rewardName', reward.getString('name')); row.set('coins', reward.getInt('priceCoins'));
		row.set('status', reward.getBool('requiresApproval') ? 'DIAJUKAN' : 'DIKIRIM'); row.set('quotaMonth', month);
		row.set('note', reward.getString('fulfillmentNote')); row.set('requestedAt', now);
		if (!reward.getBool('requiresApproval')) row.set('shippedAt', now);
		tx.save(row);
		utils.addTransaction(tx, awardee, `REDEMPTION:${row.id}`, 'REDEMPTION_DEBIT', -reward.getInt('priceCoins'), row.id, `Penukaran ${reward.getString('name')}.`, now);
		utils.recalculateAccount(tx, awardee); response = row;
	});
	const utils = require(`${__hooks}/reward-utils.js`); const awardee = e.app.findFirstRecordByData('awardees', 'user', e.auth.id); const account = utils.syncWallet(e.app, awardee);
	return e.json(201, { redemption: utils.redemptionDto(response), wallet: { balance: account.getInt('balance'), lifetimeEarned: account.getInt('lifetimeEarned'), lifetimeSpent: account.getInt('lifetimeSpent') } });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/admin/redemptions', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'ADMIN' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Hanya Admin aktif yang dapat memproses penukaran.');
	const status = e.request.url.query().get('status') || ''; const utils = require(`${__hooks}/reward-utils.js`);
	const rows = status ? e.app.findRecordsByFilter('redemptions', 'status = {:status}', '-requestedAt', 0, 0, { status }) : e.app.findRecordsByFilter('redemptions', 'id != ""', '-requestedAt', 0, 0);
	return e.json(200, { redemptions: rows.map(utils.redemptionDto) });
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/admin/redemptions/{id}/transition', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'ADMIN' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Hanya Admin aktif yang dapat memproses penukaran.');
	const body = new DynamicModel({ status: '', note: '' }); e.bindBody(body);
	const target = String(body.status || '').trim(); const note = String(body.note || '').trim();
	const allowed = { DIAJUKAN: ['DISETUJUI','DITOLAK'], DISETUJUI: ['DIKIRIM'], DIKIRIM: ['SELESAI'] };
	let response = null;
	e.app.runInTransaction((tx) => {
		const row = tx.findRecordById('redemptions', e.request.pathValue('id')); const from = row.getString('status');
		if (!(allowed[from] || []).includes(target)) throw new BadRequestError(`Perubahan status ${from} ke ${target} tidak diizinkan.`);
		if (target === 'DITOLAK' && note.length < 5) throw new BadRequestError('Alasan penolakan minimal lima karakter.');
		const now = new Date().toISOString(); row.set('status', target); row.set('adminNote', note); row.set('actedBy', e.auth.id);
		if (target === 'DISETUJUI') row.set('decidedAt', now); if (target === 'DIKIRIM') row.set('shippedAt', now);
		if (target === 'SELESAI') row.set('fulfilledAt', now);
		if (target === 'DITOLAK') {
			row.set('decidedAt', now); row.set('rejectedAt', now);
			const utils = require(`${__hooks}/reward-utils.js`); const awardee = tx.findRecordById('awardees', row.getString('awardee'));
			utils.addTransaction(tx, awardee, `REFUND:${row.id}`, 'REDEMPTION_REFUND', row.getInt('coins'), row.id, note, now); utils.recalculateAccount(tx, awardee);
		}
		tx.save(row); response = row;
	});
	return e.json(200, { redemption: require(`${__hooks}/reward-utils.js`).redemptionDto(response) });
}, $apis.requireAuth('users'));
