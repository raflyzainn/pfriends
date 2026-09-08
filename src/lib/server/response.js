import { json } from '@sveltejs/kit';
import { ApiError } from './auth.js';
import { ServerConfigurationError } from './pocketbase.js';

export function apiFailure(error, fallback = 'Permintaan tidak dapat diproses.') {
	if (error instanceof ApiError) return json({ message: error.message, code: error.code }, { status: error.status });
	if (error instanceof ServerConfigurationError) return json({ message: 'Layanan backend belum dikonfigurasi.', code: 'SERVER_CONFIGURATION' }, { status: 503 });
	const status = Number(error?.status) || 0;
	if (status === 400) return json({ message: 'Data permintaan ditolak oleh penyimpanan.', code: 'UPSTREAM_VALIDATION' }, { status: 400 });
	if (status === 401) return json({ message: 'Kredensial backend tidak dapat digunakan.', code: 'UPSTREAM_AUTH' }, { status: 503 });
	if (status === 403) return json({ message: 'Operasi ditolak oleh aturan penyimpanan.', code: 'UPSTREAM_FORBIDDEN' }, { status: 503 });
	if (status === 404) return json({ message: 'Data tidak ditemukan.', code: 'NOT_FOUND' }, { status: 404 });
	if (status === 409) return json({ message: 'Data telah berubah. Muat ulang lalu coba kembali.', code: 'CONFLICT' }, { status: 409 });
	if (status === 429) return json({ message: 'Terlalu banyak permintaan. Coba kembali nanti.', code: 'RATE_LIMITED' }, { status: 429 });
	return json({ message: fallback, code: 'UPSTREAM_FAILURE' }, { status: 503 });
}

export function noStoreHeaders() { return { 'cache-control': 'no-store' }; }
