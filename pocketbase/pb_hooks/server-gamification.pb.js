onRecordAfterCreateSuccess((e) => {
	try {
		const awardee = e.app.findFirstRecordByData('awardees', 'legacyId', e.record.getString('awardeeId'));
		require(`${__hooks}/gamification-utils.js`).ensureProfile(e.app, awardee);
	} catch (_) {}
	e.next();
}, 'verified_point_activities');

routerAdd('GET', '/api/pfriends/gamification/me', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE') throw new ForbiddenError('Sesi Awardee diperlukan.');
	const utils = require(`${__hooks}/gamification-utils.js`);
	const awardee = e.app.findFirstRecordByData('awardees', 'user', e.auth.id);
	const result = utils.ensureProfile(e.app, awardee);
	const wallet = require(`${__hooks}/reward-utils.js`).syncWallet(e.app, awardee);
	const badges = e.app.findRecordsByFilter('awardee_badges', 'awardee = {:awardee} && status = "ACTIVE"', 'awardedAt', 0, 0, { awardee: awardee.id });
	const catalog = e.app.findRecordsByFilter('badges', 'community = "" || community = {:community}', 'name', 0, 0, { community: awardee.getString('community') });
	return e.json(200, {
		profile: result.profile,
		wallet: { balance: wallet.getInt('balance'), lifetimeEarned: wallet.getInt('lifetimeEarned'), lifetimeSpent: wallet.getInt('lifetimeSpent') },
		ledger: result.entries.slice().reverse(),
		badges: catalog.map((badge) => ({ id: badge.id, code: badge.getString('code'), name: badge.getString('name'), family: badge.getString('family'), rarity: badge.getString('rarity'), criteria: badge.getString('criteria'), icon: badge.getString('icon'), community: badge.getString('community'), unlocked: badges.some((row) => row.getString('badgeCode') === badge.getString('code')) }))
	});
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/gamification/leaderboard', (e) => {
	if (!e.auth) throw new ForbiddenError('Sesi diperlukan.');
	const scope = e.request.url.query().get('scope') || 'global';
	const key = e.request.url.query().get('key') || '';
	const period = e.request.url.query().get('period') || 'all';
	const limit = Math.min(100, Math.max(1, Number(e.request.url.query().get('limit') || 20)));
	const all = require(`${__hooks}/gamification-utils.js`).ensureAll(e.app);
	const month = new Date().toISOString().slice(0, 7);
	let rows = all.map((item) => {
		let points = item.profile.getInt('totalPoints');
		if (period === 'month') points = item.entries.filter((entry) => entry.getString('occurredAt').slice(0, 7) === month).reduce((sum, entry) => sum + entry.getInt('points'), 0);
		return { profile: item.profile, points };
	}).filter((row) => row.points > 0);
	if (scope === 'community') rows = rows.filter((row) => row.profile.getString('community') === key);
	if (scope === 'chapter') rows = rows.filter((row) => row.profile.getString('chapterId') === key);
	rows.sort((a, b) => b.points - a.points || a.profile.getString('fullName').localeCompare(b.profile.getString('fullName')));
	return e.json(200, { entries: rows.slice(0, limit).map((row, index) => ({
		rank: index + 1, awardeeId: row.profile.getString('awardeeId'),
		name: row.profile.getBool('anonymousOnLeaderboard') ? 'Peserta anonim' : row.profile.getString('fullName'),
		community: row.profile.getString('community'), chapterId: row.profile.getString('chapterId'), points: row.points,
		tier: row.profile.getString('tier'), streakWeeks: row.profile.getInt('currentStreakWeeks')
	})) });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/verifier/dashboard', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'VERIFIER') throw new ForbiddenError('Hanya Verifikator yang dapat membuka dasbor ini.');
	const utils = require(`${__hooks}/gamification-utils.js`);
	const all = utils.ensureAll(e.app);
	const now = new Date();
	const cutoff = new Date(now.getTime() - 90 * 86400000);
	const monthly = [];
	for (let offset = 7; offset >= 0; offset--) {
		const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
		const key = date.toISOString().slice(0, 7);
		monthly.push({ key, label: date.toLocaleString('id-ID', { month: 'short', timeZone: 'Asia/Jakarta' }), points: 0 });
	}
	for (const item of all) for (const entry of item.entries) {
		const bucket = monthly.find((row) => row.key === entry.getString('occurredAt').slice(0, 7));
		if (bucket) bucket.points += entry.getInt('points');
	}
	const tiers = Object.fromEntries(utils.TIERS.map((item) => [item.level, 0]));
	const chapter = {};
	for (const item of all) {
		tiers[item.profile.getString('tier')]++;
		const key = `${item.profile.getString('community')} · ${item.profile.getString('chapterId')}`;
		chapter[key] = (chapter[key] || 0) + item.profile.getInt('totalPoints');
	}
	const ranked = all.filter((item) => item.profile.getInt('totalPoints') > 0).sort((a, b) => b.profile.getInt('totalPoints') - a.profile.getInt('totalPoints') || a.profile.getString('fullName').localeCompare(b.profile.getString('fullName')));
	return e.json(200, {
		generatedAt: now.toISOString(), totalPoints: all.reduce((sum, item) => sum + item.profile.getInt('totalPoints'), 0),
		registeredAwardees: all.length,
		activeAwardees: all.filter((item) => item.profile.getString('lastActiveAt') && new Date(item.profile.getString('lastActiveAt')) >= cutoff).length,
		monthly, tiers: Object.entries(tiers).map(([label, value]) => ({ label, value })),
		chapter: Object.entries(chapter).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
		activeStreaks: all.filter((item) => item.profile.getInt('currentStreakWeeks') > 0).length,
		badgeAwards: e.app.findRecordsByFilter('awardee_badges', 'status = "ACTIVE"', '', 0, 0).length,
		leaderboard: ranked.slice(0, 8).map((item, index) => ({ rank: index + 1, id: item.profile.getString('awardeeId'), name: item.profile.getBool('anonymousOnLeaderboard') ? 'Peserta anonim' : item.profile.getString('fullName'), community: item.profile.getString('community'), chapter: item.profile.getString('chapterId'), points: item.profile.getInt('totalPoints') }))
	});
}, $apis.requireAuth('users'));

routerAdd('POST', '/api/pfriends/point-activities/{id}/revoke', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'ADMIN') throw new ForbiddenError('Hanya Admin yang dapat mencabut poin.');
	const body = new DynamicModel({ reason: '' }); e.bindBody(body);
	const reason = String(body.reason || '').trim(); if (reason.length < 5) throw new BadRequestError('Alasan minimal lima karakter.');
	const row = e.app.findRecordById('verified_point_activities', e.request.pathValue('id'));
	if (row.getString('status') !== 'AWARDED') throw new BadRequestError('Poin ini sudah dicabut.');
	row.set('status', 'REVOKED'); row.set('revokedAt', new Date().toISOString()); row.set('revokeReason', reason); row.set('revokedBy', e.auth.id); e.app.save(row);
	const awardee = e.app.findFirstRecordByData('awardees', 'legacyId', row.getString('awardeeId'));
	require(`${__hooks}/gamification-utils.js`).ensureProfile(e.app, awardee);
	return e.json(200, { status: 'REVOKED' });
}, $apis.requireAuth('users'));
