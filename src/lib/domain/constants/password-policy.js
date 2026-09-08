/**
 * Kebijakan kata sandi untuk akun baru.
 *
 * Fungsi ini tidak dipakai untuk memeriksa ulang akun lama saat login. Dengan
 * begitu penguatan aturan registrasi tidak mengubah atau mengunci kredensial
 * yang sudah tersimpan.
 */
export const PASSWORD_REQUIREMENTS = Object.freeze([
	Object.freeze({ id: 'length', label: 'Minimal 8 karakter' }),
	Object.freeze({ id: 'uppercase', label: 'Memiliki huruf kapital' }),
	Object.freeze({ id: 'number', label: 'Memiliki angka' })
]);

/** @param {unknown} value */
export function passwordChecks(value) {
	const password = String(value ?? '');
	return Object.freeze({
		length: password.length >= 8,
		uppercase: /[A-Z]/.test(password),
		number: /[0-9]/.test(password)
	});
}

/** @param {unknown} value */
export function isNewPasswordValid(value) {
	return Object.values(passwordChecks(value)).every(Boolean);
}
