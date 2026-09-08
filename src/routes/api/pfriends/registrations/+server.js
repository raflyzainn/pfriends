import { json } from '@sveltejs/kit';
import { createAdminPocketBase } from '$lib/server/pocketbase.js';
import { ApiError, requirePrincipal } from '$lib/server/auth.js';
import { sendBatch } from '$lib/server/batch.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';
import { CONSENT_VERSION, profileFields, recordId, text, validateRegistration } from '$lib/server/registration.js';
import { passwordChecks } from '$lib/domain/constants/password-policy.js';

async function exists(pb, collection, filter) {
	try { await pb.collection(collection).getFirstListItem(filter, { fields: 'id' }); return true; }
	catch (error) { if (error?.status === 404) return false; throw error; }
}

export async function GET({ request }) {
	try {
		await requirePrincipal(request, { roles: ['VERIFIER', 'ADMIN'] });
		const pb = await createAdminPocketBase();
		const items = await pb.collection('awardee_registrations').getFullList({ sort: '-submittedAt' });
		return json({ items }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Antrean registrasi gagal dimuat.'); }
}

export async function POST({ request }) {
	try {
		const form = await request.formData();
		const proofs = form.getAll('proofs').filter((item) => item instanceof File && item.size > 0);
		const normalized = validateRegistration(form, proofs, false);
		const email = text(form.get('email')).toLowerCase();
		const password = String(form.get('password') || '');
		if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'Alamat email tidak sah.');
		const passwordStatus = passwordChecks(password);
		if (!passwordStatus.length) throw new ApiError(400, 'Kata sandi minimal delapan karakter.');
		if (!passwordStatus.uppercase) throw new ApiError(400, 'Kata sandi harus memiliki huruf kapital.');
		if (!passwordStatus.number) throw new ApiError(400, 'Kata sandi harus memiliki angka.');
		if (password !== String(form.get('passwordConfirm') || '')) throw new ApiError(400, 'Konfirmasi kata sandi tidak cocok.');
		const fields = profileFields(form, normalized);
		const pb = await createAdminPocketBase();
		if (await exists(pb, 'users', pb.filter('email = {:email}', { email }))) throw new ApiError(409, 'Email sudah terdaftar.');
		if (await exists(pb, 'awardee_registrations', pb.filter('whatsapp = {:whatsapp}', { whatsapp: fields.whatsapp }))) throw new ApiError(409, 'Nomor WhatsApp sudah terdaftar.');
		const userId = recordId();
		const registrationId = recordId();
		const now = new Date().toISOString();
		const registration = new FormData();
		for (const [key, value] of Object.entries({ id: registrationId, owner: userId, email, ...fields, consentVersion: CONSENT_VERSION, consentedAt: now, status: 'PENDING', revisionCount: 0, submittedAt: now })) {
			if (value !== null) registration.set(key, String(value));
		}
		for (const proof of proofs) registration.append('proofs', proof, proof.name);
		await sendBatch(pb, (batch) => {
			batch.collection('users').create({ id: userId, email, emailVisibility: false, password, passwordConfirm: password, legacyAccountId: `PB-${email}`, awardeeId: '', role: 'AWARDEE', displayName: fields.fullName, unit: '', community: fields.community, status: 'NONAKTIF', onboardingStatus: 'PENDING' });
			batch.collection('awardee_registrations').create(registration);
		});
		return json({ id: registrationId, status: 'PENDING', message: 'Registrasi berhasil dikirim.' }, { status: 201, headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Registrasi gagal dikirim.'); }
}
