import { browser } from '$app/environment';
import {
	publicLeaderboard,
	publicCommunitySummary,
	publicStories,
	publicStoryBySlug
} from '$lib/infrastructure/pocketbase/publicContent.js';

class PublicContentStore {
	stories = $state.raw([]);
	leaderboard = $state.raw([]);
	communitySummary = $state.raw(null);
	communityLoaded = $state(false);
	communityLoading = $state(false);
	communityError = $state(null);
	loaded = $state(false);
	loading = $state(false);
	error = $state(null);
	#loadingPromise = null;
	#communityPromise = null;

	async load({ force = false } = {}) {
		if (!browser) return;
		if (this.loaded && !force) return;
		if (this.#loadingPromise && !force) return this.#loadingPromise;
		this.#loadingPromise = this.#load();
		try { await this.#loadingPromise; }
		finally { this.#loadingPromise = null; }
	}

	async #load() {
		this.loading = true;
		this.error = null;
		try {
			const [stories, leaderboard] = await Promise.all([publicStories(), publicLeaderboard(8)]);
			this.stories = stories;
			this.leaderboard = leaderboard;
			this.loaded = true;
		} catch (error) {
			this.stories = [];
			this.leaderboard = [];
			this.error = error instanceof Error ? error.message : 'Konten publik gagal dimuat.';
		} finally {
			this.loading = false;
		}
	}

	async loadCommunity({ force = false } = {}) {
		if (!browser) return;
		if (this.communityLoaded && !force) return;
		if (this.#communityPromise && !force) return this.#communityPromise;
		this.#communityPromise = this.#loadCommunity();
		try { await this.#communityPromise; }
		finally { this.#communityPromise = null; }
	}

	async #loadCommunity() {
		this.communityLoading = true;
		this.communityError = null;
		try {
			this.communitySummary = await publicCommunitySummary();
			this.communityLoaded = true;
		} catch (error) {
			this.communitySummary = null;
			this.communityError = error instanceof Error ? error.message : 'Ringkasan komunitas gagal dimuat.';
		} finally {
			this.communityLoading = false;
		}
	}

	storyBySlug(slug) {
		return this.stories.find((story) => story.slug === slug) ?? null;
	}

	async ensureStory(slug) {
		const cached = this.storyBySlug(slug);
		if (cached) return cached;
		const story = await publicStoryBySlug(slug);
		if (story) this.stories = [...this.stories, story];
		return story;
	}
}

export const publicContent = new PublicContentStore();
