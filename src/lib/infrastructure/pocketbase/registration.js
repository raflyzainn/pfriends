import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() {
	const pb = getPocketBase();
	if (!pb) throw new Error('PocketBase tidak tersedia di lingkungan ini.');
	return pb;
}

export async function submitRegistration(formData) {
	try {
		return await apiRequest('/api/pfriends/registrations', { method: 'POST', body: formData });
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Registrasi gagal dikirim.'));
	}
}

export async function myRegistration() {
	const pb = client();
	if (!pb.authStore.isValid) return null;
	try {
		return (await apiRequest('/api/pfriends/registrations/me')).registration;
	} catch (error) {
		if (error?.status === 404) return null;
		throw new Error(pocketBaseMessage(error, 'Status registrasi gagal dimuat.'));
	}
}

export async function resubmitRegistration(formData) {
	try {
		return await apiRequest('/api/pfriends/registrations/me', { method: 'PATCH', body: formData });
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Klarifikasi gagal dikirim.'));
	}
}

export async function registrationQueue() {
	try {
		client();
		return (await apiRequest('/api/pfriends/registrations')).items || [];
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Antrean registrasi gagal dimuat.'));
	}
}

export async function registrationReviews(registrationId) {
	try {
		client();
		return (await apiRequest(`/api/pfriends/registrations/${encodeURIComponent(registrationId)}/reviews`)).items || [];
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Riwayat keputusan gagal dimuat.'));
	}
}

export async function decideRegistration(registrationId, decision, note = '') {
	try {
		return await apiRequest(`/api/pfriends/registrations/${registrationId}/decision`, {
			method: 'POST',
			body: { decision, note }
		});
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Keputusan registrasi gagal disimpan.'));
	}
}

export async function proofUrls(record) {
	const pb = client();
	const token = await pb.files.getToken();
	return (record?.proofs ?? []).map((name) => ({
		name,
		url: pb.files.getURL(record, name, { token })
	}));
}
