import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// SPA statis: seluruh routing ditangani di sisi klien sehingga microsite
		// dapat di-host di static hosting mana pun (sama seperti portal Enduro).
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: false
		}),
		prerender: {
			handleMissingId: 'warn',
			handleHttpError: 'warn',
			handleUnseenRoutes: 'warn'
		}
	}
};

export default config;
