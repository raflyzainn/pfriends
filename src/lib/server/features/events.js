import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { recordId } from '../registration.js';

const PUBLIC_STATUSES = new Set(['TERJADWAL', 'BERLANGSUNG', 'SELESAI']);
function text(value) { return String(value ?? '').trim(); }
function slugify(value) { return text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
async function optionalOne(pb, collection, query) { try { return await pb.collection(collection).getFirstListItem(query); } catch (error) { if (error?.status === 404) return null; throw error; } }
async function optionalPrincipal(ctx) { try { return await ctx.principal({ allowApplicant: true }); } catch { return null; } }
async function roleContext(ctx, role) { const principal = await ctx.principal({ roles: [role] }); return { principal, pb: await ctx.admin() }; }
function eventDto(record, participants, principal) {
	const mine = principal ? participants.find((row) => row.owner === principal.record.id) : null;
	const audit = principal && (principal.role === 'VERIFIER' || record.proposedBy === principal.record.id);
	return {
		id: record.id, title: record.title, slug: record.slug, type: record.type, status: record.status, description: record.description || '',
		speakerName: record.speakerName || '', chapterId: record.chapterId || '', community: record.community || '', location: record.location || '',
		isOnline: Boolean(record.isOnline), startsAt: record.startsAt, endsAt: record.endsAt, quota: Number(record.quota || 0),
		proposedBy: audit ? record.proposedBy || '' : '', proposedByName: audit ? record.proposedByName || '' : '', proposedByAwardeeId: audit ? record.proposedByAwardeeId || '' : '',
		submittedAt: audit ? record.submittedAt || '' : '', reviewedBy: audit ? record.reviewedBy || '' : '', reviewedAt: audit ? record.reviewedAt || '' : '', reviewNote: audit ? record.reviewNote || '' : '',
		publishedAt: record.publishedAt || '', outcomeNote: record.outcomeNote || '', registeredCount: participants.length,
		attendeeCount: participants.filter((row) => row.attendanceStatus === 'APPROVED').length,
		myParticipant: mine ? { id: mine.id, awardeeId: mine.awardeeId, attendanceStatus: mine.attendanceStatus, registeredAt: mine.registeredAt, attendedAt: mine.attendedAt || '' } : null
	};
}

apiRoute('GET', '/events', async (ctx) => {
	const principal = await optionalPrincipal(ctx), pb = await ctx.admin();
	let events = await pb.collection('events').getFullList({ sort: 'startsAt' });
	if (principal?.role !== 'VERIFIER') events = events.filter((row) => PUBLIC_STATUSES.has(row.status) || (principal?.role === 'AWARDEE' && row.proposedBy === principal.record.id));
	const participants = await pb.collection('event_participants').getFullList();
	return { items: events.map((event) => eventDto(event, participants.filter((row) => row.event === event.id), principal)) };
});

apiRoute('POST', '/events', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, 'AWARDEE'), body = await ctx.body();
	const start = new Date(body.startsAt), end = new Date(body.endsAt), title = text(body.title), description = text(body.description), location = text(body.location);
	if (title.length < 10 || description.length < 40 || !location) throw new ApiError(400, 'Judul, deskripsi, dan lokasi kegiatan belum lengkap.');
	if (!['UPSKILLING', 'PERTEMUAN', 'SHARING'].includes(body.type)) throw new ApiError(400, 'Jenis kegiatan tidak dikenal.');
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start || start <= new Date()) throw new ApiError(400, 'Waktu kegiatan harus sah dan berada di masa depan.');
	const base = slugify(title) || `event-${Date.now()}`, duplicate = await optionalOne(pb, 'events', pb.filter('slug = {:slug}', { slug: base }));
	const now = new Date().toISOString();
	const event = await pb.collection('events').create({ id: recordId(), title, slug: duplicate ? `${base}-${Date.now().toString(36)}` : base, type: body.type, status: 'DIUSULKAN', description, speakerName: text(body.speakerName), chapterId: text(body.chapterId), community: text(body.community || principal.record.community), location, isOnline: Boolean(body.isOnline), startsAt: start.toISOString(), endsAt: end.toISOString(), quota: Math.max(0, Number(body.quota) || 0), proposedBy: principal.record.id, proposedByName: principal.record.displayName, proposedByAwardeeId: principal.record.awardeeId, submittedAt: now });
	return { status: 201, body: event };
});

apiRoute('POST', '/events/{id}/decision', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, 'VERIFIER'), body = await ctx.body();
	if (!['APPROVE', 'REJECT'].includes(body.decision)) throw new ApiError(400, 'Keputusan tidak dikenal.');
	if (body.decision === 'REJECT' && text(body.note).length < 5) throw new ApiError(400, 'Alasan penolakan minimal 5 karakter.');
	const event = await pb.collection('events').getOne(ctx.params.id);
	if (event.status !== 'DIUSULKAN') throw new ApiError(400, 'Usulan tidak lagi menunggu keputusan.');
	if (event.proposedBy === principal.record.id) throw new ApiError(403, 'Pengusul tidak boleh memutuskan usulannya sendiri.');
	const now = new Date().toISOString();
	return pb.collection('events').update(event.id, { status: body.decision === 'APPROVE' ? 'TERJADWAL' : 'DITOLAK', reviewedBy: principal.record.id, reviewedAt: now, reviewNote: text(body.note), ...(body.decision === 'APPROVE' ? { publishedAt: now } : {}) });
});

apiRoute('PATCH', '/events/{id}', async (ctx) => {
	const { pb } = await roleContext(ctx, 'VERIFIER'), body = await ctx.body(), event = await pb.collection('events').getOne(ctx.params.id);
	const start = new Date(body.startsAt), end = new Date(body.endsAt);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new ApiError(400, 'Rentang waktu tidak sah.');
	const update = {};
	for (const field of ['title', 'type', 'description', 'location', 'outcomeNote']) if (body[field] !== undefined) update[field] = text(body[field]);
	Object.assign(update, { isOnline: Boolean(body.isOnline), startsAt: start.toISOString(), endsAt: end.toISOString(), quota: Math.max(0, Number(body.quota) || 0) });
	return pb.collection('events').update(event.id, update);
});

apiRoute('POST', '/events/{id}/transition', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, 'VERIFIER'), body = await ctx.body(), event = await pb.collection('events').getOne(ctx.params.id);
	const allowed = { TERJADWAL: ['BERLANGSUNG', 'DIBATALKAN'], BERLANGSUNG: ['SELESAI', 'DIBATALKAN'] };
	if (!(allowed[event.status] || []).includes(body.status)) throw new ApiError(400, 'Transisi status kegiatan tidak sah.');
	if (body.status === 'DIBATALKAN' && text(body.note).length < 5) throw new ApiError(400, 'Alasan pembatalan minimal 5 karakter.');
	return pb.collection('events').update(event.id, { status: body.status, reviewedBy: principal.record.id, reviewedAt: new Date().toISOString(), reviewNote: text(body.note) });
});

apiRoute('POST', '/events/{id}/register', async (ctx) => {
	const { principal, pb } = await roleContext(ctx, 'AWARDEE'), event = await pb.collection('events').getOne(ctx.params.id);
	if (event.status !== 'TERJADWAL' || new Date(event.startsAt) <= new Date()) throw new ApiError(400, 'Pendaftaran kegiatan sudah ditutup.');
	const participants = await pb.collection('event_participants').getFullList({ filter: pb.filter('event = {:event}', { event: event.id }) });
	if (participants.some((row) => row.owner === principal.record.id)) throw new ApiError(400, 'Anda sudah terdaftar pada kegiatan ini.');
	if (Number(event.quota || 0) > 0 && participants.length >= Number(event.quota)) throw new ApiError(400, 'Kuota kegiatan sudah penuh.');
	const row = await pb.collection('event_participants').create({ id: recordId(), event: event.id, owner: principal.record.id, awardeeId: principal.record.awardeeId, awardeeName: principal.record.displayName, registeredAt: new Date().toISOString(), attendanceStatus: 'NOT_SUBMITTED' });
	return { status: 201, body: row };
});
