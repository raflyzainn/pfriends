import { SCORING_TABLE } from '../../domain/constants/scoring-table.js';
import { tierUntukPoin } from '../../domain/constants/tier-table.js';

const uid = () => crypto.randomUUID();
const text = (value) => String(value ?? '').trim();
const slug = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function requireThat(ok, message, status = 400) { if (!ok) throw Object.assign(new Error(message), { status }); }
function find(rows, id) { const row = rows.find((item) => item.id === id || item.slug === id); requireThat(row, 'Data tidak ditemukan.', 404); return row; }
function parsed(value, fallback) { if (value === undefined) return fallback; if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { throw new Error('Data formulir tidak sah.'); } }
const files = (value) => value ? Array.isArray(value) ? value : [value] : [];

function initialize(state) {
	const owner = (id) => state.accounts.find((row) => row.awardeeId === id)?.id || id;
	if (!state.contentSeedReady) {
		for (const story of state.stories) {
			const cover = story.community === 'WOMENPRENEUR' ? '/img/womenpreneur-umkm.jpg' : '/img/sobi-mentoring.jpg';
			story.evidenceFiles = (story.evidenceFiles || story.mediaRefs || []).map((file) => /^(data:|\/)/.test(file) ? file : cover);
			story.mediaRefs = [...story.evidenceFiles]; story.coverCandidate ||= cover;
			if (story.status === 'TERPUBLIKASI') story.coverUrl ||= cover;
		}
		state.contentSeedReady = true;
	}
	state.storyEvents ??= []; state.storyReviews ??= []; state.broadcastEngagements ??= [];
	state.eventParticipants ??= state.events.flatMap((event) => (event.registeredAwardeeIds || []).map((id) => ({ id: `${event.id}-${id}`, event: event.id, owner: owner(id), awardeeId: id, registeredAt: event.startsAt, attendanceStatus: event.attendeeAwardeeIds?.includes(id) ? 'APPROVED' : 'NOT_SUBMITTED' })));
	state.movementParticipants ??= state.movements.flatMap((movement) => (movement.participantIds || []).map((id) => ({ id: `${movement.id}-${id}`, movement: movement.id, owner: owner(id), awardeeId: id, role: id === movement.leaderId ? 'LEADER' : 'PARTICIPANT', status: 'ACTIVE', joinedAt: movement.startsAt })));
	state.movementReports ??= state.movements.flatMap((movement) => (movement.reportIds || []).map((id) => ({ id, movement: movement.id, owner: owner(movement.leaderId), awardeeId: movement.leaderId, awardeeName: movement.leaderName, role: 'LEADER', activityDate: movement.startsAt, location: movement.region, participantCount: movement.participantIds?.length || 1, outcomeNote: movement.objective, evidenceFiles: ['/img/gerakan-mangrove.jpg'], status: 'APPROVED', revisionCount: 0, submittedAt: movement.endsAt, awardedPoints: 0 })));
}

function award(state, user, type, sourceId) {
	const previous = state.activities.find((row) => row.awardeeId === user.awardeeId && row.activityType === type && row.sourceId === sourceId);
	if (previous) return previous.points;
	const rule = state.pointActions?.find((row) => row.code === type) || SCORING_TABLE.find((row) => row.type === type), now = new Date().toISOString();
	requireThat(rule && rule.status !== 'INACTIVE', 'Aksi poin tidak aktif.');
	const count = state.activities.filter((row) => row.awardeeId === user.awardeeId && row.activityType === type && row.occurredAt?.slice(0, 10) === now.slice(0, 10)).length;
	const points = rule && (!rule.dailyCap || count < rule.dailyCap) ? rule.points : 0;
	state.activities.push({ id: uid(), awardeeId: user.awardeeId, user: user.id, activityType: type, actionCode: type, actionLabel: rule?.label || type, sourceId, points, occurredAt: now, awardedAt: now, status: 'AWARDED' });
	const profile = state.awardees.find((row) => row.id === user.awardeeId); if (profile) { profile.points = Number(profile.points || 0) + points; profile.coins = Number(profile.coins || 0) + points; }
	return points;
}

export async function handleContent(path, method, body = {}, state, user, query = new URLSearchParams()) {
	path = path.replace(/^\/api\/pfriends/, ''); body ||= {}; initialize(state);
	const now = new Date().toISOString(), role = (...roles) => requireThat(user && roles.includes(user.role), 'Akses tidak diizinkan.', 403);
	const profile = state.awardees.find((row) => row.id === user?.awardeeId);
	const owned = (story) => story.owner === user?.id || story.authorId === user?.awardeeId;
	const consent = (id) => { const latest = state.profileConsents?.filter((row) => row.awardee === id && row.consentType === 'PUBLIKASI_CERITA').sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]; return latest ? latest.eventType === 'GRANTED' && Date.parse(latest.expiresAt) > Date.now() : state.consents.some((row) => row.awardeeId === id && row.consentType === 'PUBLIKASI_CERITA' && !row.revokedAt); };
	const published = () => state.stories.filter((row) => row.status === 'TERPUBLIKASI' && row.consentActive);
	const storyDto = (row) => ({ ...row, evidenceFiles: row.evidenceFiles || row.mediaRefs || [], coverCandidate: row.coverCandidate || row.coverUrl || '', reviewNotes: row.reviewNotes || [] });
	const publicStory = (row) => { const { owner, evidenceFiles, coverCandidate, reviewNotes, reviewerId, ...visible } = storyDto(row); return { ...visible, mediaRefs: [], consentGranted: true }; };
	const movementDto = (row) => { const participants = state.movementParticipants.filter((item) => item.movement === row.id && item.status === 'ACTIVE'), reports = state.movementReports.filter((item) => item.movement === row.id); return { ...row, leaderLegacyId: row.leaderLegacyId || row.leaderId, participantCount: participants.length, approvedReportCount: reports.filter((item) => item.status === 'APPROVED').length, reportCount: reports.filter((item) => item.status === 'APPROVED').length, myParticipant: participants.find((item) => item.owner === user?.id) || null, reports: reports.filter((item) => user?.role !== 'AWARDEE' || item.owner === user.id) }; };
	const eventDto = (row) => { const participants = state.eventParticipants.filter((item) => item.event === row.id); return { ...row, registeredCount: participants.length, attendeeCount: participants.filter((item) => item.attendanceStatus === 'APPROVED').length, myParticipant: participants.find((item) => item.owner === user?.id) || null }; };
	if (method === 'GET' && path.startsWith('/public/')) {
		if (path === '/public/stories') return { items: published().map(publicStory) };
		if (path.startsWith('/public/stories/')) return publicStory(find(published(), decodeURIComponent(path.slice(16))));
		if (path === '/public/movements') return { items: state.movements.filter((row) => ['BERJALAN', 'SELESAI'].includes(row.status)).map((row) => { const { id, slug, title, category, status, objective, region, startsAt, endsAt, targetParticipants, participantCount, reportCount } = movementDto(row); return { id, slug, title, category, status, objective, region, startsAt, endsAt, targetParticipants, participantCount, reportCount }; }) };
		const active = state.awardees.filter((row) => row.status === 'AKTIF'), chapterIds = [...new Set(active.map((row) => row.chapterId).filter(Boolean))];
		if (path === '/public/communities') return { activeMembers: active.length, activeChapters: chapterIds.length, communities: ['SOBI', 'WOMENPRENEUR'].map((id) => ({ id, activeMembers: active.filter((row) => row.community === id).length, activeChapters: new Set(active.filter((row) => row.community === id).map((row) => row.chapterId)).size })), chapters: chapterIds.map((id) => ({ id, activeMembers: active.filter((row) => row.chapterId === id).length, sobiMembers: active.filter((row) => row.chapterId === id && row.community === 'SOBI').length, womenpreneurMembers: active.filter((row) => row.chapterId === id && row.community === 'WOMENPRENEUR').length })) };
		if (path === '/public/leaderboard') return { entries: [...active].sort((a, b) => b.points - a.points).slice(0, Math.min(20, Math.max(1, Number(query.get('limit')) || 8))).map((row, index) => ({ rank: index + 1, awardeeId: row.id, name: row.fullName, community: row.community, chapterId: row.chapterId, points: row.points, tier: tierUntukPoin(row.points).level })) };
		if (path === '/public/impact') return { capturedAt: now, registeredAwardees: active.filter((row) => row.consentActive).length, activeChapters: chapterIds.length, totalChapters: chapterIds.length, publishedStories: published().length, completedEvents: state.events.filter((row) => row.status === 'SELESAI' && row.outcomeNote && eventDto(row).attendeeCount >= 10).length, upcomingEvents: state.events.filter((row) => ['TERJADWAL', 'BERLANGSUNG'].includes(row.status) && row.endsAt >= now).length, runningMovements: state.movements.filter((row) => row.status === 'BERJALAN').length, recordedActions: state.activities.length, amplifiersThisMonth: new Set(state.activities.filter((row) => ['SHARE_PRIVATE', 'SHARE_PUBLIC'].includes(row.activityType) && row.occurredAt?.slice(0, 7) === now.slice(0, 7)).map((row) => row.awardeeId)).size, beneficiaryRegistry: { value: null, source: 'Data anggota belum tersedia.' } };
	}
	if (path === '/stories/mine' && method === 'GET') { role('AWARDEE'); return { items: state.stories.filter(owned).map(storyDto) }; }
	if (path === '/stories/drafts' && method === 'POST') {
		role('AWARDEE'); const id = uid(), row = { id, slug: `draft-${id}`, authorId: user.awardeeId, authorName: user.displayName, owner: user.id, community: profile?.community || '', chapterId: profile?.chapterId || '', title: '', summary: '', body: '', status: 'DRAFT', sensitivityScan: 'MENUNGGU', consentActive: consent(user.awardeeId), consentId: `LOCAL-${user.awardeeId}`, esgTags: [], mediaRefs: [], revisionCount: 0, draftSavedAt: now };
		editDraft(row, body); state.stories.unshift(row); return storyDto(row);
	}
	const storyMatch = path.match(/^\/(admin|verifier)?\/?stories(?:\/([^/]+))?(?:\/([^/]+))?$/);
	if (storyMatch && !['mine', 'consent'].includes(storyMatch[2])) {
		const [, staff, id, action] = storyMatch;
		role(staff === 'admin' ? 'ADMIN' : staff === 'verifier' ? 'VERIFIER' : 'AWARDEE');
		if (!id && method === 'GET') {
			let rows = state.stories.filter((row) => staff === 'admin' || row.status !== 'DRAFT');
			if (staff === 'verifier' && query.get('scope') !== 'all') rows = rows.filter((row) => ['DIAJUKAN', 'REVIEW', 'DISETUJUI'].includes(row.status));
			const statusCounts = {}; rows.forEach((row) => { statusCounts[row.status] = (statusCounts[row.status] || 0) + 1; });
			if (query.get('status')) rows = rows.filter((row) => row.status === query.get('status'));
			if (query.get('q')) rows = rows.filter((row) => `${row.title} ${row.authorName}`.toLowerCase().includes(query.get('q').toLowerCase()));
			const page = Math.max(1, Number(query.get('page')) || 1), perPage = Math.max(1, Number(query.get('perPage')) || 20);
			return { items: (staff === 'admin' ? rows.slice((page - 1) * perPage, page * perPage) : rows).map(storyDto), page, perPage, totalItems: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / perPage)), statusCounts };
		}
		const row = find(state.stories, id); if (!staff) requireThat(owned(row), 'Naskah bukan milik Anda.', 403);
		if (method === 'GET') return { story: storyDto(row), reviews: state.storyReviews.filter((item) => item.story === id), events: state.storyEvents.filter((item) => item.story === id) };
		const before = row.status;
		if (action === 'draft' && method === 'PATCH') { requireThat(['DRAFT', 'PERLU_REVISI'].includes(before), 'Naskah tidak dapat disunting.'); editDraft(row, body); row.draftSavedAt = now; }
		else if (action === 'submit' && method === 'POST') { requireThat(['DRAFT', 'PERLU_REVISI'].includes(before), 'Naskah tidak dapat dikirim.'); requireThat(consent(row.authorId), 'Consent publikasi belum aktif.'); validateStory(row); Object.assign(row, { status: 'DIAJUKAN', slug: `${slug(row.title)}-${row.id}`, submittedAt: now, reviewerId: null, consentActive: true, revisionCount: Number(row.revisionCount || 0) + (before === 'PERLU_REVISI' ? 1 : 0), awardedPoints: award(state, user, 'STORY_SUBMIT', row.id) }); }
		else if (staff === 'verifier' && method === 'POST') {
			if (action === 'start-review') { requireThat(before === 'DIAJUKAN', 'Naskah tidak dalam antrean.'); Object.assign(row, { status: 'REVIEW', reviewerId: user.id, reviewedAt: now }); }
			else if (action === 'decision') { requireThat(['APPROVE', 'REQUEST_REVISION'].includes(body.decision), 'Keputusan tidak sah.'); requireThat(before === 'REVIEW' || (before === 'TERPUBLIKASI' && body.decision === 'REQUEST_REVISION'), 'Status naskah tidak sesuai.'); if (before === 'REVIEW') requireThat(row.reviewerId === user.id, 'Naskah ditinjau verifikator lain.', 403); if (body.decision === 'APPROVE') { requireThat(consent(row.authorId), 'Consent penulis tidak aktif.'); requireThat(new Set(body.sensitivityChecks || []).size === 21 && body.sensitivityChecks.every((n) => Number.isInteger(n) && n >= 1 && n <= 21), 'Lengkapi 21 checklist data sensitif.'); Object.assign(row, { status: 'DISETUJUI', sensitivityScan: 'CLEAR', pfValidation: { validatorId: user.id, validatedAt: now } }); } else { requireThat(text(body.note).length >= 5, 'Catatan minimal 5 karakter.'); Object.assign(row, { status: 'PERLU_REVISI', publishedAt: null, pfValidation: null, sensitivityScan: 'MENUNGGU' }); } }
			else if (action === 'publish') { requireThat(before === 'DISETUJUI' && consent(row.authorId) && row.sensitivityScan === 'CLEAR' && row.pfValidation, 'Naskah belum memenuhi syarat terbit.'); validateStory(row); Object.assign(row, { status: 'TERPUBLIKASI', publishedAt: now, publishedById: user.id, coverUrl: row.coverCandidate }); }
			else if (action === 'archive') { requireThat(['REVIEW', 'DISETUJUI', 'TERPUBLIKASI'].includes(before), 'Naskah tidak dapat diarsipkan.'); requireThat(['DITOLAK', 'KEDALUWARSA', 'CONSENT_DICABUT', 'PERMINTAAN_ANGGOTA', 'IDLE_TIMEOUT'].includes(body.reason), 'Alasan arsip tidak sah.'); Object.assign(row, { status: 'DIARSIPKAN', archivedAt: now, archiveReason: body.reason }); }
			else return undefined;
			const review = { id: uid(), story: id, reviewerId: user.id, reviewerName: user.displayName, decision: body.decision || action.toUpperCase(), note: body.note || body.reason || '', sensitivityChecks: body.sensitivityChecks || [], decidedAt: now }; state.storyReviews.push(review); row.reviewNotes ||= []; if (review.note) row.reviewNotes.push({ ...review, at: now });
		} else return undefined;
		state.storyEvents.push({ id: uid(), story: id, actorName: user.displayName, eventType: action.toUpperCase(), fromStatus: before, toStatus: row.status, note: body.note || '', occurredAt: now }); return storyDto(row);
	}
	if (path === '/events') {
		if (method === 'GET') return { items: state.events.filter((row) => user?.role === 'VERIFIER' || ['TERJADWAL', 'BERLANGSUNG', 'SELESAI'].includes(row.status) || row.proposedBy === user?.id).map(eventDto) };
		if (method === 'POST') { role('AWARDEE'); requireThat(text(body.title).length >= 10 && text(body.description).length >= 40 && text(body.location), 'Lengkapi judul, deskripsi, dan lokasi.'); requireThat(['UPSKILLING', 'PERTEMUAN', 'SHARING'].includes(body.type), 'Jenis kegiatan tidak sah.'); dates(body, true); const row = { ...body, id: uid(), slug: `${slug(body.title)}-${Date.now()}`, status: 'DIUSULKAN', proposedBy: user.id, proposedByName: user.displayName, proposedByAwardeeId: user.awardeeId, submittedAt: now }; state.events.unshift(row); return eventDto(row); }
	}
	const eventMatch = path.match(/^\/events\/([^/]+)(?:\/([^/]+))?$/);
	if (eventMatch) {
		const row = find(state.events, eventMatch[1]), action = eventMatch[2];
		if (action === 'register' && method === 'POST') { role('AWARDEE'); const current = eventDto(row); requireThat(row.status === 'TERJADWAL' && new Date(row.startsAt) > new Date(), 'Pendaftaran telah ditutup.'); requireThat(!current.myParticipant, 'Anda sudah terdaftar.'); requireThat(!row.quota || current.registeredCount < Number(row.quota), 'Kuota penuh.'); const participant = { id: uid(), event: row.id, owner: user.id, awardeeId: user.awardeeId, awardeeName: user.displayName, registeredAt: now, attendanceStatus: 'NOT_SUBMITTED' }; state.eventParticipants.push(participant); return participant; }
		role('VERIFIER');
		if (!action && method === 'PATCH') { dates(body); for (const key of ['title', 'type', 'description', 'location', 'outcomeNote', 'isOnline', 'startsAt', 'endsAt', 'quota']) if (body[key] !== undefined) row[key] = body[key]; }
		else if (action === 'decision' && method === 'POST') { decision(body, ['APPROVE', 'REJECT']); requireThat(row.status === 'DIUSULKAN', 'Usulan sudah diputuskan.'); requireThat(row.proposedBy !== user.id, 'Pengusul tidak dapat memutuskan usulan sendiri.', 403); row.status = body.decision === 'APPROVE' ? 'TERJADWAL' : 'DITOLAK'; if (row.status === 'TERJADWAL') row.publishedAt = now; }
		else if (action === 'transition' && method === 'POST') { requireThat(({ TERJADWAL: ['BERLANGSUNG', 'DIBATALKAN'], BERLANGSUNG: ['SELESAI', 'DIBATALKAN'] }[row.status] || []).includes(body.status), 'Transisi status tidak sah.'); if (body.status === 'DIBATALKAN') requireThat(text(body.note).length >= 5, 'Alasan minimal 5 karakter.'); row.status = body.status; } else return undefined;
		Object.assign(row, { reviewedBy: user.id, reviewedAt: now, reviewNote: text(body.note) }); return eventDto(row);
	}
	if (path === '/movements') { role('AWARDEE', 'VERIFIER', 'ADMIN'); if (method === 'GET') return { items: state.movements.filter((row) => user.role !== 'AWARDEE' || ['BERJALAN', 'SELESAI'].includes(row.status) || row.proposedBy === user.id).map(movementDto) }; if (method === 'POST') { role('AWARDEE'); const values = proposal(body), row = { ...values, id: uid(), slug: `${slug(body.title)}-${Date.now()}`, status: 'DIUSULKAN', proposedBy: user.id, leaderLegacyId: user.awardeeId, leaderId: user.awardeeId, leaderName: user.displayName, submittedAt: now, esgTags: [], impact: {}, revisionCount: 0 }; state.movements.unshift(row); return movementDto(row); } }
	const movementMatch = path.match(/^\/(verifier\/)?(movements|movement-reports)\/([^/]+)\/([^/]+)$/);
	if (movementMatch && method === 'POST') {
		const [, staff, kind, id, action] = movementMatch; role(staff ? 'VERIFIER' : 'AWARDEE'); requireThat(staff ? ['decision', 'complete', 'start-review'].includes(action) : ['join', 'resubmit', 'reports', 'action-reports'].includes(action), 'Akses tidak diizinkan.', 403); const report = kind === 'movement-reports' ? find(state.movementReports, id) : null, row = find(state.movements, report ? report.movement : id);
		if (action === 'join') { requireThat(row.status === 'BERJALAN', 'Gerakan belum dapat diikuti.'); requireThat(!movementDto(row).myParticipant, 'Anda sudah bergabung.'); const participant = { id: uid(), movement: row.id, owner: user.id, awardeeId: user.awardeeId, awardeeName: user.displayName, role: 'PARTICIPANT', status: 'ACTIVE', joinedAt: now }; state.movementParticipants.push(participant); return participant; }
		if (action === 'action-reports' || action === 'reports' || (report && action === 'resubmit')) { if (report) { requireThat(report.owner === user.id, 'Laporan bukan milik Anda.', 403); requireThat(report.status === 'NEEDS_REVISION', 'Laporan tidak menunggu revisi.'); } else requireThat(row.status === 'BERJALAN' && movementDto(row).myParticipant, 'Bergabunglah pada Gerakan yang berjalan.'); const evidenceFiles = files(body.evidenceFiles).length ? files(body.evidenceFiles) : report?.evidenceFiles || []; requireThat(body.activityDate && text(body.location) && Number(body.participantCount) >= 1 && text(body.outcomeNote).length >= 40 && evidenceFiles.length && evidenceFiles.length <= 5, 'Lengkapi laporan dan 1–5 bukti.'); const result = report || { id: uid(), movement: row.id, owner: user.id, awardeeId: user.awardeeId, awardeeName: user.displayName, role: movementDto(row).myParticipant.role }; Object.assign(result, { activityDate: body.activityDate, location: text(body.location), participantCount: Number(body.participantCount), outcomeNote: text(body.outcomeNote), evidenceFiles, status: 'SUBMITTED', submittedAt: now, reviewNote: '', revisionCount: Number(result.revisionCount || 0) + (report ? 1 : 0) }); if (!report) state.movementReports.push(result); return result; }
		if (action === 'resubmit') { requireThat(row.proposedBy === user.id && row.status === 'PERLU_REVISI', 'Usulan tidak dapat diperbaiki.'); Object.assign(row, proposal(body), { status: 'DIUSULKAN', submittedAt: now, reviewNote: '', revisionCount: Number(row.revisionCount || 0) + 1 }); return movementDto(row); }
		if (action === 'start-review' && report) { requireThat(report.status === 'SUBMITTED', 'Laporan tidak dalam antrean.'); Object.assign(report, { status: 'IN_REVIEW', reviewer: user.id, reviewStartedAt: now }); return report; }
		if (action === 'complete') { requireThat(row.status === 'BERJALAN' && movementDto(row).approvedReportCount > 0, 'Gerakan memerlukan laporan yang disetujui.'); row.status = 'SELESAI'; return movementDto(row); }
		if (action === 'decision') { decision(body); const target = report || row; requireThat((report ? ['SUBMITTED', 'IN_REVIEW'] : ['DIUSULKAN', 'PERLU_REVISI']).includes(target.status), 'Data tidak menunggu keputusan.'); if (!report && body.decision === 'APPROVE') requireThat(body.esgTags?.length, 'Minimal satu tag ESG/SDG.'); target.status = report ? ({ APPROVE: 'APPROVED', REQUEST_REVISION: 'NEEDS_REVISION', REJECT: 'REJECTED' }[body.decision]) : ({ APPROVE: 'BERJALAN', REQUEST_REVISION: 'PERLU_REVISI', REJECT: 'DITOLAK' }[body.decision]); Object.assign(target, { reviewedAt: now, reviewNote: text(body.note), reviewer: user.id }); if (!report && body.decision === 'APPROVE') { const leader = state.accounts.find((account) => account.awardeeId === (row.leaderLegacyId || row.leaderId)) || state.accounts.find((account) => account.role === 'AWARDEE'); row.proposedBy ||= leader?.id; row.esgTags = body.esgTags; if (!state.movementParticipants.some((item) => item.movement === row.id && item.owner === row.proposedBy)) state.movementParticipants.push({ id: uid(), movement: row.id, owner: row.proposedBy, awardeeId: row.leaderLegacyId || row.leaderId || leader?.awardeeId, role: 'LEADER', status: 'ACTIVE', joinedAt: now }); } if (report && body.decision === 'APPROVE' && report.role === 'LEADER') report.awardedPoints = award(state, { id: report.owner, awardeeId: report.awardeeId }, 'LEAD_ACTION', row.id); return report || movementDto(row); }
	}
	const broadcastMatch = path.match(/^\/(admin\/|verifier\/)?broadcasts(?:\/([^/]+))?(?:\/([^/]+))?$/);
	if (broadcastMatch) {
		const [, staff, id, action] = broadcastMatch; role(staff === 'admin/' ? 'ADMIN' : staff === 'verifier/' ? 'VERIFIER' : 'AWARDEE');
		const dto = (row) => { const engagements = state.broadcastEngagements.filter((item) => item.broadcast === row.id && item.owner === user.id); return { ...row, read: (row.openedBy || []).includes(user.awardeeId) || engagements.some((item) => item.type === 'BROADCAST_VIEW' && item.awardedAt), ctaResponded: engagements.some((item) => item.type === 'CTA_REACT' && item.awardedAt), privateShares: engagements.filter((item) => item.type === 'SHARE_PRIVATE').length }; };
		if (method === 'GET' && !id) return { broadcasts: state.broadcasts.filter((row) => staff || row.status === 'TERKIRIM' && (row.audience === 'SEMUA' || row.audience === profile?.community)).map(dto) };
		if (method === 'POST' && !id) { role('ADMIN'); const row = { id: uid(), ...broadcastValues(body), createdBy: user.id }; state.broadcasts.unshift(row); return dto(row); }
		const row = find(state.broadcasts, id);
		if (action === 'start' && method === 'POST') { requireThat(row.status === 'TERKIRIM', 'Kabar belum dikirim.'); let engagement = state.broadcastEngagements.find((item) => item.broadcast === id && item.owner === user.id && item.type === 'BROADCAST_VIEW'); if (!engagement) { engagement = { broadcast: id, owner: user.id, type: 'BROADCAST_VIEW', startedAt: now }; state.broadcastEngagements.push(engagement); } return { unlockAt: new Date(new Date(engagement.startedAt).getTime() + 15000).toISOString() }; }
		if (action === 'engage' && method === 'POST') { requireThat(['BROADCAST_VIEW', 'CTA_REACT'].includes(body.type), 'Jenis tanggapan tidak sah.'); requireThat(row.status === 'TERKIRIM', 'Kabar belum dikirim.'); let engagement = state.broadcastEngagements.find((item) => item.broadcast === id && item.owner === user.id && item.type === body.type); if (engagement?.awardedAt) return { points: engagement.points }; if (body.type === 'BROADCAST_VIEW') requireThat(engagement?.startedAt && Date.now() - new Date(engagement.startedAt).getTime() >= 15000, 'Baca kabar selama minimal 15 detik.'); else requireThat(text(body.response).length >= 20, 'Tanggapan minimal 20 karakter.'); if (!engagement) { engagement = { broadcast: id, owner: user.id, type: body.type }; state.broadcastEngagements.push(engagement); } Object.assign(engagement, { awardedAt: now, response: text(body.response), points: award(state, user, body.type, id) }); return { points: engagement.points }; }
		role('ADMIN');
		if (action === 'publish' && method === 'POST') { publishBroadcast(row, state, now); return dto(row); }
		if (method === 'PATCH') { requireThat(row.status !== 'TERKIRIM', 'Kabar terkirim tidak dapat disunting.'); Object.assign(row, broadcastValues(body)); return dto(row); }
		if (method === 'DELETE') { requireThat(row.status !== 'TERKIRIM', 'Kabar terkirim tidak dapat dihapus.'); state.broadcasts.splice(state.broadcasts.indexOf(row), 1); return null; }
	}
	if (path === '/admin/jobs/publish-broadcasts' && method === 'POST') { role('ADMIN'); const rows = state.broadcasts.filter((row) => row.status === 'TERJADWAL' && row.scheduledAt <= now); rows.forEach((row) => publishBroadcast(row, state, now)); return { published: rows.length }; }
	return undefined;
}

function editDraft(row, body) {
	for (const key of ['title', 'summary', 'body', 'location', 'activityDate']) if (body[key] !== undefined) row[key] = text(body[key]);
	if (body.participantCount !== undefined) row.participantCount = Math.max(0, Number(body.participantCount) || 0);
	row.esgTags = parsed(body.esgTags, row.esgTags || []); row.outcome = parsed(body.outcome, row.outcome || null);
	if (body.removeEvidence === 'true' || body.removeEvidence === true) row.evidenceFiles = [];
	if (body.removeCover === 'true' || body.removeCover === true) row.coverCandidate = '';
	if (body.evidenceFiles) row.evidenceFiles = files(body.evidenceFiles);
	if (body.coverCandidate) row.coverCandidate = files(body.coverCandidate)[0];
	row.mediaRefs = row.evidenceFiles || row.mediaRefs || [];
}
function validateStory(row) {
	requireThat(text(row.title).length >= 5 && text(row.body).split(/\s+/).length >= 300, 'Judul minimal 5 karakter dan naskah minimal 300 kata.');
	requireThat(row.location && row.activityDate && Number(row.participantCount) >= 1 && text(row.outcome?.note).length >= 20, 'Lengkapi lokasi, tanggal, peserta, dan catatan hasil.');
	requireThat(row.esgTags?.length && row.esgTags.every((tag) => ['E', 'S', 'G'].includes(tag.pillar) && Number(tag.sdgGoal) >= 1 && Number(tag.sdgGoal) <= 17), 'Tag ESG dan SDG wajib sah.');
	requireThat((row.evidenceFiles || row.mediaRefs)?.length && (row.coverCandidate || row.coverUrl), 'Bukti dan foto sampul wajib tersedia.');
}
function dates(body, future = false) { const start = new Date(body.startsAt), end = new Date(body.endsAt); requireThat(Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start && (!future || start > new Date()), 'Rentang waktu tidak sah.'); }
function proposal(body) { requireThat(text(body.title).length >= 10 && text(body.objective).length >= 20 && text(body.description).length >= 40 && text(body.region), 'Lengkapi judul, tujuan, deskripsi, dan wilayah.'); const category = ({ LINGKUNGAN: 'AKSI_LINGKUNGAN', EDUKASI: 'EDUKASI_MASYARAKAT', EKONOMI: 'PEMBERDAYAAN_EKONOMI' })[body.category] || body.category; requireThat(['AKSI_LINGKUNGAN', 'EDUKASI_MASYARAKAT', 'PEMBERDAYAAN_EKONOMI'].includes(category), 'Kategori tidak sah.'); dates(body); return { title: text(body.title), objective: text(body.objective), description: text(body.description), region: text(body.region), startsAt: body.startsAt, endsAt: body.endsAt, category, targetParticipants: Math.max(1, Number(body.targetParticipants) || 1) }; }
function decision(body, choices = ['APPROVE', 'REQUEST_REVISION', 'REJECT']) { requireThat(choices.includes(body.decision), 'Keputusan tidak sah.'); if (body.decision !== 'APPROVE') requireThat(text(body.note).length >= 5, 'Catatan minimal 5 karakter.'); }
function broadcastValues(body) { requireThat(text(body.title).length >= 5 && text(body.summary).length >= 10 && text(body.body).length >= 20, 'Lengkapi judul, ringkasan, dan isi kabar.'); if (body.scheduledAt) requireThat(Number.isFinite(new Date(body.scheduledAt).getTime()), 'Jadwal tidak sah.'); return { title: text(body.title), summary: text(body.summary), body: text(body.body), channel: body.channel || 'SEMUA', contentSource: text(body.contentSource), lightCta: text(body.lightCta), ctaLink: text(body.ctaLink), audience: body.audience || 'SEMUA', scheduledAt: body.scheduledAt ? new Date(body.scheduledAt).toISOString() : null, status: body.scheduledAt ? 'TERJADWAL' : 'DRAF' }; }
function publishBroadcast(row, state, now) { if (row.status === 'TERKIRIM') return; Object.assign(row, { status: 'TERKIRIM', sentAt: now, recipientCount: state.awardees.filter((awardee) => awardee.status === 'AKTIF' && (row.audience === 'SEMUA' || awardee.community === row.audience)).length }); }
