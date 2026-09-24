const KEY = 'pfriends_dummy_auth';
const listeners = new Map();
let saved;
try { saved = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null'); } catch { saved = null; }

export const localClient = {
	authStore: {
		token: saved?.token || '', record: saved?.record || null,
		get isValid() { return Boolean(this.token && this.record); },
		save(token, record) {
			localStorage.setItem(KEY, JSON.stringify({ token, record }));
			this.token = token; this.record = record;
		},
		clear() { localStorage.removeItem(KEY); this.token = ''; this.record = null; }
	},
	files: {
		async getToken() { return ''; },
		getURL(record, filename) { return /^(data:|blob:|\/)/.test(filename || '') ? filename : ''; }
	},
	collection(name) {
		return { async subscribe(topic, callback) {
			const callbacks = listeners.get(name) || new Set();
			listeners.set(name, callbacks); callbacks.add(callback);
			return async () => { callbacks.delete(callback); };
		} };
	}
};

export function notifyLocalChange(name, event) {
	for (const callback of listeners.get(name) || []) Promise.resolve(callback(event)).catch(console.error);
}
