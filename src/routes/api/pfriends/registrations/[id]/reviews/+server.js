import { json } from '@sveltejs/kit';
import { requirePrincipal, ApiError } from '$lib/server/auth.js';
import { createAdminPocketBase } from '$lib/server/pocketbase.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';

export async function GET({ request, params }) {
	try {
		const principal = await requirePrincipal(request, { roles: ['AWARDEE', 'VERIFIER', 'ADMIN'], allowApplicant: true });
		const pb = await createAdminPocketBase();
		const registration = await pb.collection('awardee_registrations').getOne(params.id, { fields: 'id,owner' });
		if (principal.role === 'AWARDEE' && registration.owner !== principal.record.id) {
			throw new ApiError(403, 'Riwayat registrasi ini tidak dapat diakses.');
		}
		const items = await pb.collection('registration_reviews').getFullList({
			filter: pb.filter('registration = {:registration}', { registration: params.id }),
			sort: '-decidedAt'
		});
		return json({ items }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Riwayat keputusan gagal dimuat.'); }
}
