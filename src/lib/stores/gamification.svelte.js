import { browser } from '$app/environment';
import { TierResolver } from '$lib/domain/services/TierResolver.js';
import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';
import { myGamification } from '$lib/infrastructure/pocketbase/gamification.js';
import { engageBroadcast } from '$lib/infrastructure/pocketbase/broadcasts.js';
import { session } from './session.svelte.js';
import { toast, ToastType } from './toast.svelte.js';

const ALASAN_BACKEND = 'Poin operasional hanya dibukukan setelah Bukti Keaktifan disetujui Verifikator.';

class GamificationStore {
	points = $state(0);
	coins = $state(0);
	ledger = $state.raw([]);
	dailyUsage = $state.raw([]);
	actions = $state.raw([]);
	badges = $state.raw([]);
	tiers = $state.raw([]);
	loading = $state(false);
	busy = $state(null);
	streakWeeks = $state(0);
	streakDays = $state(0);
	activeToday = $state(false);
	error = $state(null);

	tier = $derived.by(() => {
		if (!this.tiers.length) return TierResolver.resolve(this.points);
		const sorted = [...this.tiers].sort((a, b) => a.threshold - b.threshold);
		const selected = [...sorted].reverse().find((entry) => this.points >= entry.threshold) ?? sorted[0];
		const visual = TIER_TABLE.find((entry) => entry.level === selected.level) ?? {};
		return { ...visual, ...selected, deskripsi: selected.description || visual.deskripsi || '' };
	});
	progress = $derived.by(() => {
		if (!this.tiers.length) return TierResolver.progress(this.points);
		const sorted = [...this.tiers].sort((a, b) => a.threshold - b.threshold);
		const current = this.tier;
		const next = sorted.find((entry) => entry.threshold > this.points) ?? null;
		const range = next ? next.threshold - current.threshold : 0;
		const gained = this.points - current.threshold;
		return { current, next, gained, needed: next ? next.threshold - this.points : 0, percent: next && range > 0 ? Math.min(100, Math.round(gained / range * 100)) : 100, points: this.points, isTertinggi: !next };
	});
	unlockedBadges = $derived(this.badges.filter((entry) => entry.unlocked));
	availableActions = $derived(this.dailyUsage.filter((row) => !row.exhausted));

	async perform(type, payload = {}) {
		if (!['BROADCAST_VIEW','CTA_REACT','SHARE_PRIVATE'].includes(type) || !payload.refId) {
			const result = Object.freeze({ accepted: false, points: 0, reason: ALASAN_BACKEND, activity: null });
			toast.push({ type: ToastType.INFO, title: 'Perlu bukti', message: ALASAN_BACKEND }); return result;
		}
		this.busy = type;
		try {
			const response = await engageBroadcast(payload.refId, type, payload.note || '', payload.requestKey || '');
			await this.refresh();
			toast.success('Aksi tercatat', response.points ? `+${response.points} poin berhasil dibukukan.` : 'Aksi tercatat tanpa poin karena batas harian.');
			return { accepted: true, points: response.points || 0, reason: '', activity: null };
		} catch (error) { toast.error('Aksi gagal dicatat', error.message); return { accepted:false, points:0, reason:error.message, activity:null }; }
		finally { this.busy = null; }
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
			this.tiers = result.tiers;
			this.streakWeeks = result.profile.currentStreakWeeks || 0;
			this.streakDays = result.profile.currentStreakDays || 0;
			this.activeToday = Boolean(result.profile.activeToday);
			this.coins = result.wallet.balance || 0;
			this.dailyUsage = result.dailyUsage;
			this.actions = result.actions;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Gamifikasi gagal dimuat.';
			this.reset(false);
		} finally {
			this.loading = false;
		}
	}

	reset(clearError = true) {
		this.points = 0; this.coins = 0; this.ledger = []; this.dailyUsage = []; this.actions = [];
		this.badges = []; this.tiers = []; this.streakWeeks = 0; this.streakDays = 0; this.activeToday = false; this.busy = null;
		if (clearError) this.error = null;
	}

	async preview() {
		if (!browser || !session.isAwardee) return null;
		return { allowed: false, points: 0, remaining: 0, reason: ALASAN_BACKEND };
	}

	usageFor(type) { return this.dailyUsage.find((row) => row.type === type) ?? null; }
}

export const gamification = new GamificationStore();
