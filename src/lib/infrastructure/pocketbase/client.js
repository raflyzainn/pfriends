import { browser } from '$app/environment';
import PocketBase from 'pocketbase';

export const POCKETBASE_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';

/** @type {PocketBase|null} */
let client = null;

export function getPocketBase() {
	if (!browser) return null;
	client ??= new PocketBase(POCKETBASE_URL);
	client.autoCancellation(false);
	return client;
}

export function pocketBaseMessage(error, fallback = 'PocketBase tidak dapat memproses permintaan.') {
	const fieldMessage = Object.values(error?.response?.data ?? {}).find(
		(item) => typeof item?.message === 'string' && item.message.trim() !== ''
	)?.message;
	return fieldMessage || error?.response?.message || error?.message || fallback;
}
