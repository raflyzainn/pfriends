routerAdd('GET', '/api/pfriends/public/stories', (e) => {
	const utils = require(`${__hooks}/public-content-utils.js`);
	const rows = e.app.findRecordsByFilter('stories', utils.storyFilter(''), '-publishedAt', 0, 0);
	return e.json(200, { items: rows.map((row) => utils.storyDto(row, e.app)) });
});

routerAdd('GET', '/api/pfriends/public/stories/{slug}', (e) => {
	const utils = require(`${__hooks}/public-content-utils.js`);
	let record;
	try {
		record = e.app.findFirstRecordByFilter(
			'stories',
			utils.storyFilter('slug = {:slug}'),
			{ slug: e.request.pathValue('slug') }
		);
	} catch (_) {
		throw new NotFoundError('Cerita tidak ditemukan.');
	}
	return e.json(200, utils.storyDto(record, e.app));
});

routerAdd('GET', '/api/pfriends/public/leaderboard', (e) => {
	const rawLimit = Number(e.request.url.query().get('limit') || 8);
	const limit = Math.min(20, Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 8));
	const activeAwardees = e.app.findRecordsByFilter('awardees', 'status = "AKTIF"', '', 0, 0);
	const activeIds = new Set(activeAwardees.map((awardee) => awardee.id));
	const rows = e.app.findRecordsByFilter('gamification_profiles', 'totalPoints > 0', '', 0, 0)
		.filter((profile) => activeIds.has(profile.getString('awardee')))
		.map((profile) => ({ profile, points: profile.getInt('totalPoints') }))
		.filter((item) => item.points > 0)
		.sort((a, b) => b.points - a.points || a.profile.getString('fullName').localeCompare(b.profile.getString('fullName')));
	return e.json(200, {
		entries: rows.slice(0, limit).map((item, index) => ({
			rank: index + 1,
			awardeeId: item.profile.getString('awardeeId'),
			name: item.profile.getString('fullName'),
			community: item.profile.getString('community'),
			chapterId: item.profile.getString('chapterId'),
			points: item.points,
			tier: item.profile.getString('tier')
		}))
	});
});

routerAdd('GET', '/api/pfriends/public/communities', (e) => {
	const utils = require(`${__hooks}/public-content-utils.js`);
	return e.json(200, utils.communitySummary(e.app));
});

routerAdd('GET', '/api/pfriends/public/movements', (e) => {
	const utils = require(`${__hooks}/public-content-utils.js`);
	const rows = e.app.findRecordsByFilter('movements', utils.movementFilter(), '-startsAt', 0, 0);
	return e.json(200, { items: rows.map((row) => utils.movementDto(row, e.app)) });
});

routerAdd('GET', '/api/pfriends/public/impact', (e) => {
	const utils = require(`${__hooks}/public-content-utils.js`);
	return e.json(200, utils.publicImpact(e.app));
});
