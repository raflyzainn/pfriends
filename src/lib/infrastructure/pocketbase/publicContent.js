import { Story } from '$lib/domain/entities/Story.js';
import { REACH_PARAMETERS } from '$lib/domain/constants/kpi-targets.js';
import { getPocketBase, pocketBaseMessage } from './client.js';

function client() {
	const pb = getPocketBase();
	if (!pb) throw new Error('PocketBase tidak tersedia pada lingkungan ini.');
	return pb;
}

function storyEntity(record) {
	return Story.from({
		...record,
		esgTags: Array.isArray(record.esgTags) ? record.esgTags : [],
		mediaRefs: Array.isArray(record.mediaRefs) ? record.mediaRefs : [],
		consentActive: record.consentGranted === true,
		consentId: record.consentGranted === true ? 'SERVER_VERIFIED' : null,
		reviewNotes: [],
		reviewerId: null,
		reviewedAt: null,
		publishedById: '',
		revisionCount: 0,
		archivedAt: null,
		archiveReason: null
	});
}

export async function publicStories() {
	try {
		const response = await client().send('/api/pfriends/public/stories');
		return (response.items || []).map(storyEntity);
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Cerita publik gagal dimuat.'));
	}
}

export async function publicStoryBySlug(slug) {
	try {
		const response = await client().send(`/api/pfriends/public/stories/${encodeURIComponent(slug)}`);
		return storyEntity(response);
	} catch (error) {
		if (error?.status === 404) return null;
		throw new Error(pocketBaseMessage(error, 'Cerita publik gagal dimuat.'));
	}
}

export async function publicLeaderboard(limit = 8) {
	try {
		const params = new URLSearchParams({ limit: String(limit) });
		const response = await client().send(`/api/pfriends/public/leaderboard?${params}`);
		return response.entries || [];
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Papan peringkat gagal dimuat.'));
	}
}

export async function publicCommunitySummary() {
	try {
		return await client().send('/api/pfriends/public/communities');
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Ringkasan komunitas gagal dimuat.'));
	}
}

export async function publicMovements() {
	try {
		const response = await client().send('/api/pfriends/public/movements');
		return (response.items || []).map((movement) => ({
			...movement,
			startsAt: new Date(movement.startsAt),
			endsAt: new Date(movement.endsAt),
			isRunning: movement.status === 'BERJALAN'
		}));
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Gerakan publik gagal dimuat.'));
	}
}

export async function publicImpactSnapshot() {
	try {
		const response = await client().send('/api/pfriends/public/impact');
		const basis = Number(response.amplifiersThisMonth) || 0;
		const remainingReach = 1 - REACH_PARAMETERS.overlapJaringan;
		return {
			...response,
			capturedAt: new Date(response.capturedAt),
			organicReach: {
				basis,
				min: Math.round(basis * REACH_PARAMETERS.jaringanSosialMin * REACH_PARAMETERS.koefisienEksposurMin * remainingReach),
				max: Math.round(basis * REACH_PARAMETERS.jaringanSosialMax * REACH_PARAMETERS.koefisienEksposurMax * remainingReach)
			}
		};
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Angka program gagal dimuat.'));
	}
}
