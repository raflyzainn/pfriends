import { buildSeed } from '../seed/seed-data.js';
import { bootstrapDatabase } from '../seed/bootstrap.js';
import { getDb, TABLE } from '../db.js';
import { PasswordHash } from '../../domain/value-objects/PasswordHash.js';
import { localClient, notifyLocalChange } from './client.js';
import { handleContent } from './content.js';
import { handleActivity, refreshLocalBalances } from './activity.js';
import { handlePeople } from './people.js';

const SNAPSHOT = 'dummySnapshot';
let pending = Promise.resolve();
function authRecord(account) {
	const { passwordHash, password, ...record } = account;
	return { ...record, legacyAccountId: account.id, onboardingStatus: account.onboardingStatus || 'APPROVED' };
}
async function normalizeBody(body) {
	if (!(body instanceof FormData)) return typeof body === 'string' ? JSON.parse(body) : body || {};
	const result = {};
	for (const key of new Set(body.keys())) {
		const values = await Promise.all(body.getAll(key).map(async value => {
			if (!(value instanceof Blob)) return value;
			return new Promise((resolve, reject) => {
				const reader = new FileReader(); reader.onload = () => resolve(reader.result);
				reader.onerror = () => reject(reader.error); reader.readAsDataURL(value);
			});
		}));
		result[key] = values.length > 1 || ['evidenceFiles', 'proofs', 'attachments'].includes(key) ? values : values[0];
	}
	return result;
}
async function request(path, options) {
	await bootstrapDatabase();
	const db = await getDb();
	if (!db) throw new Error('Penyimpanan lokal hanya tersedia di browser.');
	const saved = await db.table(TABLE.META).get(SNAPSHOT);
	const state = saved?.value || JSON.parse(JSON.stringify(buildSeed()));
	// Repository lama dan adapter lokal berbagi tabel yang sama.
	for (const name of Object.values(TABLE)) if (name !== TABLE.META) state[name] = await db.table(name).toArray();
	const url = new URL(path, 'http://local.invalid');
	const method = (options.method || 'GET').toUpperCase();
	const body = await normalizeBody(options.body);
	const user = state.accounts.find(account => account.id === localClient.authStore.record?.id);
	let result, failure;
	try {
		if (url.pathname === '/api/pfriends/auth/login') {
			const account = state.accounts.find(row => row.email.toLowerCase() === String(body.email || '').trim().toLowerCase());
			if (!account || !PasswordHash.fromStored(account.passwordHash).matches(body.password)) throw new Error('Email atau kata sandi tidak sesuai.');
			if (account.status !== 'AKTIF' && (!account.onboardingStatus || account.onboardingStatus === 'APPROVED')) throw new Error('Akun tidak aktif.');
			result = { token: `local:${account.id}`, record: authRecord(account) };
		} else {
			const publicRoute = url.pathname.includes('/public/') || url.pathname === '/api/pfriends/events' && method === 'GET' || url.pathname === '/api/pfriends/registrations' && method === 'POST';
			if (!publicRoute && !user) throw Object.assign(new Error('Silakan masuk terlebih dahulu.'), { status: 401 });
			if (url.pathname === '/api/pfriends/session/me') result = { token: `local:${user.id}`, record: authRecord(user) };
			else for (const handler of [handleContent, handleActivity, handlePeople]) {
				result = await handler(url.pathname, method, body, state, user, url.searchParams);
				if (result !== undefined) break;
			}
			if (result === undefined) throw new Error(`Aksi lokal belum tersedia: ${method} ${url.pathname}`);
		}
	} catch (error) { failure = error; }
	refreshLocalBalances(state);
	// ponytail: snapshot seluruh demo; gunakan transaksi per koleksi bila volume melampaui kebutuhan peragaan.
	await db.transaction('rw', db.tables, async () => {
		for (const name of Object.values(TABLE)) if (name !== TABLE.META && Array.isArray(state[name])) {
			await db.table(name).clear();
			await db.table(name).bulkPut(state[name]);
		}
		await db.table(TABLE.META).put({ key: SNAPSHOT, value: state });
	});
	if (failure) throw failure;
	if (method !== 'GET' && url.pathname.includes('/forum/')) {
		if (url.pathname.endsWith('/heartbeat')) notifyLocalChange('forum_presences', {});
		else if (url.pathname.endsWith('/reaction')) notifyLocalChange('forum_reactions', { record: { message: url.pathname.split('/').at(-2) } });
		else if (result?.id && url.pathname.endsWith('/messages')) notifyLocalChange('forum_messages', { action: 'create', record: { ...result, channel: result.channelId } });
	}
	return structuredClone(result);
}
export function localRequest(path, options = {}) {
	const run = () => globalThis.navigator?.locks
		? navigator.locks.request('pfriends-dummy-write', () => request(path, options))
		: request(path, options);
	const result = pending.then(run, run);
	pending = result.catch(() => {});
	return result;
}
