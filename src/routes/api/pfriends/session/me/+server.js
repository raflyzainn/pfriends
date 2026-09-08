import { json } from '@sveltejs/kit';
import { requirePrincipal } from '$lib/server/auth.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';

export async function GET({ request }) {
	try {
		const principal = await requirePrincipal(request, { allowApplicant: true });
		return json({ token: principal.token, record: principal.record }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Sesi gagal diperiksa.'); }
}
