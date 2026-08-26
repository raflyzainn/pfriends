import { ApiError } from './auth.js';
import { recordId } from './registration.js';

const FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']), COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function arrayValue(value) { return Array.isArray(value) ? value : []; }
export function objectValue(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
export function slugify(value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 130) || 'cerita'; }
export function wordCount(value) { return String(value || '').trim().split(/\s+/).filter(Boolean).length; }
export function statusEvent(story, actor, eventType, fromStatus, toStatus, note = '') { return { id: recordId(), story: story.id, actor: actor?.id || '', actorName: actor?.displayName || 'Sistem', eventType, fromStatus: fromStatus || '', toStatus, note: String(note || '').trim(), occurredAt: new Date().toISOString() }; }
export function review(story, actor, decision, note = '', sensitivityChecks = []) { return { id: recordId(), story: story.id, reviewer: actor.id, reviewerName: actor.displayName, decision, note: String(note || '').trim(), sensitivityChecks, decidedAt: new Date().toISOString() }; }
export function validateSubmission(record) {
	const tags = arrayValue(record.esgTags);
	if (String(record.title || '').trim().length < 5) throw new ApiError(400, 'Judul minimal 5 karakter.');
	if (wordCount(record.body) < 300) throw new ApiError(400, 'Naskah minimal 300 kata.');
	if (!String(record.location || '').trim() || !record.activityDate || Number(record.participantCount || 0) < 1) throw new ApiError(400, 'Tanggal aktivitas, lokasi, dan jumlah peserta wajib diisi.');
	if (!objectValue(record.outcome) || String(record.outcome.note || '').trim().length < 20) throw new ApiError(400, 'Catatan hasil minimal 20 karakter.');
	if (!tags.length || !tags.every((tag) => ['E', 'S', 'G'].includes(String(tag?.pillar || '')) && Number.parseInt(String(tag?.sdgGoal || ''), 10) >= 1 && Number.parseInt(String(tag?.sdgGoal || ''), 10) <= 17)) throw new ApiError(400, 'Tag ESG dan SDG wajib sah.');
	if (!arrayValue(record.evidenceFiles).length) throw new ApiError(400, 'Minimal satu berkas bukti wajib tersedia.');
	if (!record.coverCandidate) throw new ApiError(400, 'Foto sampul wajib tersedia.');
}
export function parseDraft(form) {
	const data = Object.fromEntries([...form.entries()].filter(([, value]) => !(value instanceof File))), result = {};
	for (const field of ['title', 'summary', 'body', 'location', 'activityDate']) if (data[field] !== undefined) result[field] = String(data[field] || '').trim();
	if (data.participantCount !== undefined) result.participantCount = Math.max(0, Number(data.participantCount) || 0);
	if (data.esgTags !== undefined) { try { result.esgTags = JSON.parse(data.esgTags); } catch { throw new ApiError(400, 'Tag ESG tidak sah.'); } }
	if (data.outcome !== undefined) { try { result.outcome = JSON.parse(data.outcome); } catch { throw new ApiError(400, 'Data hasil kegiatan tidak sah.'); } }
	result.removeEvidence = data.removeEvidence === 'true'; result.removeCover = data.removeCover === 'true';
	return result;
}
export function storyFiles(form) {
	const evidence = form.getAll('evidenceFiles').filter((value) => value instanceof File && value.size > 0), covers = form.getAll('coverCandidate').filter((value) => value instanceof File && value.size > 0);
	if (evidence.length > 5 || covers.length > 1) throw new ApiError(400, 'Jumlah berkas Cerita melebihi batas.');
	for (const file of evidence) { if (!FILE_TYPES.has(file.type) || file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Berkas bukti Cerita tidak didukung atau terlalu besar.'); }
	for (const file of covers) { if (!COVER_TYPES.has(file.type) || file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Foto sampul tidak didukung atau terlalu besar.'); }
	return { evidence, covers };
}
export function draftForm(values, uploads, base = {}) {
	const form = new FormData(), payload = { ...values }; delete payload.removeEvidence; delete payload.removeCover;
	for (const [key, value] of Object.entries(payload)) form.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
	if (values.removeEvidence) form.set('@jsonPayload', JSON.stringify({ evidenceFiles: [] }));
	if (values.removeCover) form.set('@jsonPayload', JSON.stringify({ ...(values.removeEvidence ? { evidenceFiles: [] } : {}), coverCandidate: '' }));
	for (const [key, value] of Object.entries(base)) form.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''));
	for (const file of uploads.evidence) form.append('evidenceFiles', file); if (uploads.covers[0]) form.set('coverCandidate', uploads.covers[0]);
	return form;
}
export async function activeStoryConsent(pb, awardeeId) {
	const rows = await pb.collection('profile_consents').getFullList({ filter: pb.filter('awardee = {:awardee} && consentType = "PUBLIKASI_CERITA"', { awardee: awardeeId }), sort: '-occurredAt' }), latest = rows[0];
	return Boolean(latest && latest.eventType === 'GRANTED' && new Date(latest.expiresAt) > new Date());
}
export function publicCover(covers, storyId) { const row = covers.find((item) => item.story === storyId); return row?.image ? `/api/files/${row.collectionId}/${row.id}/${row.image}` : ''; }
export function storyDto(record, reviews = [], covers = [], includePrivate = true) {
	const notes = includePrivate ? reviews.filter((row) => row.story === record.id && row.note).map((row) => ({ reviewerId: row.reviewer, reviewerName: row.reviewerName, note: row.note, at: row.decidedAt, decision: row.decision })) : [];
	return { id: record.id, legacyId: record.legacyId, slug: record.slug, authorId: record.authorLegacyId, authorName: record.authorName, title: record.title || '', summary: record.summary || '', body: record.body || '', status: record.status, community: record.community, chapterId: record.chapterId, esgTags: arrayValue(record.esgTags), mediaRefs: includePrivate ? arrayValue(record.evidenceFiles) : arrayValue(record.mediaRefs), evidenceFiles: includePrivate ? arrayValue(record.evidenceFiles) : [], coverCandidate: includePrivate ? record.coverCandidate || '' : '', coverUrl: publicCover(covers, record.id), outcome: objectValue(record.outcome), location: record.location || '', activityDate: record.activityDate || null, participantCount: Number(record.participantCount || 0), sensitivityScan: record.sensitivityScan, pfValidation: objectValue(record.pfValidation), consentActive: Boolean(record.consentActive), consentId: record.consentLegacyId || null, reviewNotes: notes.length ? notes : arrayValue(record.reviewNotes), reviewerId: record.reviewer || null, reviewedAt: record.reviewedAt || null, publishedById: record.publishedBy || '', revisionCount: Number(record.revisionCount || 0), submittedAt: record.submittedAt || null, publishedAt: record.publishedAt || null, archivedAt: record.archivedAt || null, archiveReason: record.archiveReason || null, views: Number(record.views || 0), draftSavedAt: record.draftSavedAt || null, awardedPoints: Number(record.awardedPoints || 0) };
}
