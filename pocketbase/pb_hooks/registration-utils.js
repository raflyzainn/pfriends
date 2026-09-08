const REGISTRATION_STATUS = {
	PENDING: 'PENDING',
	CLARIFICATION: 'CLARIFICATION',
	APPROVED: 'APPROVED',
	REJECTED: 'REJECTED'
};

const CONSENT_VERSION = 'awardee-registration-v1';
const PROGRAMS = ['PFprestasi', 'PFmuda', 'PFsains', 'PFlestari'];
const BATCHES = ['PF10', 'PF11', 'PF12'];
const COMMUNITIES = ['SOBI', 'WOMENPRENEUR'];

function bodyOf(e) { return e.requestInfo().body || {}; }
function text(value) { return String(value || '').trim(); }
function normalizeEmail(value) { return text(value).toLowerCase(); }
function normalizeWhatsapp(value) {
	let digits = text(value).replace(/\D/g, '');
	if (digits.startsWith('0')) digits = '62' + digits.slice(1);
	if (!digits.startsWith('62')) digits = '62' + digits;
	if (digits.length < 10 || digits.length > 15) throw new BadRequestError('Nomor WhatsApp tidak sah.');
	return '+' + digits;
}
function required(value, label, min) {
	const result = text(value);
	if (result.length < (min || 1)) throw new BadRequestError(label + ' wajib diisi.');
	return result;
}
function validateRegistration(data, proofs, editing) {
	const community = required(data.community, 'Komunitas');
	const program = required(data.programPillar, 'Program asal');
	const batch = required(data.batch, 'Batch');
	if (COMMUNITIES.indexOf(community) === -1) throw new BadRequestError('Komunitas tidak dikenal.');
	if (PROGRAMS.indexOf(program) === -1) throw new BadRequestError('Program asal tidak dikenal.');
	if (BATCHES.indexOf(batch) === -1) throw new BadRequestError('Batch tidak dikenal.');
	if (community === 'SOBI') {
		required(data.university, 'Kampus asal', 2);
		const year = Number(data.graduationYear);
		if (!Number.isInteger(year) || year < 1980 || year > 2100) throw new BadRequestError('Tahun kelulusan tidak sah.');
	} else {
		required(data.businessName, 'Nama usaha', 2);
		required(data.businessSector, 'Sektor usaha', 2);
		required(data.businessCity, 'Kota usaha', 2);
	}
	if (!editing && text(data.consent) !== 'true') throw new BadRequestError('Persetujuan pengolahan data wajib diberikan.');
	if (!editing && (proofs.length < 1 || proofs.length > 3)) throw new BadRequestError('Unggah satu sampai tiga berkas bukti.');
	if (editing && proofs.length > 3) throw new BadRequestError('Maksimal tiga berkas bukti baru.');
	return { community, program, batch };
}
function setProfileFields(record, data, normalized) {
	record.set('fullName', required(data.fullName, 'Nama lengkap', 3));
	record.set('whatsapp', normalizeWhatsapp(data.whatsapp));
	record.set('community', normalized.community);
	record.set('programPillar', normalized.program);
	record.set('batch', normalized.batch);
	record.set('region', required(data.region, 'Wilayah', 2));
	record.set('university', normalized.community === 'SOBI' ? text(data.university) : '');
	record.set('graduationYear', normalized.community === 'SOBI' ? Number(data.graduationYear) : null);
	record.set('businessName', normalized.community === 'WOMENPRENEUR' ? text(data.businessName) : '');
	record.set('businessSector', normalized.community === 'WOMENPRENEUR' ? text(data.businessSector) : '');
	record.set('businessCity', normalized.community === 'WOMENPRENEUR' ? text(data.businessCity) : '');
}

module.exports = { REGISTRATION_STATUS, CONSENT_VERSION, bodyOf, text, normalizeEmail, normalizeWhatsapp, required, validateRegistration, setProfileFields };
