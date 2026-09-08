import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const DEFAULT_LOCAL_URL = 'http://127.0.0.1:8090';

export function pocketBaseUrl() {
	const value = String(env.PB_URL || DEFAULT_LOCAL_URL).trim().replace(/\/$/, '');
	let parsed;
	try { parsed = new URL(value); } catch { throw new ServerConfigurationError('PB_URL tidak sah.'); }
	if (!['http:', 'https:'].includes(parsed.protocol)) throw new ServerConfigurationError('PB_URL tidak sah.');
	return parsed.toString().replace(/\/$/, '');
}

function client() {
	const pb = new PocketBase(pocketBaseUrl());
	pb.autoCancellation(false);
	return pb;
}

export function createUserPocketBase(token = '') {
	const pb = client();
	if (token) pb.authStore.save(token, null);
	return pb;
}

export async function createAdminPocketBase() {
	const email = String(env.PB_SUPERUSER_EMAIL || '').trim();
	const password = String(env.PB_SUPERUSER_PASSWORD || '');
	if (!email || !password) throw new ServerConfigurationError('Kredensial PocketBase server belum dikonfigurasi.');
	const pb = client();
	await pb.collection('_superusers').authWithPassword(email, password);
	return pb;
}

export class ServerConfigurationError extends Error {
	constructor(message) { super(message); this.name = 'ServerConfigurationError'; }
}
