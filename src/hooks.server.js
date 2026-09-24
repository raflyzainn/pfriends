// Versi demo ini tidak menyediakan API server, termasuk saat Vite berjalan.
export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/api/')) return new Response('Demo memakai penyimpanan browser.', { status: 404 });
	return resolve(event);
}
