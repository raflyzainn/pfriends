import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// UI tetap dirender di klien, sedangkan endpoint +server.js dijalankan
		// sebagai Cloudflare Pages Functions.
		adapter: adapter(),
		prerender: {
			handleMissingId: 'warn',
			handleHttpError: 'warn',
			handleUnseenRoutes: 'warn'
		}
	}
};

export default config;
