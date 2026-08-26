import { Reward } from '$lib/domain/entities/Reward.js';
import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

function reward(record) {
	const quota = record.monthlyQuota ?? null;
	const remaining = record.remaining ?? quota;
	return new Reward({
		id: record.id, name: record.name, category: record.category,
		description: record.description || '', priceCoins: record.priceCoins,
		minTierLevel: record.minTierLevel, status: record.status,
		monthlyQuota: quota, redeemedThisMonth: quota === null ? 0 : Math.max(0, quota - remaining),
		quotaMonthKey: new Date().toISOString().slice(0, 7), requiresApproval: record.requiresApproval,
		community: record.community || '', fulfillmentNote: record.fulfillmentNote || '', image: record.image || ''
	});
}

export async function achievementData() {
	try {
		client();
		const response = await apiRequest('/api/pfriends/achievements');
		return { wallet: response.wallet, rewards: (response.rewards || []).map(reward), redemptions: response.redemptions || [] };
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Katalog pencapaian gagal dimuat.')); }
}

export async function redeemReward(rewardId, requestKey) {
	try {
		client();
		return await apiRequest('/api/pfriends/redemptions', { method: 'POST', body: { rewardId, requestKey } });
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Penukaran belum dapat diproses.')); }
}

export async function adminRedemptions(status = '') {
	try {
		const query = status ? `?status=${encodeURIComponent(status)}` : '';
		client();
		return await apiRequest(`/api/pfriends/admin/redemptions${query}`);
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Antrean penukaran gagal dimuat.')); }
}

export async function transitionRedemption(id, status, note = '') {
	try {
		client();
		return await apiRequest(`/api/pfriends/admin/redemptions/${id}/transition`, { method: 'POST', body: { status, note } });
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Status penukaran gagal diperbarui.')); }
}

export async function staffRewards() {
	try { client(); return await apiRequest('/api/pfriends/staff/rewards'); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Katalog hadiah gagal dimuat.')); }
}

export async function saveStaffReward(data, id = '') {
	try {
		client();
		return await apiRequest(id ? `/api/pfriends/staff/rewards/${id}` : '/api/pfriends/staff/rewards', { method: id ? 'PATCH' : 'POST', body: data });
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Hadiah gagal disimpan.')); }
}

export async function deleteStaffReward(id) {
	try { client(); return await apiRequest(`/api/pfriends/staff/rewards/${id}`, { method: 'DELETE' }); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Hadiah gagal dihapus.')); }
}
