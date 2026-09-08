import { json } from '@sveltejs/kit';
import { requirePrincipal, ApiError } from './auth.js';
import { createAdminPocketBase } from './pocketbase.js';
import { apiFailure } from './response.js';

/** @type {Array<{method:string, pattern:string, regex:RegExp, keys:string[], handler:Function}>} */
const routes = [];

function compile(pattern) {
	const keys = [];
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{([a-zA-Z][a-zA-Z0-9_]*)\\\}/g, (_, key) => {
		keys.push(key);
		return '([^/]+)';
	});
	return { regex: new RegExp(`^${escaped}$`), keys };
}

export function apiRoute(method, pattern, handler) {
	const { regex, keys } = compile(pattern);
	routes.push({ method: method.toUpperCase(), pattern, regex, keys, handler });
}

function context(event, params) {
	let adminPromise;
	return {
		...event,
		params,
		admin() { return adminPromise ??= createAdminPocketBase(); },
		principal(options = {}) { return requirePrincipal(event.request, options); },
		async body() {
			const type = event.request.headers.get('content-type') || '';
			return type.includes('multipart/form-data') ? event.request.formData() : event.request.json().catch(() => ({}));
		}
	};
}

export async function dispatchApi(event) {
	try {
		const path = `/${event.params.path || ''}`;
		const method = event.request.method.toUpperCase();
		const route = routes.find((entry) => entry.method === method && entry.regex.test(path));
		if (!route) throw new ApiError(404, 'Endpoint SvelteKit API belum tersedia.', 'ENDPOINT_NOT_MIGRATED');
		const match = route.regex.exec(path);
		const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
		const result = await route.handler(context(event, params));
		if (result instanceof Response) return result;
		const envelope = result && typeof result === 'object'
			&& Object.hasOwn(result, 'body')
			&& Number.isInteger(result.status)
			&& result.status >= 200
			&& result.status <= 599;
		return json(envelope ? result.body : result ?? {}, {
			status: envelope ? result.status : 200,
			headers: envelope ? result.headers : undefined
		});
	} catch (error) { return apiFailure(error); }
}

export function noContent() { return new Response(null, { status: 204 }); }
