import { browser } from '$app/environment';
import { adminRedemptions } from '$lib/infrastructure/pocketbase/achievements.js';
import { listMovements } from '$lib/infrastructure/pocketbase/movements.js';
import { countAwardeeMovementRevisions, countRedemptionQueue, countVerifierMovementQueue } from '$lib/domain/services/WorkflowBadgeCounter.js';
import { session } from './session.svelte.js';

class WorkflowBadgesStore {
	movements = $state.raw([]);
	redemptions = $state.raw([]);
	loadingMovements = $state(false);

	verifierMovementQueue = $derived(countVerifierMovementQueue(this.movements));

	awardeeMovementRevision = $derived(countAwardeeMovementRevisions(this.movements, session.accountId));

	redemptionQueue = $derived(countRedemptionQueue(this.redemptions));

	async loadMovements() {
		if (!browser || !session.isAuthenticated) return [];
		this.loadingMovements = true;
		try { this.movements = await listMovements(); return this.movements; }
		catch { this.movements = []; return []; }
		finally { this.loadingMovements = false; }
	}

	async loadRedemptions() {
		if (!browser || !session.isVerifier) return [];
		try { this.redemptions = (await adminRedemptions()).redemptions || []; return this.redemptions; }
		catch { this.redemptions = []; return []; }
	}

	reset() { this.movements = []; this.redemptions = []; }
}

export const workflowBadges = new WorkflowBadgesStore();
