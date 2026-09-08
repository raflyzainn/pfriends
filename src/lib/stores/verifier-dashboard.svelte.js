import { browser } from '$app/environment';
import { verifierDashboard } from '$lib/infrastructure/pocketbase/gamification.js';

class VerifierDashboardStore {
	data = $state.raw(null);
	loading = $state(false);
	error = $state(null);

	async load() {
		if (!browser) return;
		this.loading = true; this.error = null;
		try { this.data = await verifierDashboard(); }
		catch (error) { this.data = null; this.error = error instanceof Error ? error.message : 'Dasbor gagal dimuat.'; }
		finally { this.loading = false; }
	}
}

export const verifierDashboardStore = new VerifierDashboardStore();
