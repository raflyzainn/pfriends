import { apiRoute } from '../api-router.js';
import { adminDashboard } from '../admin-dashboard.js';

apiRoute('GET', '/admin/dashboard', async (ctx) => { await ctx.principal({ roles: ['ADMIN'] }); return adminDashboard(await ctx.admin()); });
