import { apiRoute, noContent } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { pointAction, recalculateGamification } from '../gamification.js';
import { recordId, text } from '../registration.js';

async function optionalOne(pb, collection, filter) { try { return await pb.collection(collection).getFirstListItem(filter); } catch (error) { if (error?.status === 404) return null; throw error; } }
function dto(row, engagements = []) { return { id: row.id, title: row.title, summary: row.summary, body: row.body, status: row.status, channel: row.channel, contentSource: row.contentSource, lightCta: row.lightCta, ctaLink: row.ctaLink, audience: row.audience, scheduledAt: row.scheduledAt || null, sentAt: row.sentAt || null, recipientCount: Number(row.recipientCount) || 0, read: engagements.some((x) => x.type === 'BROADCAST_VIEW' && x.awardedAt), ctaResponded: engagements.some((x) => x.type === 'CTA_REACT' && x.awardedAt), privateShares: engagements.filter((x) => x.type === 'SHARE_PRIVATE').length }; }
function values(body) {
	const title = text(body.title), summary = text(body.summary), content = text(body.body);
	if (title.length < 5) throw new ApiError(400, 'Judul minimal 5 karakter.');
	if (summary.length < 10) throw new ApiError(400, 'Ringkasan minimal 10 karakter.');
	if (content.length < 20) throw new ApiError(400, 'Isi kabar minimal 20 karakter.');
	let scheduledAt = text(body.scheduledAt);
	if (scheduledAt) { const date = new Date(scheduledAt); if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Jadwal tidak valid.'); scheduledAt = date.toISOString(); }
	return { title, summary, body: content, channel: text(body.channel || 'SEMUA'), contentSource: text(body.contentSource), lightCta: text(body.lightCta), ctaLink: text(body.ctaLink), audience: text(body.audience || 'SEMUA'), scheduledAt, status: scheduledAt ? 'TERJADWAL' : 'DRAF' };
}
async function listForStaff(ctx, role) { await ctx.principal({ roles: [role] }); const pb = await ctx.admin(); return { broadcasts: (await pb.collection('broadcasts').getFullList({ sort: '-sentAt' })).map((row) => dto(row)) }; }

apiRoute('GET', '/broadcasts', async (ctx) => {
	const principal = await ctx.principal({ roles: ['AWARDEE'] }); const pb = await ctx.admin();
	const awardee = await pb.collection('awardees').getFirstListItem(pb.filter('user = {:user}', { user: principal.record.id }));
	const rows = await pb.collection('broadcasts').getFullList({ filter: pb.filter('status = "TERKIRIM" && (audience = "SEMUA" || audience = {:community})', { community: awardee.community }), sort: '-sentAt' });
	const engagements = await pb.collection('broadcast_engagements').getFullList({ filter: pb.filter('owner = {:owner}', { owner: principal.record.id }) });
	return { broadcasts: rows.map((row) => dto(row, engagements.filter((item) => item.broadcast === row.id))) };
});
apiRoute('GET', '/admin/broadcasts', (ctx) => listForStaff(ctx, 'ADMIN'));
apiRoute('GET', '/verifier/broadcasts', (ctx) => listForStaff(ctx, 'VERIFIER'));

apiRoute('POST', '/broadcasts/{id}/start', async (ctx) => {
	const principal = await ctx.principal({ roles: ['AWARDEE'] }); const pb = await ctx.admin();
	const broadcast = await pb.collection('broadcasts').getOne(ctx.params.id);
	if (broadcast.status !== 'TERKIRIM') throw new ApiError(404, 'Kabar tidak ditemukan.');
	let row = await optionalOne(pb, 'broadcast_engagements', pb.filter('broadcast = {:broadcast} && owner = {:owner} && type = "BROADCAST_VIEW"', { broadcast: broadcast.id, owner: principal.record.id }));
	if (!row) row = await pb.collection('broadcast_engagements').create({ id: recordId(), broadcast: broadcast.id, owner: principal.record.id, awardeeId: principal.record.awardeeId, type: 'BROADCAST_VIEW', startedAt: new Date().toISOString() });
	return { unlockAt: new Date(new Date(row.startedAt).getTime() + 15000).toISOString() };
});

apiRoute('POST', '/broadcasts/{id}/engage', async (ctx) => {
	const principal = await ctx.principal({ roles: ['AWARDEE'] }); const pb = await ctx.admin(); const body = await ctx.body();
	const type = text(body.type), response = text(body.response), requestKey = text(body.requestKey);
	if (!['BROADCAST_VIEW', 'CTA_REACT'].includes(type)) throw new ApiError(400, 'Jenis engagement tidak dikenal.');
	if (type === 'CTA_REACT' && response.length < 20) throw new ApiError(400, 'Tanggapan minimal 20 karakter.');
	const broadcast = await pb.collection('broadcasts').getOne(ctx.params.id), awardee = await pb.collection('awardees').getFirstListItem(pb.filter('user = {:user}', { user: principal.record.id }));
	let engagement = await optionalOne(pb, 'broadcast_engagements', pb.filter('broadcast = {:broadcast} && owner = {:owner} && type = {:type}', { broadcast: broadcast.id, owner: principal.record.id, type }));
	if (engagement?.awardedAt) return { points: Number(engagement.points) || 0 };
	const now = new Date();
	if (type === 'BROADCAST_VIEW' && (!engagement?.startedAt || now - new Date(engagement.startedAt) < 15000)) throw new ApiError(400, 'Kabar perlu dibaca minimal 15 detik.');
	const action = await pointAction(pb, type), day = now.toISOString().slice(0, 10);
	const usage = await pb.collection('verified_point_activities').getList(1, 1, { filter: pb.filter('awardeeId = {:awardee} && (actionCode = {:type} || activityType = {:type}) && occurredAt >= {:start} && occurredAt <= {:end}', { awardee: awardee.legacyId, type, start: `${day} 00:00:00.000Z`, end: `${day} 23:59:59.999Z` }), fields: 'id' });
	const points = usage.totalItems >= Number(action.dailyCap) ? 0 : Number(action.points);
	const engagementId = engagement?.id || recordId(), ledgerId = recordId(), occurredAt = now.toISOString();
	await sendBatch(pb, (batch) => {
		const data = { broadcast: broadcast.id, owner: principal.record.id, awardeeId: awardee.legacyId, type, response, requestKey, awardedAt: occurredAt, points };
		if (engagement) batch.collection('broadcast_engagements').update(engagement.id, data); else batch.collection('broadcast_engagements').create({ id: engagementId, ...data });
		batch.collection('verified_point_activities').create({ id: ledgerId, user: principal.record.id, source: 'ENGAGEMENT', broadcast: broadcast.id, broadcastEngagement: engagementId, awardeeId: awardee.legacyId, pointAction: action.id, actionCode: action.code, actionLabel: action.label, activityType: type, points, capReason: points ? '' : 'DAILY_CAP', occurredAt, awardedAt: occurredAt, status: 'AWARDED' });
	});
	await recalculateGamification(pb, principal.record.id);
	return { points };
});

apiRoute('POST', '/admin/broadcasts', async (ctx) => { const principal = await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(); const row = await pb.collection('broadcasts').create({ id: recordId(), ...values(await ctx.body()), createdBy: principal.record.id }); return { status: 201, body: dto(row) }; });
apiRoute('PATCH', '/admin/broadcasts/{id}', async (ctx) => { const principal = await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(); const current = await pb.collection('broadcasts').getOne(ctx.params.id); if (current.status === 'TERKIRIM') throw new ApiError(409, 'Kabar terkirim tidak dapat disunting.'); return dto(await pb.collection('broadcasts').update(current.id, { ...values(await ctx.body()), updatedBy: principal.record.id })); });
apiRoute('POST', '/admin/broadcasts/{id}/publish', async (ctx) => { const principal = await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(); let row = await pb.collection('broadcasts').getOne(ctx.params.id); if (row.status !== 'TERKIRIM') { const filter = row.audience === 'SEMUA' ? 'status = "AKTIF"' : pb.filter('status = "AKTIF" && community = {:audience}', { audience: row.audience }); const recipients = await pb.collection('awardees').getList(1, 1, { filter, fields: 'id' }); row = await pb.collection('broadcasts').update(row.id, { status: 'TERKIRIM', sentAt: new Date().toISOString(), recipientCount: recipients.totalItems, updatedBy: principal.record.id }); } return dto(row); });
apiRoute('DELETE', '/admin/broadcasts/{id}', async (ctx) => { await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(); const row = await pb.collection('broadcasts').getOne(ctx.params.id); if (row.status === 'TERKIRIM') throw new ApiError(409, 'Kabar terkirim tidak dapat dihapus.'); await pb.collection('broadcasts').delete(row.id); return noContent(); });

apiRoute('POST', '/admin/jobs/publish-broadcasts', async (ctx) => { const principal = await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(); const now = new Date().toISOString(); const rows = await pb.collection('broadcasts').getFullList({ filter: pb.filter('status = "TERJADWAL" && scheduledAt <= {:now}', { now }) }); let published = 0; for (const row of rows) { const filter = row.audience === 'SEMUA' ? 'status = "AKTIF"' : pb.filter('status = "AKTIF" && community = {:audience}', { audience: row.audience }); const recipients = await pb.collection('awardees').getList(1, 1, { filter, fields: 'id' }); await pb.collection('broadcasts').update(row.id, { status: 'TERKIRIM', sentAt: now, recipientCount: recipients.totalItems, updatedBy: principal.record.id }); published++; } return { published }; });
