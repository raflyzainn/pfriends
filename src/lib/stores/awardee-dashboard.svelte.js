import { fetchAwardeeDashboard } from '$lib/infrastructure/pocketbase/awardeeDashboard.js';

class AwardeeDashboardStore {
	broadcasts = $state.raw([]);
	events = $state.raw([]);
	stories = $state.raw([]);
	loaded = $state(false);
	loading = $state(false);
	error = $state(null);
	#pending = null;

	async load({ force = false } = {}) {
		if (this.#pending) return this.#pending;
		if (this.loaded && !force) return;
		this.loading = true;
		this.error = null;
		this.#pending = (async () => {
			try {
				const data = await fetchAwardeeDashboard();
				this.broadcasts = data.broadcasts;
				this.events = data.events;
				this.stories = data.stories;
				this.loaded = true;
			} catch (error) {
				this.error = error instanceof Error ? error.message : 'Ringkasan beranda Awardee gagal dimuat.';
			} finally {
				this.loading = false;
				this.#pending = null;
			}
		})();
		return this.#pending;
	}
}

export const awardeeDashboard = new AwardeeDashboardStore();
