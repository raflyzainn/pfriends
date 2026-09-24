import { browser } from '$app/environment';
import { localClient } from '../local/client.js';

export function getPocketBase() {
	if (!browser) return null;
	return localClient;
}

export function pocketBaseMessage(error, fallback = 'Data lokal tidak dapat memproses permintaan.') {
	const fieldMessage = Object.values(error?.response?.data ?? {}).find(
		(item) => typeof item?.message === 'string' && item.message.trim() !== ''
	)?.message;
	return fieldMessage || error?.response?.message || error?.message || fallback;
}
