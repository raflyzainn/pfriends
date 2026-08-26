import { json } from '@sveltejs/kit';
import { requirePrincipal, ApiError } from '$lib/server/auth.js';
import { createAdminPocketBase } from '$lib/server/pocketbase.js';
import { sendBatch } from '$lib/server/batch.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';
import { profileFields, recordId, validateRegistration } from '$lib/server/registration.js';

export async function GET({ request }) {
	try {
		const principal = await requirePrincipal(request, { roles: ['AWARDEE'], allowApplicant: true });
		const admin = await createAdminPocketBase();
		const registration = await admin.collection('awardee_registrations').getFirstListItem(admin.filter('owner = {:owner}', { owner: principal.record.id })).catch((error) => {
			if (error?.status === 404) return null;
			throw error;
		});
		return json({ registration }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Status registrasi gagal dimuat.'); }
}

export async function PATCH({ request }) {
	try {
		const principal = await requirePrincipal(request, { roles: ['AWARDEE'], allowApplicant: true });
		const admin = await createAdminPocketBase();
		let registration;
		try { registration = await admin.collection('awardee_registrations').getFirstListItem(admin.filter('owner = {:owner}', { owner: principal.record.id })); }
		catch (error) { if (error?.status === 404) throw new ApiError(404, 'Registrasi tidak ditemukan.'); throw error; }
		if (registration.status !== 'CLARIFICATION') throw new ApiError(409, 'Registrasi tidak sedang menunggu klarifikasi.');
		const form = await request.formData();
		const proofs = form.getAll('proofs').filter((item) => item instanceof File && item.size > 0);
		const normalized = validateRegistration(form, proofs, true);
		const fields = profileFields(form, normalized);
		const now = new Date().toISOString();
		const update = new FormData();
		for (const [key, value] of Object.entries({ ...fields, status: 'PENDING', reviewer: '', reviewerName: '', reviewNote: '', reviewedAt: '', submittedAt: now })) {
			if (value !== null) update.set(key, String(value));
		}
		for (const proof of proofs) update.append('proofs', proof, proof.name);
		await sendBatch(admin, (batch) => {
			batch.collection('awardee_registrations').update(registration.id, update);
			batch.collection('users').update(principal.record.id, { displayName: fields.fullName, community: fields.community, onboardingStatus: 'PENDING' });
			batch.collection('registration_reviews').create({ id: recordId(), registration: registration.id, reviewer: principal.record.id, reviewerName: fields.fullName, decision: 'RESUBMIT', note: 'Data dan bukti klarifikasi dikirim ulang oleh pendaftar.', decidedAt: now });
		});
		return json({ status: 'PENDING', message: 'Klarifikasi berhasil dikirim ulang.' }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Klarifikasi gagal dikirim ulang.'); }
}
