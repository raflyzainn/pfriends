import { ApiError } from './auth.js';

export async function sendBatch(pb, configure) {
	if (typeof pb.createBatch !== 'function') throw new ApiError(503, 'PocketBase Batch API tidak tersedia.', 'BLOCKED_BATCH_API');
	const batch = pb.createBatch();
	await configure(batch);
	try { return await batch.send(); }
	catch (error) {
		const disabled = Number(error?.status) === 403 && /batch requests are not allowed/i.test(String(error?.response?.message || error?.message || ''));
		if (disabled || [404, 405, 501].includes(Number(error?.status))) {
			throw new ApiError(503, 'PocketBase Batch API belum diaktifkan.', 'BLOCKED_BATCH_API');
		}
		throw error;
	}
}
