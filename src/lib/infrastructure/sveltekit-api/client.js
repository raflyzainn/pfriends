import { getPocketBase } from '$lib/infrastructure/pocketbase/client.js';

export async function apiRequest(path, options = {}) {
	const pb = getPocketBase();
	const headers = new Headers(options.headers || {});
	if (pb?.authStore?.token) headers.set('authorization', `Bearer ${pb.authStore.token}`);
	if (!(options.body instanceof FormData) && options.body !== undefined && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}
	const body = options.body instanceof FormData || typeof options.body === 'string'
		? options.body
		: options.body === undefined ? undefined : JSON.stringify(options.body);
	const response = await fetch(path, { ...options, headers, body });
	if (response.status === 204) return null;
	const data = await response.json().catch(() => ({}));
	if (!response.ok) {
		const error = new Error(data.message || 'Permintaan tidak dapat diproses.');
		error.status = response.status;
		error.code = data.code || 'REQUEST_FAILED';
		throw error;
	}
	return data;
}
