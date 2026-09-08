import { PointActivity, ActivityStatus } from '$lib/domain/entities/PointActivity.js';
import { getPocketBase } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

export class VerifiedActivityRepository {
	async getAll() {
		const pb = getPocketBase();
		if (!pb?.authStore?.isValid) return [];
		try {
			const rows = (await apiRequest('/api/pfriends/point-activities')).items || [];
			return rows.map((row) => PointActivity.from({
				id: `PB-${row.id}`,
				awardeeId: row.awardeeId,
				activityType: row.activityType,
				points: row.points,
				status: ActivityStatus.AWARDED,
				idempotencyKey: row.legacyActivityId ? `pb-demo:${row.legacyActivityId}` : `pb-submission:${row.submission}`,
				refId: row.submission || row.legacyActivityId,
				evidence: row.submission ? [`pocketbase:${row.submission}`] : [],
				capReason: row.capReason || null,
				note: row.source === 'DEMO_SEED' ? 'Aktivitas demo yang dimigrasikan ke ledger server.' : 'Bukti keaktifan telah disetujui Verifikator.',
				occurredAt: row.occurredAt
			}));
		} catch (error) {
			if (error?.status === 401 || error?.status === 403) return [];
			throw error;
		}
	}

	async query(criteria = {}) {
		const rows = await this.getAll();
		return rows.filter((row) => Object.entries(criteria).every(([key, value]) => value === undefined || row[key] === value));
	}
}

export const verifiedActivityRepository = new VerifiedActivityRepository();
