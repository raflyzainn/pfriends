import { createUserPocketBase } from './pocketbase.js';

const ROLES = new Set(['AWARDEE', 'VERIFIER', 'ADMIN']);
const APPLICANT_STATUSES = new Set(['PENDING', 'CLARIFICATION', 'REJECTED']);

export function bearerToken(request) {
	const value = request.headers.get('authorization') || '';
	const match = /^Bearer\s+(.+)$/i.exec(value.trim());
	return match?.[1]?.trim() || '';
}

export async function requirePrincipal(request, options = {}) {
	const token = bearerToken(request);
	if (!token) throw new ApiError(401, 'Sesi diperlukan.');
	const pb = createUserPocketBase(token);
	let auth;
	try { auth = await pb.collection('users').authRefresh(); }
	catch { throw new ApiError(401, 'Sesi tidak valid atau sudah berakhir.'); }
	const record = auth.record;
	const role = String(record.role || '');
	if (!ROLES.has(role)) throw new ApiError(403, 'Peran akun tidak dikenal.');
	const applicant = role === 'AWARDEE' && APPLICANT_STATUSES.has(String(record.onboardingStatus || ''));
	if (record.status !== 'AKTIF' && !(options.allowApplicant && applicant)) throw new ApiError(403, 'Akun tidak aktif.');
	if (options.roles?.length && !options.roles.includes(role)) throw new ApiError(403, 'Anda tidak memiliki akses untuk operasi ini.');
	return { pb, token: auth.token || pb.authStore.token, record, role, applicant };
}

export class ApiError extends Error {
	constructor(status, message, code = 'REQUEST_REJECTED') {
		super(message); this.name = 'ApiError'; this.status = status; this.code = code;
	}
}
