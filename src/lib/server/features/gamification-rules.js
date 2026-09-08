import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recalculateGamification } from '../gamification.js';
import { recordId } from '../registration.js';

async function context(ctx) { const principal = await ctx.principal({ roles: ['ADMIN'] }); return { principal, pb: await ctx.admin() }; }
function tierDto(row) { return { id: row.id, level: row.level, label: row.label, threshold: Number(row.threshold || 0), rank: Number(row.rank || 0), updatedAt: row.updatedAt || row.updated || '' }; }
async function tiers(pb) { return (await pb.collection('gamification_tiers').getFullList({ sort: 'rank' })).map(tierDto); }
function normalize(input, current) {
	const result = {};
	for (const tier of current) {
		const value = Number(input?.[tier.level]);
		if (!Number.isInteger(value) || value < 0) throw new ApiError(400, `Ambang ${tier.label} harus berupa bilangan bulat nonnegatif.`);
		result[tier.level] = value;
	}
	if (result.NEWCOMER !== 0) throw new ApiError(400, 'Ambang Newcomer wajib tetap 0.');
	for (let index = 1; index < current.length; index++) if (result[current[index].level] <= result[current[index - 1].level]) throw new ApiError(400, `Ambang ${current[index].label} harus lebih besar daripada tier sebelumnya.`);
	return result;
}
function versionOf(current) { return current.reduce((latest, tier) => tier.updatedAt > latest ? tier.updatedAt : latest, ''); }
function tierFor(points, current, thresholds) { let level = current[0]?.level || 'NEWCOMER'; for (const tier of current) if (points >= thresholds[tier.level]) level = tier.level; return level; }
function impact(profiles, current, thresholds) {
	const existing = Object.fromEntries(current.map((tier) => [tier.level, tier.threshold])), before = Object.fromEntries(current.map((tier) => [tier.level, 0])), after = Object.fromEntries(current.map((tier) => [tier.level, 0])), transitions = {};
	for (const profile of profiles) {
		const from = tierFor(Number(profile.totalPoints || 0), current, existing), to = tierFor(Number(profile.totalPoints || 0), current, thresholds);
		before[from]++; after[to]++;
		if (from !== to) transitions[`${from}->${to}`] = (transitions[`${from}->${to}`] || 0) + 1;
	}
	return { totalProfiles: profiles.length, moved: Object.values(transitions).reduce((sum, value) => sum + value, 0), before, after, transitions };
}
async function sample(pb, current, thresholds) {
	const mix = { BROADCAST_VIEW: 4, CTA_REACT: 3, SHARE_PRIVATE: 3, SHARE_PUBLIC: 2, STORY_SUBMIT: 1, SESSION_ATTEND: 1 }, actions = await pb.collection('point_actions').getFullList(), rows = [];
	let total = 0;
	for (const [code, occurrences] of Object.entries(mix)) {
		const action = actions.find((row) => row.code === code); if (!action) continue;
		const subtotal = Number(action.points || 0) * occurrences; total += subtotal;
		rows.push({ code, label: action.label, occurrences, points: Number(action.points || 0), subtotal });
	}
	return { rows, total, tier: tierFor(total, current, thresholds) };
}
function auditDto(row) { return { id: row.id, actorName: row.actorName, before: row.before || {}, after: row.after || {}, impact: row.impact || {}, occurredAt: row.occurredAt }; }
async function audits(pb, perPage) { return (await pb.collection('gamification_tier_audits').getList(1, perPage, { sort: '-occurredAt' })).items.map(auditDto); }
async function response(pb, proposed) {
	const [current, profiles] = await Promise.all([tiers(pb), pb.collection('gamification_profiles').getFullList()]);
	const thresholds = proposed || Object.fromEntries(current.map((tier) => [tier.level, tier.threshold]));
	return { tiers: current, thresholds, version: versionOf(current), impact: impact(profiles, current, thresholds), sample: await sample(pb, current, thresholds) };
}

apiRoute('GET', '/admin/gamification/rules', async (ctx) => { const { pb } = await context(ctx), data = await response(pb); return { ...data, audits: await audits(pb, 20) }; });
apiRoute('POST', '/admin/gamification/tiers/preview', async (ctx) => { const { pb } = await context(ctx), body = await ctx.body(), current = await tiers(pb); return response(pb, normalize(body.thresholds, current)); });
apiRoute('PUT', '/admin/gamification/tiers', async (ctx) => {
	const { principal, pb } = await context(ctx), body = await ctx.body(), current = await tiers(pb), thresholds = normalize(body.thresholds, current);
	if (String(body.expectedVersion || '') !== versionOf(current)) throw new ApiError(400, 'Konfigurasi tier sudah berubah. Muat ulang dan tinjau dampaknya kembali.');
	const profiles = await pb.collection('gamification_profiles').getFullList(), preview = impact(profiles, current, thresholds), before = Object.fromEntries(current.map((tier) => [tier.level, tier.threshold])), now = new Date().toISOString();
	await sendBatch(pb, async (batch) => {
		for (const tier of current) batch.collection('gamification_tiers').update(tier.id, { threshold: thresholds[tier.level], updatedBy: principal.record.id, updatedAt: now });
		batch.collection('gamification_tier_audits').create({ id: recordId(), actor: principal.record.id, actorName: principal.record.displayName, before, after: thresholds, impact: preview, occurredAt: now });
	});
	for (const profile of profiles) await recalculateGamification(pb, profile.user);
	const result = await response(pb); return { ...result, audits: await audits(pb, 20) };
});
apiRoute('GET', '/admin/gamification/tiers/audit', async (ctx) => { const { pb } = await context(ctx); return { audits: await audits(pb, 100) }; });
