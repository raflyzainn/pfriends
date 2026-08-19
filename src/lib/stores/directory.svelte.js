import { fetchDirectory } from '$lib/infrastructure/pocketbase/directory.js';

class DirectoryStore {
	items = $state.raw([]);
	stats = $state.raw({ active: 0, sobi: 0, womenpreneur: 0, mentors: 0 });
	facets = $state.raw({ cities: [], skills: [] });
	totalItems = $state(0);
	totalPages = $state(0);
	page = $state(0);
	loading = $state(false);
	error = $state(null);
	#request = 0;
	#query = {};

	async load(query = {}, { append = false } = {}) {
		const request = ++this.#request;
		this.loading = true; this.error = null;
		try {
			const response = await fetchDirectory({ ...query, page: append ? this.page + 1 : 1, perPage: 12 });
			if (request !== this.#request) return;
			this.#query = query;
			this.items = append ? [...this.items, ...response.items] : response.items;
			this.stats = response.stats; this.facets = response.facets;
			this.totalItems = response.totalItems; this.totalPages = response.totalPages; this.page = response.page;
		} catch (error) {
			if (request === this.#request) this.error = error instanceof Error ? error.message : 'Jejaring gagal dimuat.';
		} finally { if (request === this.#request) this.loading = false; }
	}

	loadMore() { return this.load(this.#query, { append: true }); }
	byId(id) { return this.items.find((item) => item.id === id) || null; }
}

export const directory = new DirectoryStore();
