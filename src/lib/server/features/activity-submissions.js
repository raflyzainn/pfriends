import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recalculateGamification } from '../gamification.js';
import { recordId } from '../registration.js';

const FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const LEGACY_ACTIVITY_TYPES = new Set(['SHARE_PUBLIC', 'STORY_SUBMIT', 'SESSION_ATTEND', 'KNOWLEDGE_QA', 'SPEAKER_MENTOR', 'LEAD_ACTION', 'SHARE_PRIVATE']);
function text(value) { return String(value ?? '').trim(); }
function formObject(form) { return Object.fromEntries([...form.entries()].filter(([, value]) => !(value instanceof File))); }
function files(form) { return form.getAll('evidenceFiles').filter((value) => value instanceof File && value.size > 0); }
function validateFiles(items, required) {
	if ((required && items.length < 1) || items.length > 5) throw new ApiError(400, required ? 'Unggah satu sampai lima berkas bukti.' : 'Maksimal lima berkas bukti baru.');
	for (const file of items) { if (!FILE_TYPES.has(file.type)) throw new ApiError(400, 'Format berkas bukti tidak didukung.'); if (file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Ukuran setiap bukti maksimal 5 MB.'); }
}
async function roleContext(ctx, roles) { const principal = await ctx.principal({ roles }); return { principal, pb: await ctx.admin() }; }
async function actionFor(pb, body) {
	let action;
	if (body.pointAction) action = await pb.collection('point_actions').getOne(body.pointAction);
	else action = await pb.collection('point_actions').getFirstListItem(pb.filter('code = {:code}', { code: text(body.actionCode || body.activityType) }));
	if (action.status !== 'ACTIVE') throw new ApiError(400, 'Aksi poin sedang tidak aktif.');
	if (action.workflow !== 'EVIDENCE') throw new ApiError(400, 'Aksi ini tidak diajukan melalui Bukti Keaktifan.');
	return action;
}
function safeUser(record, fallback) { return record ? { id: record.id, displayName: record.displayName, role: record.role } : { displayName: fallback }; }
async function decorate(pb, submissions) {
	const userIds = new Set(submissions.flatMap((row) => [row.owner, row.reviewer]).filter(Boolean)), users = await pb.collection('users').getFullList();
	const byId = new Map(users.filter((row) => userIds.has(row.id)).map((row) => [row.id, row]));
	return submissions.map((row) => ({ ...row, expand: { owner: safeUser(byId.get(row.owner), row.awardeeName), ...(row.reviewer ? { reviewer: safeUser(byId.get(row.reviewer), 'Verifikator') } : {}) } }));
}
function assertOwnership(principal, submission) { if (principal.role !== 'VERIFIER' && submission.owner !== principal.record.id) throw new ApiError(403, 'Pengajuan ini tidak dapat diakses.'); }
async function normalizeSubmission(pb, principal, body) {
	const action = await actionFor(pb, body), values = {
		owner: principal.record.id, awardeeId: principal.record.awardeeId, awardeeName: principal.record.displayName,
		activityType: LEGACY_ACTIVITY_TYPES.has(action.code) ? action.code : '', pointAction: action.id, actionCode: action.code,
		activityDate: text(body.activityDate), title: text(body.title), description: text(body.description), externalUrl: text(body.externalUrl), event: '', eventParticipant: '', broadcast: ''
	};
	if (!values.activityDate || values.title.length < 3 || values.description.length < 20) throw new ApiError(400, 'Tanggal, judul, dan deskripsi bukti belum lengkap.');
	if (values.activityType === 'SESSION_ATTEND') {
		if (!body.event) throw new ApiError(400, 'Bukti hadir wajib terhubung ke event.');
		const event = await pb.collection('events').getOne(body.event);
		if (!['TERJADWAL', 'BERLANGSUNG', 'SELESAI'].includes(event.status) || new Date(event.endsAt) > new Date()) throw new ApiError(400, 'Bukti hadir baru dapat dikirim setelah event selesai.');
		const participant = await pb.collection('event_participants').getFirstListItem(pb.filter('event = {:event} && owner = {:owner}', { event: event.id, owner: principal.record.id }));
		Object.assign(values, { event: event.id, eventParticipant: participant.id, activityDate: event.endsAt, title: `Kehadiran: ${event.title}`, description: `Bukti kehadiran pada event ${event.title}.` });
	} else if (['SHARE_PRIVATE', 'SHARE_PUBLIC'].includes(values.activityType)) {
		if (!body.broadcast) throw new ApiError(400, 'Bukti share wajib terhubung ke kabar.');
		const broadcast = await pb.collection('broadcasts').getOne(body.broadcast); if (broadcast.status !== 'TERKIRIM') throw new ApiError(400, 'Kabar belum diterbitkan.');
		if (values.activityType === 'SHARE_PUBLIC' && !values.externalUrl) throw new ApiError(400, 'Tautan unggahan wajib diisi.');
		Object.assign(values, { broadcast: broadcast.id, title: `${values.activityType === 'SHARE_PUBLIC' ? 'Share publik' : 'Share WhatsApp'}: ${broadcast.title}`, description: `Bukti amplifikasi kabar ${broadcast.title}.` });
	}
	return { values, action };
}

apiRoute('GET', '/activity-submissions', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['AWARDEE', 'VERIFIER']), status = text(ctx.url.searchParams.get('status')), mine = ctx.url.searchParams.get('mine') === 'true';
	let rows = await pb.collection('activity_submissions').getFullList({ sort: '-submittedAt' });
	if (principal.role === 'AWARDEE' || mine) rows = rows.filter((row) => row.owner === principal.record.id);
	if (status) rows = rows.filter((row) => row.status === status);
	return { items: await decorate(pb, rows) };
});
apiRoute('GET', '/activity-submissions/reviews', async (ctx) => {
	const { pb } = await roleContext(ctx, ['VERIFIER']), page = Math.max(1, Number(ctx.url.searchParams.get('page') || 1)), decision = text(ctx.url.searchParams.get('decision'));
	const result = await pb.collection('submission_reviews').getList(page, 25, { ...(decision ? { filter: pb.filter('decision = {:decision}', { decision }) } : {}), sort: '-decidedAt' });
	const submissions = await pb.collection('activity_submissions').getFullList(), users = await pb.collection('users').getFullList(), subBy = new Map(submissions.map((row) => [row.id, row])), userBy = new Map(users.map((row) => [row.id, row]));
	return { ...result, items: result.items.map((review) => { const submission = subBy.get(review.submission); return { ...review, expand: { reviewer: safeUser(userBy.get(review.reviewer), review.reviewerName), submission: submission ? { ...submission, expand: { owner: safeUser(userBy.get(submission.owner), submission.awardeeName) } } : null } }; }) };
});
apiRoute('GET', '/activity-submissions/{id}', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['AWARDEE', 'VERIFIER']), submission = await pb.collection('activity_submissions').getOne(ctx.params.id); assertOwnership(principal, submission);
	const [decorated, reviews, events, users] = await Promise.all([decorate(pb, [submission]), pb.collection('submission_reviews').getFullList({ filter: pb.filter('submission = {:id}', { id: submission.id }), sort: 'decidedAt' }), pb.collection('submission_status_events').getFullList({ filter: pb.filter('submission = {:id}', { id: submission.id }), sort: 'occurredAt' }), pb.collection('users').getFullList()]);
	const byId = new Map(users.map((row) => [row.id, row]));
	return { submission: decorated[0], reviews: reviews.map((row) => ({ ...row, expand: { reviewer: safeUser(byId.get(row.reviewer), row.reviewerName) } })), events: events.map((row) => ({ ...row, expand: { actor: safeUser(byId.get(row.actor), row.actorName) } })) };
});
apiRoute('POST', '/activity-submissions', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['AWARDEE']), form = await ctx.body(); if (!(form instanceof FormData)) throw new ApiError(400, 'Bukti harus dikirim sebagai multipart form.');
	const uploads = files(form); validateFiles(uploads, true); const { values } = await normalizeSubmission(pb, principal, formObject(form)), now = new Date().toISOString(), data = new FormData();
	const id = recordId();
	for (const [key, value] of Object.entries({ id, ...values, status: 'SUBMITTED', revisionCount: 0, reviewer: '', reviewNote: '', reviewStartedAt: '', reviewedAt: '', awardedPoints: 0, submittedAt: now })) data.set(key, String(value ?? ''));
	for (const file of uploads) data.append('evidenceFiles', file);
	await sendBatch(pb, async (batch) => {
		batch.collection('activity_submissions').create(data);
		batch.collection('submission_status_events').create({ id: recordId(), submission: id, actor: principal.record.id, actorName: principal.record.displayName, eventType: 'SUBMITTED', toStatus: 'SUBMITTED', occurredAt: now });
		if (values.eventParticipant) batch.collection('event_participants').update(values.eventParticipant, { attendanceStatus: 'SUBMITTED' });
	});
	const submission = await pb.collection('activity_submissions').getOne(id);
	return { status: 201, body: submission };
});
apiRoute('PATCH', '/activity-submissions/{id}', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['AWARDEE']), current = await pb.collection('activity_submissions').getOne(ctx.params.id);
	if (current.owner !== principal.record.id || current.status !== 'NEEDS_REVISION') throw new ApiError(403, 'Pengajuan ini tidak dapat diperbarui.');
	const form = await ctx.body(); if (!(form instanceof FormData)) throw new ApiError(400, 'Bukti harus dikirim sebagai multipart form.'); const uploads = files(form); validateFiles(uploads, false);
	const body = formObject(form), now = new Date().toISOString(), data = new FormData();
	for (const field of ['activityDate', 'title', 'description', 'externalUrl']) if (body[field] !== undefined) data.set(field, text(body[field]));
	data.set('status', 'SUBMITTED'); data.set('reviewer', ''); data.set('reviewStartedAt', ''); data.set('submittedAt', now);
	for (const file of uploads) data.append('evidenceFiles', file);
	await sendBatch(pb, async (batch) => {
		batch.collection('activity_submissions').update(current.id, data);
		batch.collection('submission_status_events').create({ id: recordId(), submission: current.id, actor: principal.record.id, actorName: principal.record.displayName, eventType: 'RESUBMITTED', fromStatus: 'NEEDS_REVISION', toStatus: 'SUBMITTED', occurredAt: now });
		if (current.eventParticipant) batch.collection('event_participants').update(current.eventParticipant, { attendanceStatus: 'SUBMITTED' });
	});
	return pb.collection('activity_submissions').getOne(current.id);
});

apiRoute('POST', '/activity-submissions/{id}/start-review', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['VERIFIER']), submission = await pb.collection('activity_submissions').getOne(ctx.params.id);
	if (submission.status !== 'SUBMITTED') throw new ApiError(400, 'Pengajuan tidak lagi menunggu pemeriksaan.');
	const now = new Date().toISOString();
	await sendBatch(pb, async (batch) => {
		batch.collection('activity_submissions').update(submission.id, { status: 'IN_REVIEW', reviewer: principal.record.id, reviewStartedAt: now });
		if (submission.eventParticipant) batch.collection('event_participants').update(submission.eventParticipant, { attendanceStatus: 'IN_REVIEW' });
		batch.collection('submission_status_events').create({ id: recordId(), submission: submission.id, actor: principal.record.id, actorName: principal.record.displayName, eventType: 'REVIEW_STARTED', fromStatus: 'SUBMITTED', toStatus: 'IN_REVIEW', occurredAt: now });
	});
	return { ...submission, status: 'IN_REVIEW', reviewer: principal.record.id, reviewStartedAt: now };
});

apiRoute('POST', '/activity-submissions/{id}/review', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, ['VERIFIER']), body = await ctx.body(), decision = body.decision, note = text(body.note);
	if (!['APPROVE', 'REQUEST_REVISION'].includes(decision)) throw new ApiError(400, 'Keputusan tidak dikenal.');
	if (decision === 'REQUEST_REVISION' && note.length < 5) throw new ApiError(400, 'Catatan revisi minimal 5 karakter.');
	const submission = await pb.collection('activity_submissions').getOne(ctx.params.id); if (submission.status !== 'IN_REVIEW') throw new ApiError(400, 'Pengajuan harus mulai diperiksa sebelum diputuskan.');
	const now = new Date().toISOString(), approved = decision === 'APPROVE', action = approved ? await actionFor(pb, submission) : null;
	let points = 0, capped = false;
	if (approved) {
		const date = String(submission.activityDate).slice(0, 10), entries = await pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:awardee} && (actionCode = {:type} || activityType = {:type}) && occurredAt >= {:start} && occurredAt <= {:end}', { awardee: submission.awardeeId, type: action.code, start: `${date} 00:00:00.000Z`, end: `${date} 23:59:59.999Z` }) });
		capped = entries.length >= Number(action.dailyCap || 0); points = capped ? 0 : Number(action.points || 0);
	}
	const status = approved ? 'APPROVED' : 'NEEDS_REVISION', update = { status, awardedPoints: points, revisionCount: approved ? Number(submission.revisionCount || 0) : Number(submission.revisionCount || 0) + 1, reviewer: principal.record.id, reviewNote: note, reviewedAt: now };
	await sendBatch(pb, async (batch) => {
		batch.collection('submission_reviews').create({ id: recordId(), submission: submission.id, reviewer: principal.record.id, reviewerName: principal.record.displayName, decision, note, decidedAt: now });
		if (approved) batch.collection('verified_point_activities').create({ id: recordId(), submission: submission.id, user: submission.owner, source: 'EVIDENCE', awardeeId: submission.awardeeId, pointAction: action.id, actionCode: action.code, actionLabel: action.label, ...(action.isCore ? { activityType: action.code } : {}), points, capReason: capped ? 'DAILY_CAP' : '', occurredAt: submission.activityDate, awardedAt: now, status: 'AWARDED', ...(submission.broadcast ? { broadcast: submission.broadcast } : {}) });
		batch.collection('activity_submissions').update(submission.id, update);
		if (submission.eventParticipant) batch.collection('event_participants').update(submission.eventParticipant, { attendanceStatus: approved ? 'APPROVED' : 'NEEDS_REVISION', ...(approved ? { attendedAt: now } : {}) });
		batch.collection('submission_status_events').create({ id: recordId(), submission: submission.id, actor: principal.record.id, actorName: principal.record.displayName, eventType: approved ? 'APPROVED' : 'REVISION_REQUESTED', fromStatus: 'IN_REVIEW', toStatus: status, note, occurredAt: now });
	});
	if (approved) { const awardee = await pb.collection('awardees').getFirstListItem(pb.filter('legacyId = {:id}', { id: submission.awardeeId })); await recalculateGamification(pb, awardee.user); }
	return { ...submission, ...update };
});
