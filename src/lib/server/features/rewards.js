import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recalculateGamification } from '../gamification.js';
import { recordId } from '../registration.js';
import { TIER_RANKS, awardeeFor, optionalOne, redemptionDto, rewardDto, syncWallet, walletDto } from '../rewards.js';

const CATEGORIES = ['MERCHANDISE', 'UPSKILLING', 'MENTORING', 'PROFIL', 'UNDANGAN', 'SERTIFIKAT', 'DAMPAK'];
function text(value) { return String(value ?? '').trim(); }
async function awardeeContext(ctx) { const principal = await ctx.principal({ roles: ['AWARDEE'] }), pb = await ctx.admin(), awardee = await awardeeFor(pb, principal.record.id); return { principal, pb, awardee }; }
async function staffContext(ctx, roles = ['ADMIN', 'VERIFIER']) { const principal = await ctx.principal({ roles }); return { principal, pb: await ctx.admin() }; }
async function rewardsResponse(pb, filterCommunity = '') {
	const [rewards, redemptions] = await Promise.all([pb.collection('rewards').getFullList({ sort: 'priceCoins' }), pb.collection('redemptions').getFullList()]), month = new Date().toISOString().slice(0, 7);
	return rewards.filter((row) => !filterCommunity || !row.community || row.community === filterCommunity).map((row) => rewardDto(row, redemptions, month));
}
function rewardValues(body) {
	const name = text(body.name), priceCoins = Number(body.priceCoins || 0);
	if (name.length < 3 || !Number.isInteger(priceCoins) || priceCoins < 1) throw new ApiError(400, 'Nama hadiah dan harga Koin Tukar wajib valid.');
	if (!CATEGORIES.includes(body.category) || !TIER_RANKS.includes(body.minTierLevel)) throw new ApiError(400, 'Kategori atau tier minimum tidak valid.');
	return { name, category: body.category, description: text(body.description), priceCoins, minTierLevel: body.minTierLevel, status: text(body.status), monthlyQuota: Number(body.monthlyQuota) > 0 ? Number(body.monthlyQuota) : null, requiresApproval: Boolean(body.requiresApproval), community: text(body.community), fulfillmentNote: text(body.fulfillmentNote), image: text(body.image) };
}

apiRoute('GET', '/achievements', async (ctx) => {
	const { pb, awardee } = await awardeeContext(ctx);
	await recalculateGamification(pb, awardee.user); const account = await syncWallet(pb, awardee);
	const orders = await pb.collection('redemptions').getFullList({ filter: pb.filter('awardee = {:awardee}', { awardee: awardee.id }), sort: '-requestedAt' });
	return { wallet: walletDto(account), rewards: await rewardsResponse(pb, awardee.community), redemptions: orders.map(redemptionDto) };
});

apiRoute('POST', '/redemptions', async (ctx) => {
	const { principal, pb, awardee } = await awardeeContext(ctx), body = await ctx.body(), rewardId = text(body.rewardId), requestKey = text(body.requestKey);
	if (!rewardId || requestKey.length < 8 || requestKey.length > 180) throw new ApiError(400, 'Permintaan penukaran tidak valid.');
	const existing = await optionalOne(pb, 'redemptions', pb.filter('requestKey = {:key}', { key: requestKey }));
	if (existing) {
		if (existing.user !== principal.record.id) throw new ApiError(403, 'Kunci permintaan sudah digunakan.');
		const account = await syncWallet(pb, awardee); return { status: 201, body: { redemption: redemptionDto(existing), wallet: walletDto(account) } };
	}
	await recalculateGamification(pb, awardee.user); const account = await syncWallet(pb, awardee), reward = await pb.collection('rewards').getOne(rewardId), profile = await pb.collection('gamification_profiles').getFirstListItem(pb.filter('awardee = {:awardee}', { awardee: awardee.id }));
	if (reward.status !== 'TERSEDIA') throw new ApiError(400, 'Hadiah belum tersedia.');
	if (reward.community && reward.community !== awardee.community) throw new ApiError(400, 'Hadiah tidak tersedia untuk komunitas Anda.');
	if (TIER_RANKS.indexOf(profile.tier) < TIER_RANKS.indexOf(reward.minTierLevel)) throw new ApiError(400, 'Jenjang Anda belum memenuhi syarat hadiah.');
	const coins = Number(reward.priceCoins || 0); if (Number(account.balance || 0) < coins) throw new ApiError(400, 'Saldo Koin Tukar tidak mencukupi.');
	const now = new Date().toISOString(), month = now.slice(0, 7), used = await pb.collection('redemptions').getFullList({ filter: pb.filter('reward = {:reward} && quotaMonth = {:month} && status != "DITOLAK"', { reward: reward.id, month }) });
	if (Number(reward.monthlyQuota || 0) > 0 && used.length >= Number(reward.monthlyQuota)) throw new ApiError(400, 'Kuota penukaran bulan ini sudah habis.');
	const redemption = { id: recordId(), requestKey, awardee: awardee.id, user: principal.record.id, reward: reward.id, awardeeName: awardee.fullName, awardeeWhatsapp: awardee.whatsapp, rewardName: reward.name, coins, status: reward.requiresApproval ? 'DIAJUKAN' : 'DIKIRIM', quotaMonth: month, note: reward.fulfillmentNote || '', requestedAt: now, ...(reward.requiresApproval ? {} : { shippedAt: now }) };
	const transaction = { id: recordId(), awardee: awardee.id, user: principal.record.id, sourceKey: `REDEMPTION:${redemption.id}`, type: 'REDEMPTION_DEBIT', amount: -coins, referenceId: redemption.id, note: `Penukaran ${reward.name}.`, occurredAt: now };
	const wallet = { balance: Number(account.balance) - coins, lifetimeEarned: Number(account.lifetimeEarned), lifetimeSpent: Number(account.lifetimeSpent) + coins, recalculatedAt: now };
	await sendBatch(pb, async (batch) => { batch.collection('redemptions').create(redemption); batch.collection('coin_transactions').create(transaction); batch.collection('coin_accounts').update(account.id, wallet); });
	return { status: 201, body: { redemption: redemptionDto(redemption), wallet } };
});

apiRoute('GET', '/admin/redemptions', async (ctx) => {
	const { pb } = await staffContext(ctx), status = text(ctx.url.searchParams.get('status'));
	const rows = await pb.collection('redemptions').getFullList({ ...(status ? { filter: pb.filter('status = {:status}', { status }) } : {}), sort: '-requestedAt' });
	return { redemptions: rows.map(redemptionDto) };
});

apiRoute('POST', '/admin/redemptions/{id}/transition', async (ctx) => {
	const { principal, pb } = await staffContext(ctx, ['VERIFIER']), body = await ctx.body(), target = text(body.status), note = text(body.note), row = await pb.collection('redemptions').getOne(ctx.params.id);
	const allowed = { DIAJUKAN: ['DISETUJUI', 'DITOLAK'], DISETUJUI: ['DIKIRIM'], DIKIRIM: ['SELESAI'] };
	if (!(allowed[row.status] || []).includes(target)) throw new ApiError(400, `Perubahan status ${row.status} ke ${target} tidak diizinkan.`);
	if (target === 'DITOLAK' && note.length < 5) throw new ApiError(400, 'Alasan penolakan minimal lima karakter.');
	const now = new Date().toISOString(), update = { status: target, adminNote: note, actedBy: principal.record.id };
	if (['DISETUJUI', 'DITOLAK'].includes(target)) update.decidedAt = now; if (target === 'DIKIRIM') update.shippedAt = now; if (target === 'SELESAI') update.fulfilledAt = now; if (target === 'DITOLAK') update.rejectedAt = now;
	if (target !== 'DITOLAK') { const updated = await pb.collection('redemptions').update(row.id, update); return { redemption: redemptionDto(updated) }; }
	const awardee = await pb.collection('awardees').getOne(row.awardee), account = await syncWallet(pb, awardee), sourceKey = `REFUND:${row.id}`, duplicate = await optionalOne(pb, 'coin_transactions', pb.filter('sourceKey = {:key}', { key: sourceKey }));
	if (!duplicate) await sendBatch(pb, async (batch) => {
		batch.collection('redemptions').update(row.id, update);
		batch.collection('coin_transactions').create({ id: recordId(), awardee: awardee.id, user: awardee.user, sourceKey, type: 'REDEMPTION_REFUND', amount: Number(row.coins), referenceId: row.id, note, occurredAt: now });
		batch.collection('coin_accounts').update(account.id, { balance: Number(account.balance) + Number(row.coins), lifetimeEarned: Number(account.lifetimeEarned) + Number(row.coins), recalculatedAt: now });
	});
	const updated = duplicate ? await pb.collection('redemptions').update(row.id, update) : { ...row, ...update }; return { redemption: redemptionDto(updated) };
});

apiRoute('GET', '/staff/rewards', async (ctx) => { const { pb } = await staffContext(ctx); return { rewards: await rewardsResponse(pb) }; });
apiRoute('POST', '/staff/rewards', async (ctx) => {
	const { pb } = await staffContext(ctx), values = rewardValues(await ctx.body());
	const reward = await pb.collection('rewards').create({ id: recordId(), legacyId: `RWD-MANUAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, ...values });
	return { status: 201, body: { reward: rewardDto(reward, [], new Date().toISOString().slice(0, 7)) } };
});
apiRoute('PATCH', '/staff/rewards/{id}', async (ctx) => { const { pb } = await staffContext(ctx), reward = await pb.collection('rewards').update(ctx.params.id, rewardValues(await ctx.body())), redemptions = await pb.collection('redemptions').getFullList(); return { reward: rewardDto(reward, redemptions, new Date().toISOString().slice(0, 7)) }; });
apiRoute('DELETE', '/staff/rewards/{id}', async (ctx) => {
	const { pb } = await staffContext(ctx), used = await optionalOne(pb, 'redemptions', pb.filter('reward = {:reward}', { reward: ctx.params.id }));
	if (used) { await pb.collection('rewards').update(ctx.params.id, { status: 'SEGERA' }); return { deleted: false, archived: true }; }
	await pb.collection('rewards').delete(ctx.params.id); return { deleted: true, archived: false };
});
