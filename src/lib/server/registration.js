import { ApiError } from './auth.js';
import { whatsappResult } from '$lib/domain/constants/whatsapp.js';

export const REGISTRATION_STATUS = Object.freeze({ PENDING: 'PENDING', CLARIFICATION: 'CLARIFICATION', APPROVED: 'APPROVED', REJECTED: 'REJECTED' });
export const CONSENT_VERSION = 'awardee-registration-v1';
const PROGRAMS = new Set(['PFprestasi', 'PFmuda', 'PFsains', 'PFlestari']);
const BATCHES = new Set(['PF10', 'PF11', 'PF12']);
const COMMUNITIES = new Set(['SOBI', 'WOMENPRENEUR']);

export function text(value) { return String(value || '').trim(); }
export function required(value, label, min = 1) {
	const result = text(value);
	if (result.length < min) throw new ApiError(400, `${label} wajib diisi.`);
	return result;
}
export function normalizeWhatsapp(value) {
	const result = whatsappResult(value);
	if (!result.valid) throw new ApiError(400, result.message);
	return result.normalized;
}
export function validateRegistration(form, proofs, editing = false) {
	const community = required(form.get('community'), 'Komunitas');
	const programPillar = required(form.get('programPillar'), 'Program asal');
	const batch = required(form.get('batch'), 'Batch');
	if (!COMMUNITIES.has(community)) throw new ApiError(400, 'Komunitas tidak dikenal.');
	if (!PROGRAMS.has(programPillar)) throw new ApiError(400, 'Program asal tidak dikenal.');
	if (!BATCHES.has(batch)) throw new ApiError(400, 'Batch tidak dikenal.');
	if (community === 'SOBI') {
		required(form.get('university'), 'Kampus asal', 2);
		const year = Number(form.get('graduationYear'));
		if (!Number.isInteger(year) || year < 1980 || year > 2100) throw new ApiError(400, 'Tahun kelulusan tidak sah.');
	} else {
		required(form.get('businessName'), 'Nama usaha', 2);
		required(form.get('businessSector'), 'Sektor usaha', 2);
		required(form.get('businessCity'), 'Kota usaha', 2);
	}
	if (!editing && text(form.get('consent')) !== 'true') throw new ApiError(400, 'Persetujuan pengolahan data wajib diberikan.');
	if ((!editing && (proofs.length < 1 || proofs.length > 3)) || (editing && proofs.length > 3)) {
		throw new ApiError(400, editing ? 'Maksimal tiga berkas bukti baru.' : 'Unggah satu sampai tiga berkas bukti.');
	}
	for (const file of proofs) {
		if (file.size > 5 * 1024 * 1024) throw new ApiError(400, 'Ukuran setiap bukti maksimal 5 MB.');
		if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) throw new ApiError(400, 'Format bukti tidak didukung.');
	}
	return { community, programPillar, batch };
}

export function profileFields(form, normalized) {
	return {
		fullName: required(form.get('fullName'), 'Nama lengkap', 3),
		whatsapp: normalizeWhatsapp(form.get('whatsapp')),
		community: normalized.community,
		programPillar: normalized.programPillar,
		batch: normalized.batch,
		region: required(form.get('region'), 'Wilayah', 2),
		university: normalized.community === 'SOBI' ? text(form.get('university')) : '',
		graduationYear: normalized.community === 'SOBI' ? Number(form.get('graduationYear')) : null,
		businessName: normalized.community === 'WOMENPRENEUR' ? text(form.get('businessName')) : '',
		businessSector: normalized.community === 'WOMENPRENEUR' ? text(form.get('businessSector')) : '',
		businessCity: normalized.community === 'WOMENPRENEUR' ? text(form.get('businessCity')) : ''
	};
}

export function recordId() {
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	return Array.from(bytes, (value) => (value % 36).toString(36)).join('');
}
