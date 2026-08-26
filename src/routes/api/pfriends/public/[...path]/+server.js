import { json } from '@sveltejs/kit';
import { createAdminPocketBase } from '$lib/server/pocketbase.js';
import { ApiError } from '$lib/server/auth.js';
import { apiFailure } from '$lib/server/response.js';
import { communitySummary, jakartaMonthBounds, movementDto, storyDto } from '$lib/server/public-content.js';
import { TIER_TABLE } from '$lib/domain/constants/tier-table.js';

const CACHE = { 'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60' };
const STORY_FILTER = 'status = "TERPUBLIKASI" && consentActive = true && consentLegacyId != ""';

async function stories(pb, slug = '') {
	const filter = slug ? pb.filter(`${STORY_FILTER} && slug = {:slug}`, { slug }) : STORY_FILTER;
	let rows;
	if (slug) {
		try { rows = [await pb.collection('stories').getFirstListItem(filter)]; }
		catch (error) { if (error?.status === 404) throw new ApiError(404, 'Cerita tidak ditemukan.'); throw error; }
	} else rows = await pb.collection('stories').getFullList({ filter, sort: '-publishedAt' });
	const items = await Promise.all(rows.map(async (row) => {
		let coverUrl = '';
		try {
			const cover = await pb.collection('story_public_covers').getFirstListItem(pb.filter('story = {:story}', { story: row.id }));
			if (cover.image) coverUrl = pb.files.getURL(cover, cover.image);
		} catch {}
		return storyDto(row, coverUrl);
	}));
	return slug ? items[0] : { items };
}

async function leaderboard(pb, url) {
	const raw = Number(url.searchParams.get('limit') || 8);
	const limit = Math.min(20, Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : 8));
	const [awardees, profiles, tiers] = await Promise.all([
		pb.collection('awardees').getFullList({ filter: 'status = "AKTIF"', fields: 'id' }),
		pb.collection('gamification_profiles').getFullList({ filter: 'totalPoints > 0', sort: '-totalPoints,fullName', fields: 'awardee,awardeeId,fullName,community,chapterId,totalPoints' }),
		pb.collection('gamification_tiers').getFullList({ sort: 'rank', fields: 'level,threshold,rank' })
	]);
	const active = new Set(awardees.map((row) => row.id));
	const tierRules = tiers.length ? tiers : TIER_TABLE;
	const tierFor = (points) => tierRules.filter((tier) => points >= Number(tier.threshold || 0)).at(-1)?.level || 'NEWCOMER';
	const entries = profiles.filter((row) => active.has(row.awardee)).slice(0, limit).map((row, index) => {
		const points = Number(row.totalPoints) || 0;
		return { rank: index + 1, awardeeId: row.awardeeId, name: row.fullName, community: row.community, chapterId: row.chapterId, points, tier: tierFor(points) };
	});
	return { entries };
}

async function movements(pb) {
	const rows = await pb.collection('movements').getFullList({ filter: 'status = "BERJALAN" || status = "SELESAI"', sort: '-startsAt' });
	const items = await Promise.all(rows.map(async (row) => {
		const [participants, reports] = await Promise.all([
			pb.collection('movement_participants').getFullList({ filter: pb.filter('movement = {:id} && status = "ACTIVE"', { id: row.id }), fields: 'id' }),
			pb.collection('movement_reports').getFullList({ filter: pb.filter('movement = {:id} && status = "APPROVED"', { id: row.id }), fields: 'id' })
		]);
		return movementDto(row, participants.length, reports.length);
	}));
	return { items };
}

async function impact(pb) {
	const now = new Date();
	const bounds = jakartaMonthBounds(now);
	const [awardees, storiesRows, events, movementsRows, activities] = await Promise.all([
		pb.collection('awardees').getFullList({ filter: 'status = "AKTIF"', fields: 'legacyId,chapterId,consentActive' }),
		pb.collection('stories').getFullList({ filter: STORY_FILTER, fields: 'id' }),
		pb.collection('events').getFullList({ fields: 'id,status,outcomeNote,endsAt' }),
		pb.collection('movements').getFullList({ filter: 'status = "BERJALAN"', fields: 'id' }),
		pb.collection('verified_point_activities').getFullList({ filter: 'status = "AWARDED"', fields: 'awardeeId,activityType,occurredAt' })
	]);
	let completedEvents = 0;
	for (const event of events.filter((row) => row.status === 'SELESAI' && row.outcomeNote)) {
		const attendance = await pb.collection('event_participants').getFullList({ filter: pb.filter('event = {:id} && attendanceStatus = "APPROVED"', { id: event.id }), fields: 'id' });
		if (attendance.length >= 10) completedEvents++;
	}
	const activeIds = new Set(awardees.map((row) => row.legacyId));
	const amplification = activities.filter((row) => ['SHARE_PRIVATE', 'SHARE_PUBLIC'].includes(row.activityType) && row.occurredAt >= bounds.start && row.occurredAt < bounds.end && activeIds.has(row.awardeeId));
	return { capturedAt: now.toISOString(), registeredAwardees: awardees.filter((row) => row.consentActive).length, activeChapters: new Set(awardees.map((row) => row.chapterId).filter(Boolean)).size, totalChapters: 3, publishedStories: storiesRows.length, completedEvents, upcomingEvents: events.filter((row) => ['TERJADWAL', 'BERLANGSUNG'].includes(row.status) && new Date(row.endsAt) >= now).length, runningMovements: movementsRows.length, recordedActions: activities.length, amplifiersThisMonth: new Set(amplification.map((row) => row.awardeeId)).size, beneficiaryRegistry: { value: null, source: 'Penyebut registry penerima manfaat belum tersedia.' } };
}

export async function GET({ params, url }) {
	try {
		const pb = await createAdminPocketBase();
		const path = params.path || '';
		let data;
		if (path === 'stories') data = await stories(pb);
		else if (path.startsWith('stories/')) data = await stories(pb, decodeURIComponent(path.slice(8)));
		else if (path === 'leaderboard') data = await leaderboard(pb, url);
		else if (path === 'communities') data = communitySummary(await pb.collection('awardees').getFullList({ filter: 'status = "AKTIF"', fields: 'community,chapterId,status' }));
		else if (path === 'movements') data = await movements(pb);
		else if (path === 'impact') data = await impact(pb);
		else throw new ApiError(404, 'Endpoint publik tidak ditemukan.');
		return json(data, { headers: CACHE });
	} catch (error) { return apiFailure(error, 'Konten publik gagal dimuat.'); }
}
