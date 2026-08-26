import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

export async function adminDashboardSnapshot() {
	const client = getPocketBase();
	if (!client) throw new Error('PocketBase hanya tersedia di peramban.');
	try {
		return await apiRequest('/api/pfriends/admin/dashboard');
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Dasbor KPI tidak dapat dimuat dari PocketBase.'));
	}
}
