import { browser } from '$app/environment';
import { KPI_TARGETS, REACH_PARAMETERS, rasioPencapaian, statusKpi } from '$lib/domain/constants/kpi-targets.js';
import { adminDashboardSnapshot } from '$lib/infrastructure/pocketbase/adminDashboard.js';

function emptySummary() {
	return { stories: { total: 0, published: 0, pending: 0 }, dissemination: { contents: 0, days: 0 }, accounts: { total: 0, active: 0, byRole: { AWARDEE: 0, VERIFIER: 0, ADMIN: 0 } } };
}

function reachFromAmplifiers(amplifiers) {
	const min = Math.round(amplifiers * REACH_PARAMETERS.jaringanSosialMin * REACH_PARAMETERS.koefisienEksposurMin * (1 - REACH_PARAMETERS.overlapJaringan));
	const max = Math.round(amplifiers * REACH_PARAMETERS.jaringanSosialMax * REACH_PARAMETERS.koefisienEksposurMax * (1 - REACH_PARAMETERS.overlapJaringan));
	return { min, max, mid: Math.round((min + max) / 2) };
}

class AdminStore {
	loading = $state(false);
	loaded = $state(false);
	error = $state('');
	capturedAt = $state('');
	period = $state.raw({ startsAt: '2026-01-01', endsAt: '2026-07-31', referenceMonth: '2026-07' });
	summary = $state.raw(emptySummary());
	kpi = $state.raw([]);
	programMonths = $state.raw([]);
	monthly = $state.raw([]);
	dissemination = $state.raw([]);
	amplification = $state.raw([]);
	monthlyTrend = $state.raw([]);
	reachBand = $state.raw([]);
	engagement = $state.raw([]);
	slaCompliance = $state.raw([]);
	esgReadiness = $state.raw([]);
	chapters = $state.raw([]);
	#request = null;

	pendingCount = $derived(this.summary.stories.pending);

	async load({ force = false } = {}) {
		if (!browser) return;
		if (this.loaded && !force) return;
		if (this.#request && !force) return this.#request;
		this.#request = this.#load();
		try { await this.#request; } finally { this.#request = null; }
	}

	async #load() {
		this.loading = true;
		this.error = '';
		try {
			const data = await adminDashboardSnapshot();
			this.capturedAt = data.capturedAt || '';
			this.period = data.period;
			this.summary = data.summary;
			this.monthly = data.monthly || [];
			this.programMonths = this.monthly.map((row) => ({ monthKey: row.monthKey, label: row.label }));
			this.dissemination = this.monthly.map((row) => ({ monthKey: row.monthKey, label: row.label, contents: row.disseminatedContents, days: row.disseminationDays }));
			this.amplification = this.monthly.map((row) => ({ monthKey: row.monthKey, label: row.label, activeRate: row.amplificationRate, amplifiers: row.amplifiers }));
			this.monthlyTrend = this.monthly.map((row) => ({ monthKey: row.monthKey, points: row.points }));
			this.reachBand = this.monthly.map((row) => ({ monthKey: row.monthKey, label: row.label, ...reachFromAmplifiers(row.amplifiers) }));
			this.engagement = data.engagement || [];
			this.slaCompliance = data.sla || [];
			this.esgReadiness = data.esg?.pillars || [];
			this.chapters = data.chapters || [];
			const actuals = new Map((data.kpiActuals || []).map((row) => [row.id, row]));
			this.kpi = KPI_TARGETS.map((target) => {
				const row = actuals.get(target.id) || { actual: 0, numerator: 0, denominator: 0 };
				return { ...target, actual: row.actual, target: target.targetMax ?? target.target, percent: Math.round(rasioPencapaian(row.actual, target) * 100), status: statusKpi(row.actual, target), numerator: row.numerator, denominator: row.denominator };
			});
			this.loaded = true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Dasbor KPI tidak dapat dimuat.';
			throw error;
		} finally {
			this.loading = false;
		}
	}

	async reload() { return this.load({ force: true }); }
}

export const admin = new AdminStore();
