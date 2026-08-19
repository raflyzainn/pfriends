import { browser } from '$app/environment';
import { TierResolver } from '$lib/domain/services/TierResolver.js';
import { myGamification } from '$lib/infrastructure/pocketbase/gamification.js';
import { session } from './session.svelte.js';
import { toast, ToastType } from './toast.svelte.js';

const ALASAN_BACKEND = 'Poin operasional hanya dibukukan setelah Bukti Keaktifan disetujui Verifikator.';

class GamificationStore {
	points = $state(0);
	coins = $state(0);
	ledger = $state.raw([]);
	dailyUsage = $state.raw([]);
	badges = $state.raw([]);
	loading = $state(false);
	busy = $state(null);
	streakWeeks = $state(0);
	error = $state(null);

	tier = $derived(TierResolver.resolve(this.points));
	progress = $derived(TierResolver.progress(this.points));
	unlockedBadges = $derived(this.badges.filter((entry) => entry.unlocked));
	availableActions = $derived(this.dailyUsage.filter((row) => !row.exhausted));

	async perform() {
		const result = Object.freeze({ accepted: false, points: 0, reason: ALASAN_BACKEND, activity: null });
		toast.push({
			type: ToastType.INFO,
			title: 'Pencatatan lokal dinonaktifkan',
			message: `${ALASAN_BACKEND} Gunakan menu Bukti Keaktifan untuk mengajukan kontribusi.`
		});
		return result;
	}

	async refresh() {
		if (!browser) { this.reset(); return; }
		if (!session.isAwardee) { this.reset(); return; }
		this.loading = true;
		this.error = null;
		try {
			const result = await myGamification();
			this.points = result.profile.totalPoints || 0;
			this.ledger = result.ledger;
			this.badges = result.badges;
			this.streakWeeks = result.profile.currentStreakWeeks || 0;
			this.coins = 0;
			this.dailyUsage = [];
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Gamifikasi gagal dimuat.';
			this.reset(false);
		} finally {
			this.loading = false;
		}
	}

	reset(clearError = true) {
		this.points = 0; this.coins = 0; this.ledger = []; this.dailyUsage = [];
		this.badges = []; this.streakWeeks = 0; this.busy = null;
		if (clearError) this.error = null;
	}

	async preview() {
		if (!browser || !session.isAwardee) return null;
		return { allowed: false, points: 0, remaining: 0, reason: ALASAN_BACKEND };
	}

	usageFor() { return null; }
}

export const gamification = new GamificationStore();
