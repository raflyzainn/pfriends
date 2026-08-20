import { getPocketBase, pocketBaseMessage } from './client.js';

export async function adminDashboardSnapshot() {
	const client = getPocketBase();
	if (!client) throw new Error('PocketBase hanya tersedia di peramban.');
	try {
		return await client.send('/api/pfriends/admin/dashboard', { requestKey: null });
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Dasbor KPI tidak dapat dimuat dari PocketBase.'));
	}
}
