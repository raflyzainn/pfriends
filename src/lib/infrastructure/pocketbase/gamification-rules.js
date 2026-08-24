import { getPocketBase, pocketBaseMessage } from './client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

async function send(path, options, fallback) {
	try {
		return await client().send(path, options);
	} catch (error) {
		throw new Error(pocketBaseMessage(error, fallback));
	}
}

export const adminGamificationRules = () =>
	send('/api/pfriends/admin/gamification/rules', {}, 'Aturan gamifikasi gagal dimuat.');

export const previewTierThresholds = (thresholds) =>
	send('/api/pfriends/admin/gamification/tiers/preview', { method: 'POST', body: { thresholds } }, 'Dampak perubahan tier gagal dihitung.');

export const applyTierThresholds = (thresholds, expectedVersion) =>
	send('/api/pfriends/admin/gamification/tiers', { method: 'PUT', body: { thresholds, expectedVersion } }, 'Ambang tier gagal diterapkan.');

export const tierRuleAudits = () =>
	send('/api/pfriends/admin/gamification/tiers/audit', {}, 'Audit tier gagal dimuat.');
