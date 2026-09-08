import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createAdminPocketBase, createUserPocketBase } from '$lib/server/pocketbase.js';
import { ApiError } from '$lib/server/auth.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';

const APPLICANT = new Set(['PENDING', 'CLARIFICATION', 'REJECTED']);

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const email = String(body.email || '').trim().toLowerCase();
		const password = String(body.password || '');
		if (!email || !password) throw new ApiError(400, 'Email dan kata sandi wajib diisi.');
		const pb = createUserPocketBase();
		let result;
		try { result = await pb.collection('users').authWithPassword(email, password); }
		catch { throw new ApiError(401, 'Email atau kata sandi tidak sesuai.'); }
		const record = result.record;
		const applicant = record.role === 'AWARDEE' && APPLICANT.has(String(record.onboardingStatus || ''));
		if (record.status !== 'AKTIF' && !applicant) throw new ApiError(403, 'Akun tidak aktif.');
		if (['ADMIN', 'VERIFIER'].includes(record.role) && env.PB_REQUIRE_STAFF_SSO === '1') {
			throw new ApiError(403, 'Login staf menggunakan SSO dan belum tersedia pada lingkungan ini.');
		}
		const lastLoginAt = new Date().toISOString(), admin = await createAdminPocketBase();
		await admin.collection('users').update(record.id, { lastLoginAt });
		return json({ token: result.token || pb.authStore.token, record: { ...record, lastLoginAt } }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Masuk gagal diproses.'); }
}
