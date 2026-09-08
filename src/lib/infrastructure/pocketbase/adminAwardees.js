import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

export async function listAdminAwardees(filters = {}) {
	try {
		const params = new URLSearchParams({ page: String(filters.page || 1), perPage: String(filters.perPage || 20) });
		for (const [key, value] of Object.entries({ q: filters.query, accountStatus: filters.accountStatus, membershipStatus: filters.membershipStatus, community: filters.community, chapter: filters.chapter })) if (String(value || '').trim()) params.set(key, String(value).trim());
		client(); return await apiRequest(`/api/pfriends/admin/awardees?${params}`);
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Daftar Awardee gagal dimuat.')); }
}

export async function adminAwardeeHistory(id) {
	try { client(); return await apiRequest(`/api/pfriends/admin/awardees/${encodeURIComponent(id)}/history`); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Riwayat Awardee gagal dimuat.')); }
}

export async function changeAdminAwardeeStatus(id, kind, status, reason) {
	const segment = kind === 'membership' ? 'membership-status' : 'account-status';
	try { client(); return await apiRequest(`/api/pfriends/admin/awardees/${encodeURIComponent(id)}/${segment}`, { method: 'POST', body: { status, reason } }); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Status Awardee gagal diubah.')); }
}

export async function beginAwardeeImpersonation(id) {
	try { client(); return await apiRequest(`/api/pfriends/admin/awardees/${encodeURIComponent(id)}/impersonate`, { method: 'POST' }); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Sesi Awardee gagal dibuka.')); }
}

export async function endAwardeeImpersonation(id) {
	try { client(); return await apiRequest(`/api/pfriends/admin/impersonations/${encodeURIComponent(id)}/end`, { method: 'POST' }); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Akhir sesi impersonasi gagal dicatat.')); }
}
