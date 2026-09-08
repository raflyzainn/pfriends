const ALLOWED_CHARACTERS = /^\+?[0-9()\s-]+$/;

export function whatsappResult(value) {
	const raw = String(value ?? '').trim();
	if (!raw || !ALLOWED_CHARACTERS.test(raw)) {
		return { valid: false, normalized: '', message: 'Nomor WhatsApp hanya boleh berisi angka dan pemisah telepon yang umum.' };
	}

	let digits = raw.replace(/\D/g, '');
	if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
	else if (!digits.startsWith('62')) {
		return { valid: false, normalized: '', message: 'Gunakan nomor Indonesia yang diawali 08, 62, atau +62.' };
	}

	if (digits.length < 10 || digits.length > 15) {
		return { valid: false, normalized: '', message: 'Nomor WhatsApp harus berisi 10 sampai 15 digit.' };
	}

	return { valid: true, normalized: `+${digits}`, message: '' };
}

export function isWhatsappValid(value) {
	return whatsappResult(value).valid;
}
