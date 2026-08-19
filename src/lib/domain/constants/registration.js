export const RegistrationStatus = Object.freeze({
	PENDING: 'PENDING',
	CLARIFICATION: 'CLARIFICATION',
	APPROVED: 'APPROVED',
	REJECTED: 'REJECTED'
});

export const REGISTRATION_STATUS_META = Object.freeze({
	[RegistrationStatus.PENDING]: Object.freeze({ label: 'Menunggu verifikasi', color: 'amber' }),
	[RegistrationStatus.CLARIFICATION]: Object.freeze({ label: 'Perlu klarifikasi', color: 'amber' }),
	[RegistrationStatus.APPROVED]: Object.freeze({ label: 'Disetujui', color: 'green' }),
	[RegistrationStatus.REJECTED]: Object.freeze({ label: 'Ditolak', color: 'red' })
});

export const PROGRAM_PILLARS = Object.freeze([
	Object.freeze({ id: 'PFprestasi', label: 'PFprestasi' }),
	Object.freeze({ id: 'PFmuda', label: 'PFmuda' }),
	Object.freeze({ id: 'PFsains', label: 'PFsains' }),
	Object.freeze({ id: 'PFlestari', label: 'PFlestari' })
]);

export const REGISTRATION_CONSENT_VERSION = 'awardee-registration-v1';

export function isApprovedOnboarding(status) {
	return status === RegistrationStatus.APPROVED || !status;
}
