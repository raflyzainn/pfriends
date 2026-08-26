import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recalculateGamification } from '../gamification.js';
import { recordId } from '../registration.js';
import { activeStoryConsent, arrayValue, draftForm, parseDraft, review, statusEvent, storyDto, storyFiles, slugify, validateSubmission } from '../stories.js';
import { consentMutation } from './profile.js';

function text(value) { return String(value ?? '').trim(); }
async function context(ctx, role) { const principal = await ctx.principal({ roles: [role] }); return { principal, pb: await ctx.admin() }; }
async function awardeeFor(pb, userId) { return pb.collection('awardees').getFirstListItem(pb.filter('user = {:user}', { user: userId })); }
async function dtoData(pb) { return Promise.all([pb.collection('story_reviews').getFullList({ sort: 'decidedAt' }), pb.collection('story_public_covers').getFullList()]); }
async function oneDto(pb, story) { const [reviews, covers] = await dtoData(pb); return storyDto(story, reviews, covers, true); }

apiRoute('GET', '/stories/mine', async (ctx) => {
	const { principal, pb } = await context(ctx, 'AWARDEE'), [rows, [reviews, covers]] = await Promise.all([pb.collection('stories').getFullList({ filter: pb.filter('owner = {:owner}', { owner: principal.record.id }), sort: '-draftSavedAt,-submittedAt' }), dtoData(pb)]);
	return { items: rows.map((row) => storyDto(row, reviews, covers, true)) };
});
apiRoute('POST', '/stories/drafts', async (ctx) => {
	const { principal, pb } = await context(ctx, 'AWARDEE'), form = await ctx.body(); if (!(form instanceof FormData)) throw new ApiError(400, 'Draf harus dikirim sebagai multipart form.');
	const awardee = await awardeeFor(pb, principal.record.id), consent = await activeStoryConsent(pb, awardee.id), values = parseDraft(form), uploads = storyFiles(form), now = new Date().toISOString(), id = recordId(), key = `${principal.record.id}-${Date.now()}`;
	const data = draftForm(values, uploads, { id, legacyId: `DRAFT-${key}`, slug: `draft-${key}`, author: awardee.id, owner: principal.record.id, authorLegacyId: awardee.legacyId, authorName: awardee.fullName, status: 'DRAFT', community: awardee.community, chapterId: awardee.chapterId, sensitivityScan: 'MENUNGGU', consentActive: consent, consentLegacyId: consent ? `PROFILE-${awardee.legacyId}` : '', revisionCount: 0, awardedPoints: 0, draftSavedAt: now });
	await sendBatch(pb, async (batch) => { batch.collection('stories').create(data); batch.collection('story_status_events').create(statusEvent({ id }, principal.record, 'DRAFT_SAVED', '', 'DRAFT')); });
	return { status: 201, body: await oneDto(pb, await pb.collection('stories').getOne(id)) };
});
apiRoute('PATCH', '/stories/{id}/draft', async (ctx) => {
	const { principal, pb } = await context(ctx, 'AWARDEE'), row = await pb.collection('stories').getOne(ctx.params.id);
	if (row.owner !== principal.record.id) throw new ApiError(403, 'Draf ini bukan milik Anda.'); if (!['DRAFT', 'PERLU_REVISI'].includes(row.status)) throw new ApiError(400, 'Naskah tidak dapat disunting pada status ini.');
	const form = await ctx.body(); if (!(form instanceof FormData)) throw new ApiError(400, 'Draf harus dikirim sebagai multipart form.'); const values = parseDraft(form), uploads = storyFiles(form), data = draftForm(values, uploads, { draftSavedAt: new Date().toISOString() });
	return oneDto(pb, await pb.collection('stories').update(row.id, data));
});
apiRoute('POST', '/stories/{id}/submit', async (ctx) => {
	const { principal, pb } = await context(ctx, 'AWARDEE'), row = await pb.collection('stories').getOne(ctx.params.id);
	if (row.owner !== principal.record.id) throw new ApiError(403, 'Naskah ini bukan milik Anda.'); const before = row.status; if (!['DRAFT', 'PERLU_REVISI'].includes(before)) throw new ApiError(400, 'Naskah tidak dapat dikirim pada status ini.');
	const awardee = await awardeeFor(pb, principal.record.id); if (!await activeStoryConsent(pb, awardee.id)) throw new ApiError(400, 'Consent publikasi Cerita belum aktif.'); validateSubmission(row);
	let slug = `${slugify(row.title)}-${awardee.legacyId.toLowerCase()}`; const duplicate = await pb.collection('stories').getFirstListItem(pb.filter('slug = {:slug} && id != {:id}', { slug, id: row.id })).catch(() => null); if (duplicate) slug = `${slug}-${row.id.slice(0, 6)}`;
	const now = new Date().toISOString(); let points = Number(row.awardedPoints || 0), ledger = null;
	if (before === 'DRAFT') {
		const existing = await pb.collection('verified_point_activities').getFirstListItem(pb.filter('story = {:story} && (actionCode = "STORY_SUBMIT" || activityType = "STORY_SUBMIT")', { story: row.id })).catch(() => null);
		if (!existing) { const action = await pb.collection('point_actions').getFirstListItem('code = "STORY_SUBMIT" && status = "ACTIVE"').catch(() => null); if (!action) throw new ApiError(503, 'Katalog aksi STORY_SUBMIT belum aktif.'); const date = now.slice(0, 10), entries = await pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:awardee} && (actionCode = "STORY_SUBMIT" || activityType = "STORY_SUBMIT") && occurredAt >= {:start} && occurredAt <= {:end}', { awardee: awardee.legacyId, start: `${date} 00:00:00.000Z`, end: `${date} 23:59:59.999Z` }) }); points = entries.length >= Number(action.dailyCap || 0) ? 0 : Number(action.points || 0); ledger = { id: recordId(), user: principal.record.id, source: 'STORY', story: row.id, awardeeId: awardee.legacyId, pointAction: action.id, actionCode: action.code, actionLabel: action.label, ...(action.isCore ? { activityType: action.code } : {}), points, capReason: points ? '' : 'DAILY_CAP', occurredAt: now, awardedAt: now, status: 'AWARDED' }; }
	}
	const update = { slug, status: 'DIAJUKAN', submittedAt: now, reviewer: '', reviewedAt: '', consentActive: true, consentLegacyId: `PROFILE-${awardee.legacyId}`, revisionCount: before === 'PERLU_REVISI' ? Number(row.revisionCount || 0) + 1 : Number(row.revisionCount || 0), awardedPoints: points };
	await sendBatch(pb, async (batch) => { if (ledger) batch.collection('verified_point_activities').create(ledger); batch.collection('stories').update(row.id, update); batch.collection('story_status_events').create(statusEvent(row, principal.record, before === 'DRAFT' ? 'SUBMITTED' : 'RESUBMITTED', before, 'DIAJUKAN')); });
	if (ledger) await recalculateGamification(pb, awardee.user); return oneDto(pb, { ...row, ...update });
});
apiRoute('GET', '/verifier/stories', async (ctx) => {
	const { pb } = await context(ctx, 'VERIFIER'), scope = ctx.url.searchParams.get('scope') || 'queue', all = await pb.collection('stories').getFullList({ sort: scope === 'all' ? '-draftSavedAt,-submittedAt,-publishedAt' : 'submittedAt' }), rows = all.filter((row) => scope === 'all' ? row.status !== 'DRAFT' : ['DIAJUKAN', 'REVIEW', 'DISETUJUI'].includes(row.status)), [reviews, covers] = await dtoData(pb);
	return { items: rows.map((row) => storyDto(row, reviews, covers, true)) };
});
apiRoute('GET', '/verifier/stories/{id}', async (ctx) => {
	const { pb } = await context(ctx, 'VERIFIER'), row = await pb.collection('stories').getOne(ctx.params.id); if (row.status === 'DRAFT') throw new ApiError(404, 'Cerita tidak ditemukan.');
	const [reviews, events, covers] = await Promise.all([pb.collection('story_reviews').getFullList({ filter: pb.filter('story = {:story}', { story: row.id }), sort: 'decidedAt' }), pb.collection('story_status_events').getFullList({ filter: pb.filter('story = {:story}', { story: row.id }), sort: 'occurredAt' }), pb.collection('story_public_covers').getFullList()]);
	return { story: storyDto(row, reviews, covers, true), reviews: reviews.map((item) => ({ id: item.id, reviewerId: item.reviewer, reviewerName: item.reviewerName, decision: item.decision, note: item.note || '', sensitivityChecks: arrayValue(item.sensitivityChecks), decidedAt: item.decidedAt })), events: events.map((item) => ({ id: item.id, actorName: item.actorName, eventType: item.eventType, fromStatus: item.fromStatus, toStatus: item.toStatus, note: item.note || '', occurredAt: item.occurredAt })) };
});
apiRoute('POST', '/verifier/stories/{id}/start-review', async (ctx) => {
	const { principal, pb } = await context(ctx, 'VERIFIER'), row = await pb.collection('stories').getOne(ctx.params.id); if (row.status !== 'DIAJUKAN') throw new ApiError(400, 'Naskah tidak lagi menunggu pemeriksaan.'); const now = new Date().toISOString(), update = { status: 'REVIEW', reviewer: principal.record.id, reviewedAt: now };
	await sendBatch(pb, async (batch) => { batch.collection('stories').update(row.id, update); batch.collection('story_status_events').create(statusEvent(row, principal.record, 'REVIEW_STARTED', 'DIAJUKAN', 'REVIEW')); }); return oneDto(pb, { ...row, ...update });
});
apiRoute('POST', '/verifier/stories/{id}/decision', async (ctx) => {
	const { principal, pb } = await context(ctx, 'VERIFIER'), body = await ctx.body(), row = await pb.collection('stories').getOne(ctx.params.id), note = text(body.note);
	if (!['REQUEST_REVISION', 'APPROVE'].includes(body.decision)) throw new ApiError(400, 'Keputusan tidak dikenal.'); if (body.decision === 'REQUEST_REVISION' && note.length < 5) throw new ApiError(400, 'Catatan revisi minimal 5 karakter.');
	const before = row.status, revisiTerbit = body.decision === 'REQUEST_REVISION' && before === 'TERPUBLIKASI'; if (before !== 'REVIEW' && !revisiTerbit) throw new ApiError(400, 'Naskah tidak dapat diputuskan pada status ini.'); if (before === 'REVIEW' && row.reviewer !== principal.record.id) throw new ApiError(403, 'Naskah sedang diperiksa Verifikator lain.');
	if (body.decision === 'APPROVE' && !await activeStoryConsent(pb, row.author)) throw new ApiError(400, 'Consent penulis sudah tidak aktif.');
	const checks = Array.isArray(body.sensitivityChecks) ? [...new Set(body.sensitivityChecks.map(Number))].sort((a, b) => a - b) : []; if (body.decision === 'APPROVE' && (checks.length !== 21 || checks.some((value, index) => value !== index + 1))) throw new ApiError(400, 'Seluruh checklist data sensitif wajib dikonfirmasi.');
	const now = new Date().toISOString(), after = body.decision === 'APPROVE' ? 'DISETUJUI' : 'PERLU_REVISI', update = { status: after, reviewedAt: now };
	if (after === 'DISETUJUI') Object.assign(update, { sensitivityScan: 'CLEAR', pfValidation: { validatorId: principal.record.id, validatedAt: now } }); if (revisiTerbit) Object.assign(update, { sensitivityScan: 'MENUNGGU', pfValidation: null, publishedAt: '', publishedBy: '' });
	const cover = revisiTerbit ? await pb.collection('story_public_covers').getFirstListItem(pb.filter('story = {:story}', { story: row.id })).catch(() => null) : null;
	await sendBatch(pb, async (batch) => { batch.collection('stories').update(row.id, update); if (cover) batch.collection('story_public_covers').delete(cover.id); batch.collection('story_reviews').create(review(row, principal.record, body.decision, note, checks)); batch.collection('story_status_events').create(statusEvent(row, principal.record, body.decision === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUESTED', before, after, note)); }); return oneDto(pb, { ...row, ...update });
});
apiRoute('POST', '/verifier/stories/{id}/publish', async (ctx) => {
	const { principal, pb } = await context(ctx, 'VERIFIER'), row = await pb.collection('stories').getOne(ctx.params.id); if (row.status !== 'DISETUJUI') throw new ApiError(400, 'Hanya naskah yang disetujui yang dapat diterbitkan.'); if (!await activeStoryConsent(pb, row.author) || !row.consentActive) throw new ApiError(400, 'Consent penulis sudah tidak aktif.'); validateSubmission(row); if (row.sensitivityScan !== 'CLEAR' || !row.pfValidation) throw new ApiError(400, 'Validasi PF dan pemeriksaan data sensitif belum lengkap.');
	const fileToken = await pb.files.getToken(), source = await fetch(pb.files.getURL(row, row.coverCandidate, { token: fileToken })); if (!source.ok) throw new ApiError(503, 'Foto sampul tidak dapat disalin.'); const blob = await source.blob(), coverFile = new File([blob], row.coverCandidate, { type: blob.type || 'image/jpeg' }), existing = await pb.collection('story_public_covers').getFirstListItem(pb.filter('story = {:story}', { story: row.id })).catch(() => null), now = new Date().toISOString(), coverData = new FormData(); coverData.set('story', row.id); coverData.set('publishedAt', now); coverData.set('image', coverFile); if (!existing) coverData.set('id', recordId());
	await sendBatch(pb, async (batch) => { if (existing) batch.collection('story_public_covers').update(existing.id, coverData); else batch.collection('story_public_covers').create(coverData); batch.collection('stories').update(row.id, { status: 'TERPUBLIKASI', publishedAt: now, publishedBy: principal.record.id }); batch.collection('story_reviews').create(review(row, principal.record, 'PUBLISH')); batch.collection('story_status_events').create(statusEvent(row, principal.record, 'PUBLISHED', 'DISETUJUI', 'TERPUBLIKASI')); }); return oneDto(pb, { ...row, status: 'TERPUBLIKASI', publishedAt: now, publishedBy: principal.record.id });
});
apiRoute('POST', '/verifier/stories/{id}/archive', async (ctx) => {
	const { principal, pb } = await context(ctx, 'VERIFIER'), body = await ctx.body(), reason = text(body.reason), allowed = ['DITOLAK', 'KEDALUWARSA', 'CONSENT_DICABUT', 'PERMINTAAN_ANGGOTA', 'IDLE_TIMEOUT']; if (!allowed.includes(reason)) throw new ApiError(400, 'Alasan arsip tidak dikenal.'); const row = await pb.collection('stories').getOne(ctx.params.id); if (!['REVIEW', 'DISETUJUI', 'TERPUBLIKASI'].includes(row.status)) throw new ApiError(400, 'Naskah tidak dapat diarsipkan pada status ini.'); const cover = await pb.collection('story_public_covers').getFirstListItem(pb.filter('story = {:story}', { story: row.id })).catch(() => null), now = new Date().toISOString(), update = { status: 'DIARSIPKAN', archiveReason: reason, archivedAt: now };
	await sendBatch(pb, async (batch) => { batch.collection('stories').update(row.id, update); if (cover) batch.collection('story_public_covers').delete(cover.id); batch.collection('story_reviews').create(review(row, principal.record, 'ARCHIVE', reason)); batch.collection('story_status_events').create(statusEvent(row, principal.record, 'ARCHIVED', row.status, 'DIARSIPKAN', reason)); }); return oneDto(pb, { ...row, ...update });
});
apiRoute('POST', '/stories/consent/revoke', (ctx) => consentMutation(ctx, 'REVOKED', 'PUBLIKASI_CERITA'));

function adminMeta(row, users) { const reviewer = users.find((item) => item.id === row.reviewer); return { id: row.id, legacyId: row.legacyId, slug: row.slug, title: row.title || 'Draf tanpa judul', authorId: row.authorLegacyId, authorName: row.authorName, community: row.community, chapterId: row.chapterId, status: row.status, reviewerId: row.reviewer || '', reviewerName: reviewer?.displayName || '', revisionCount: Number(row.revisionCount || 0), createdAt: row.created || null, draftSavedAt: row.draftSavedAt || null, submittedAt: row.submittedAt || null, reviewedAt: row.reviewedAt || null, publishedAt: row.publishedAt || null, archivedAt: row.archivedAt || null, archiveReason: row.archiveReason || null }; }
apiRoute('GET', '/admin/stories', async (ctx) => {
	await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(), page = Math.max(1, Number(ctx.url.searchParams.get('page') || 1)), perPage = Math.min(50, Math.max(1, Number(ctx.url.searchParams.get('perPage') || 20))), status = text(ctx.url.searchParams.get('status')), keyword = text(ctx.url.searchParams.get('q')).toLowerCase(), [all, users] = await Promise.all([pb.collection('stories').getFullList({ sort: '-draftSavedAt,-submittedAt,-publishedAt' }), pb.collection('users').getFullList()]), counts = {}; for (const row of all) counts[row.status] = (counts[row.status] || 0) + 1; const filtered = all.filter((row) => (!status || row.status === status) && (!keyword || `${row.title} ${row.authorName} ${row.authorLegacyId}`.toLowerCase().includes(keyword))), offset = (page - 1) * perPage; return { items: filtered.slice(offset, offset + perPage).map((row) => adminMeta(row, users)), page, perPage, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / perPage)), statusCounts: counts };
});
apiRoute('GET', '/admin/stories/{id}', async (ctx) => {
	await ctx.principal({ roles: ['ADMIN'] }); const pb = await ctx.admin(), [row, users, reviews, events] = await Promise.all([pb.collection('stories').getOne(ctx.params.id), pb.collection('users').getFullList(), pb.collection('story_reviews').getFullList({ filter: pb.filter('story = {:story}', { story: ctx.params.id }), sort: 'decidedAt' }), pb.collection('story_status_events').getFullList({ filter: pb.filter('story = {:story}', { story: ctx.params.id }), sort: 'occurredAt' })]); return { story: adminMeta(row, users), reviews: reviews.map((item) => ({ id: item.id, reviewerName: item.reviewerName, decision: item.decision, note: item.note || '', decidedAt: item.decidedAt })), events: events.map((item) => ({ id: item.id, actorName: item.actorName, eventType: item.eventType, fromStatus: item.fromStatus, toStatus: item.toStatus, note: item.note || '', occurredAt: item.occurredAt })) };
});
