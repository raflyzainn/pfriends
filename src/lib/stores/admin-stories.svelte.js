import { adminStoryDetail, listAdminStories } from '$lib/infrastructure/pocketbase/adminStories.js';

class AdminStoriesStore {
	items = $state.raw([]);
	statusCounts = $state.raw({});
	page = $state.raw({ page: 1, perPage: 20, totalItems: 0, totalPages: 1 });
	selected = $state.raw(null);
	reviews = $state.raw([]);
	events = $state.raw([]);
	loading = $state(false);
	error = $state('');

	async load(filters = {}) {
		this.loading = true; this.error = '';
		try {
			const result = await listAdminStories(filters);
			this.items = result.items || [];
			this.statusCounts = result.statusCounts || {};
			this.page = { page: result.page || 1, perPage: result.perPage || 20, totalItems: result.totalItems || 0, totalPages: result.totalPages || 1 };
		} catch (error) { this.error = error instanceof Error ? error.message : 'Pemantauan Cerita gagal dimuat.'; }
		finally { this.loading = false; }
	}

	async loadDetail(id) {
		this.loading = true; this.error = '';
		try { const result = await adminStoryDetail(id); this.selected = result.story; this.reviews = result.reviews || []; this.events = result.events || []; }
		catch (error) { this.selected = null; this.error = error instanceof Error ? error.message : 'Audit Cerita gagal dimuat.'; }
		finally { this.loading = false; }
	}
}

export const adminStories = new AdminStoriesStore();
