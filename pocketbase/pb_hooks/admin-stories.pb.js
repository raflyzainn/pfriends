routerAdd('GET', '/api/pfriends/admin/stories', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'ADMIN');
	const adminUtils = require(`${__hooks}/admin-story-utils.js`);
	const query = e.request.url.query();
	const page = Math.max(1, Number(query.get('page') || 1));
	const perPage = Math.min(50, Math.max(1, Number(query.get('perPage') || 20)));
	const status = String(query.get('status') || '').trim();
	const keyword = String(query.get('q') || '').trim().toLowerCase();
	const all = e.app.findRecordsByFilter('stories', 'id != ""', '-draftSavedAt,-submittedAt,-publishedAt', 0, 0);
	const counts = {};
	for (const row of all) counts[row.getString('status')] = (counts[row.getString('status')] || 0) + 1;
	const filtered = all.filter((row) => {
		if (status && row.getString('status') !== status) return false;
		if (!keyword) return true;
		return `${row.getString('title')} ${row.getString('authorName')} ${row.getString('authorLegacyId')}`.toLowerCase().includes(keyword);
	});
	const offset = (page - 1) * perPage;
	return e.json(200, { items: filtered.slice(offset, offset + perPage).map((row) => adminUtils.meta(e.app, row)), page, perPage, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / perPage)), statusCounts: counts });
}, $apis.requireAuth('users'));

routerAdd('GET', '/api/pfriends/admin/stories/{id}', (e) => {
	const utils = require(`${__hooks}/story-utils.js`); utils.requireRole(e, 'ADMIN');
	const adminUtils = require(`${__hooks}/admin-story-utils.js`);
	const row = e.app.findRecordById('stories', e.request.pathValue('id'));
	const reviews = e.app.findRecordsByFilter('story_reviews', 'story = {:story}', 'decidedAt', 0, 0, { story: row.id }).map((item) => ({ id: item.id, reviewerName: item.getString('reviewerName'), decision: item.getString('decision'), note: item.getString('note'), decidedAt: item.getString('decidedAt') }));
	const events = e.app.findRecordsByFilter('story_status_events', 'story = {:story}', 'occurredAt', 0, 0, { story: row.id }).map((item) => ({ id: item.id, actorName: item.getString('actorName'), eventType: item.getString('eventType'), fromStatus: item.getString('fromStatus'), toStatus: item.getString('toStatus'), note: item.getString('note'), occurredAt: item.getString('occurredAt') }));
	return e.json(200, { story: adminUtils.meta(e.app, row), reviews, events });
}, $apis.requireAuth('users'));
