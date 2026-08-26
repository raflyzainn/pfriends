import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { recalculateGamification } from '../gamification.js';
import { awardeeFor, syncWallet, walletDto } from '../rewards.js';

function actionDto(row) { return { id: row.id, code: row.code, label: row.label, description: row.description, actionClass: row.actionClass, pillar: row.pillar, points: Number(row.points || 0), dailyCap: Number(row.dailyCap || 0), workflow: row.workflow, isCore: Boolean(row.isCore), status: row.status }; }
function tierDto(row) { return { id: row.id, level: row.level, rank: Number(row.rank || 0), threshold: Number(row.threshold || 0), canonicalThreshold: Number(row.canonicalThreshold || 0), label: row.label, description: row.description || '', benefit: row.benefit || '', color: row.color || '', updatedAt: row.updatedAt || '' }; }
async function dailyUsage(pb, awardeeId, actions) {
	const periodKey = new Date().toISOString().slice(0, 10), entries = await pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:awardee} && occurredAt >= {:start} && occurredAt <= {:end}', { awardee: awardeeId, start: `${periodKey} 00:00:00.000Z`, end: `${periodKey} 23:59:59.999Z` }) }), counts = {};
	for (const row of entries) { const code = row.actionCode || row.activityType; counts[code] = (counts[code] || 0) + 1; }
	return actions.map((action) => { const cap = Number(action.dailyCap || 0), used = Math.min(cap, counts[action.code] || 0); return { type: action.code, used, cap, remaining: Math.max(0, cap - used), exhausted: used >= cap, periodKey }; });
}

apiRoute('GET', '/point-activities', async (ctx) => {
	const principal = await ctx.principal(), pb = await ctx.admin();
	const rows = await pb.collection('verified_point_activities').getFullList({ sort: '-occurredAt' });
	return { items: principal.role === 'AWARDEE' ? rows.filter((row) => row.user === principal.record.id) : rows };
});

apiRoute('GET', '/gamification/me', async (ctx) => {
	const principal = await ctx.principal({ roles: ['AWARDEE'] }), pb = await ctx.admin(), awardee = await awardeeFor(pb, principal.record.id), result = await recalculateGamification(pb, principal.record.id), wallet = await syncWallet(pb, awardee);
	const [activeAwards, badges, tiers, actions] = await Promise.all([
		pb.collection('awardee_badges').getFullList({ filter: pb.filter('awardee = {:awardee} && status = "ACTIVE"', { awardee: awardee.id }), sort: 'awardedAt' }),
		pb.collection('badges').getFullList({ sort: 'name' }), pb.collection('gamification_tiers').getFullList({ sort: 'rank' }),
		pb.collection('point_actions').getFullList({ filter: 'status = "ACTIVE"', sort: 'actionClass,label' })
	]);
	return {
		profile: result.profile, wallet: walletDto(wallet), tiers: tiers.map(tierDto), actions: actions.map(actionDto),
		dailyUsage: await dailyUsage(pb, awardee.legacyId, actions), ledger: result.entries.slice().reverse(),
		badges: badges.filter((badge) => !badge.community || badge.community === awardee.community).map((badge) => ({ id: badge.id, code: badge.code, name: badge.name, family: badge.family, rarity: badge.rarity, criteria: badge.criteria, icon: badge.icon, community: badge.community || '', unlocked: activeAwards.some((row) => row.badgeCode === badge.code) }))
	};
});

apiRoute('GET', '/gamification/leaderboard', async (ctx) => {
	await ctx.principal(); const pb = await ctx.admin(), scope = ctx.url.searchParams.get('scope') || 'global', key = ctx.url.searchParams.get('key') || '', period = ctx.url.searchParams.get('period') || 'all', limit = Math.min(100, Math.max(1, Number(ctx.url.searchParams.get('limit') || 20))), month = new Date().toISOString().slice(0, 7);
	const awardees = await pb.collection('awardees').getFullList({ filter: 'status = "AKTIF"', sort: 'fullName' }), all = [];
	for (const awardee of awardees) {
		const result = await recalculateGamification(pb, awardee.user);
		const points = period === 'month' ? result.entries.filter((row) => String(row.occurredAt).slice(0, 7) === month).reduce((sum, row) => sum + Number(row.points || 0), 0) : Number(result.profile.totalPoints || 0);
		if (points > 0) all.push({ profile: result.profile, points });
	}
	let rows = all;
	if (scope === 'community') rows = rows.filter((row) => row.profile.community === key);
	if (scope === 'chapter') rows = rows.filter((row) => row.profile.chapterId === key);
	rows.sort((a, b) => b.points - a.points || a.profile.fullName.localeCompare(b.profile.fullName));
	return { entries: rows.slice(0, limit).map((row, index) => ({ rank: index + 1, awardeeId: row.profile.awardeeId, name: row.profile.anonymousOnLeaderboard ? 'Peserta anonim' : row.profile.fullName, community: row.profile.community, chapterId: row.profile.chapterId, points: row.points, tier: row.profile.tier, streakWeeks: Number(row.profile.currentStreakWeeks || 0) })) };
});

apiRoute('POST', '/point-activities/{id}/revoke', async (ctx) => {
	const principal = await ctx.principal({ roles: ['ADMIN'] }), pb = await ctx.admin(), body = await ctx.body(), reason = String(body.reason || '').trim();
	if (reason.length < 5) throw new ApiError(400, 'Alasan minimal lima karakter.');
	const row = await pb.collection('verified_point_activities').getOne(ctx.params.id);
	if (row.status !== 'AWARDED') throw new ApiError(400, 'Poin ini sudah dicabut.');
	await pb.collection('verified_point_activities').update(row.id, { status: 'REVOKED', revokedAt: new Date().toISOString(), revokeReason: reason, revokedBy: principal.record.id });
	const awardee = await pb.collection('awardees').getFirstListItem(pb.filter('legacyId = {:id}', { id: row.awardeeId }));
	await recalculateGamification(pb, awardee.user); await syncWallet(pb, awardee);
	return { status: 'REVOKED' };
});
