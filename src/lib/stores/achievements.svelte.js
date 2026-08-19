import { browser } from '$app/environment';
import { achievementData, redeemReward } from '$lib/infrastructure/pocketbase/achievements.js';
import { session } from './session.svelte.js';

class AchievementStore {
	wallet = $state({ balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
	rewards = $state.raw([]);
	redemptions = $state.raw([]);
	loading = $state(false);
	loaded = $state(false);
	error = $state(null);

	async refresh() {
		if (!browser || !session.isAwardee) { this.reset(); return; }
		this.loading = true; this.error = null;
		try {
			const result = await achievementData();
			this.wallet = result.wallet; this.rewards = result.rewards; this.redemptions = result.redemptions; this.loaded = true;
		} catch (error) { this.error = error instanceof Error ? error.message : 'Pencapaian gagal dimuat.'; }
		finally { this.loading = false; }
	}

	async redeem(rewardId) {
		const requestKey = globalThis.crypto?.randomUUID?.() || `redeem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const result = await redeemReward(rewardId, requestKey);
		await this.refresh();
		return result;
	}

	reset() { this.wallet = { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 }; this.rewards = []; this.redemptions = []; this.error = null; this.loaded = false; }
}

export const achievements = new AchievementStore();
