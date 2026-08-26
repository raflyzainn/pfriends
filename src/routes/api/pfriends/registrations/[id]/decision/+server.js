import { json } from '@sveltejs/kit';
import { requirePrincipal, ApiError } from '$lib/server/auth.js';
import { createAdminPocketBase } from '$lib/server/pocketbase.js';
import { sendBatch } from '$lib/server/batch.js';
import { apiFailure, noStoreHeaders } from '$lib/server/response.js';
import { recordId, text } from '$lib/server/registration.js';
import { REGISTRATION_CONSENT_PURPOSE, REGISTRATION_CONSENT_STATEMENT } from '$lib/domain/constants/registration.js';

const DECISIONS = new Set(['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT', 'REOPEN']);

async function optionalOne(pb, collection, filter) {
	try { return await pb.collection(collection).getFirstListItem(filter); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}

export async function POST({ request, params }) {
	try {
		const principal = await requirePrincipal(request, { roles: ['VERIFIER'] });
		const body = await request.json().catch(() => ({}));
		const decision = text(body.decision);
		const note = text(body.note);
		if (!DECISIONS.has(decision)) throw new ApiError(400, 'Keputusan tidak dikenal.');
		if (decision !== 'APPROVE' && note.length < 5) throw new ApiError(400, 'Catatan keputusan minimal lima karakter.');
		const admin = await createAdminPocketBase();
		let registration;
		try { registration = await admin.collection('awardee_registrations').getOne(params.id); }
		catch (error) { if (error?.status === 404) throw new ApiError(404, 'Registrasi tidak ditemukan.'); throw error; }
		if (decision === 'REOPEN' && registration.status !== 'REJECTED') throw new ApiError(409, 'Hanya registrasi ditolak yang dapat dibuka kembali.');
		if (decision !== 'REOPEN' && registration.status !== 'PENDING') throw new ApiError(409, 'Registrasi tidak lagi menunggu keputusan.');
		const nextStatus = decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'CLARIFICATION';
		const user = await admin.collection('users').getOne(registration.owner);
		const now = new Date().toISOString();
		const existingAwardee = await optionalOne(admin, 'awardees', admin.filter('user = {:user}', { user: user.id }));
		const awardeeId = existingAwardee?.legacyId || `AWD-${user.id.toUpperCase()}`;
		let policy = null;
		if (decision === 'APPROVE' && !existingAwardee) {
			policy = await optionalOne(admin, 'consent_policies', admin.filter('consentType = {:type} && status = {:status}', { type: 'PENGOLAHAN_DATA_INTERNAL', status: 'ACTIVE' }));
		}
		await sendBatch(admin, (batch) => {
			if (decision === 'APPROVE' && !existingAwardee) {
				const awardeeRecordId = recordId();
				batch.collection('awardees').create({ id: awardeeRecordId, user: user.id, legacyId: awardeeId, fullName: registration.fullName, email: registration.email, whatsapp: registration.whatsapp, community: registration.community, programPillar: registration.programPillar, chapterId: registration.batch, city: registration.region, university: registration.university || '', graduationYear: registration.graduationYear || null, businessName: registration.businessName || '', businessSector: registration.businessSector || '', businessCity: registration.businessCity || '', status: 'AKTIF', consentActive: false, profileVisibility: 'DIRECTORY', nameConsentActive: false, businessConsentActive: false, joinedAt: now });
				const grantedAt = registration.consentedAt || now;
				const expires = new Date(grantedAt); expires.setMonth(expires.getMonth() + 24);
				batch.collection('profile_consents').create({ id: recordId(), awardee: awardeeRecordId, owner: user.id, consentType: 'PENGOLAHAN_DATA_INTERNAL', eventType: 'GRANTED', policyVersion: registration.consentVersion || policy?.version, purpose: policy?.purpose || REGISTRATION_CONSENT_PURPOSE, statementText: policy?.statementText || REGISTRATION_CONSENT_STATEMENT, scope: ['SEMUA_KONTEN'], channels: ['LAPORAN_INTERNAL'], occurredAt: grantedAt, expiresAt: expires.toISOString(), via: 'FORM_MICROSITE' });
			}
			batch.collection('users').update(user.id, { status: decision === 'APPROVE' ? 'AKTIF' : 'NONAKTIF', onboardingStatus: nextStatus, community: registration.community, ...(decision === 'APPROVE' ? { awardeeId } : {}) });
			batch.collection('awardee_registrations').update(registration.id, { status: nextStatus, reviewer: principal.record.id, reviewerName: principal.record.displayName, reviewNote: note, reviewedAt: now, revisionCount: nextStatus === 'CLARIFICATION' ? Number(registration.revisionCount || 0) + 1 : Number(registration.revisionCount || 0) });
			batch.collection('registration_reviews').create({ id: recordId(), registration: registration.id, reviewer: principal.record.id, reviewerName: principal.record.displayName, decision, note, decidedAt: now });
		});
		return json({ status: nextStatus, message: 'Keputusan registrasi tersimpan.' }, { headers: noStoreHeaders() });
	} catch (error) { return apiFailure(error, 'Keputusan registrasi gagal disimpan.'); }
}
