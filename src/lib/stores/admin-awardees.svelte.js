import { adminAwardeeHistory, changeAdminAwardeeStatus, listAdminAwardees } from '$lib/infrastructure/pocketbase/adminAwardees.js';

class AdminAwardeesStore {
	items = $state.raw([]);
	stats = $state.raw({ total: 0, activeAccounts: 0, inactiveMemberships: 0, everLoggedIn: 0 });
	page = $state.raw({ page: 1, perPage: 20, totalItems: 0, totalPages: 1 });
	history = $state.raw([]);
	loading = $state(false);
	working = $state(false);
	error = $state('');

	async load(filters = {}) {
		this.loading = true; this.error = '';
		try { const result = await listAdminAwardees(filters); this.items = result.items || []; this.stats = result.stats || this.stats; this.page = { page: result.page || 1, perPage: result.perPage || 20, totalItems: result.totalItems || 0, totalPages: result.totalPages || 1 }; }
		catch (error) { this.error = error instanceof Error ? error.message : 'Daftar Awardee gagal dimuat.'; }
		finally { this.loading = false; }
	}

	async loadHistory(id) {
		this.error = '';
		try { const result = await adminAwardeeHistory(id); this.history = result.items || []; return result; }
		catch (error) { this.error = error instanceof Error ? error.message : 'Riwayat Awardee gagal dimuat.'; return null; }
	}

	async changeStatus(id, kind, status, reason) {
		this.working = true; this.error = '';
		try { return await changeAdminAwardeeStatus(id, kind, status, reason); }
		catch (error) { this.error = error instanceof Error ? error.message : 'Status Awardee gagal diubah.'; return null; }
		finally { this.working = false; }
	}
}

export const adminAwardees = new AdminAwardeesStore();
