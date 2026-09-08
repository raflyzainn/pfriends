const VERIFIER_REPORT_STATUSES = new Set(['SUBMITTED', 'IN_REVIEW']);
const REDEMPTION_QUEUE_STATUSES = new Set(['DIAJUKAN', 'DISETUJUI', 'DIKIRIM']);

export function countVerifierMovementQueue(movements = []) {
	return movements.filter((item) => item.status === 'DIUSULKAN').length +
		movements.flatMap((item) => item.reports || []).filter((report) => VERIFIER_REPORT_STATUSES.has(report.status)).length;
}

export function countAwardeeMovementRevisions(movements = [], accountId = '') {
	return movements.filter((item) => item.proposedBy === accountId && item.status === 'PERLU_REVISI').length +
		movements.flatMap((item) => item.reports || []).filter((report) => report.status === 'NEEDS_REVISION').length;
}

export function countRedemptionQueue(redemptions = []) {
	return redemptions.filter((item) => REDEMPTION_QUEUE_STATUSES.has(item.status)).length;
}
