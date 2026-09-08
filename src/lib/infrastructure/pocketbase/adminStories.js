import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

export async function listAdminStories({ page = 1, perPage = 20, status = '', query = '' } = {}) {
	try {
		const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
		if (status) params.set('status', status);
		if (query.trim()) params.set('q', query.trim());
		client(); return await apiRequest(`/api/pfriends/admin/stories?${params}`);
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Pemantauan Cerita gagal dimuat.'));
	}
}

export async function adminStoryDetail(id) {
	try { client(); return await apiRequest(`/api/pfriends/admin/stories/${encodeURIComponent(id)}`); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Audit Cerita gagal dimuat.')); }
}
