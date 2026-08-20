routerAdd('GET', '/api/pfriends/admin/dashboard', (e) => {
	const utils = require(`${__hooks}/admin-dashboard-utils.js`);
	utils.requireAdmin(e);
	return e.json(200, utils.dashboard(e.app));
}, $apis.requireAuth('users'));
