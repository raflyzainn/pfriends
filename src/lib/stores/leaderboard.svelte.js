import { browser } from '$app/environment';
import { leaderboardData } from '$lib/infrastructure/pocketbase/gamification.js';
import { session } from './session.svelte.js';

export const LeaderboardScope = Object.freeze({ GLOBAL: 'global', COMMUNITY: 'community', CHAPTER: 'chapter' });
export const LeaderboardPeriod = Object.freeze({ MONTH: 'month', ALL: 'all' });
export const UKURAN_PODIUM = 3;

class LeaderboardStore {
	scope = $state(LeaderboardScope.GLOBAL);
	key = $state('');
	period = $state(LeaderboardPeriod.ALL);
	limit = $state(20);
	entries = $state.raw([]);
	myRank = $state.raw(null);
	chapters = $state.raw([]);
	loading = $state(false);
	loaded = $state(false);
	error = $state(null);
	isEmpty = $derived(this.entries.length === 0);
	podium = $derived(this.entries.slice(0, UKURAN_PODIUM));
	rest = $derived(this.entries.slice(UKURAN_PODIUM));

	async load(query = {}) {
		if (!browser) return;
		if (query.scope !== undefined) this.scope = query.scope;
		if (query.key !== undefined) this.key = query.key;
		if (query.period !== undefined) this.period = query.period;
		if (query.limit !== undefined) this.limit = query.limit;
		this.loading = true; this.error = null;
		try {
			const result = await leaderboardData({ scope: this.scope, key: this.key, period: this.period, limit: this.limit });
			this.entries = (result.entries || []).map((row) => ({
				rank: row.rank, points: row.points, displayName: row.name,
				awardee: { id: row.awardeeId, fullName: row.name, leaderboardName: row.name, community: row.community, chapterId: row.chapterId }
			}));
			this.myRank = this.entries.find((entry) => entry.awardee.id === session.awardeeId) ?? null;
			this.chapters = [];
			this.loaded = true;
		} catch (error) { this.error = error instanceof Error ? error.message : 'Papan peringkat gagal dimuat.'; this.entries = []; }
		finally { this.loading = false; }
	}

	setScope(scope, key = '') { return this.load({ scope, key }); }
	setPeriod(period) { return this.load({ period }); }
	refresh() { return this.load(); }
	isMe(entry) { return session.awardeeId !== null && entry.awardee.id === session.awardeeId; }
}

export const leaderboard = new LeaderboardStore();
