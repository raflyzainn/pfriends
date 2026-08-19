import { browser } from '$app/environment';
import { getPocketBase, pocketBaseMessage } from '$lib/infrastructure/pocketbase/client.js';

export const SubmissionStatus = Object.freeze({ SUBMITTED: 'SUBMITTED', NEEDS_REVISION: 'NEEDS_REVISION', APPROVED: 'APPROVED' });
export const SUBMISSION_STATUS_META = Object.freeze({
	SUBMITTED: { label: 'Menunggu verifikasi', color: 'amber' },
	NEEDS_REVISION: { label: 'Perlu revisi', color: 'red' },
	APPROVED: { label: 'Disetujui', color: 'green' }
});

class ActivitySubmissionStore {
	items = $state.raw([]);
	selected = $state.raw(null);
	reviews = $state.raw([]);
	fileToken = $state('');
	loading = $state(false);
	working = $state(false);
	error = $state('');
	queueCount = $derived(this.items.filter((item) => item.status === SubmissionStatus.SUBMITTED).length);

	async load({ status = '', mine = false } = {}) {
		if (!browser) return;
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) { this.items = []; return; }
		this.loading = true; this.error = '';
		try {
			const filters = [];
			if (status) filters.push(pb.filter('status = {:status}', { status }));
			if (mine) filters.push(pb.filter('owner = {:owner}', { owner: pb.authStore.record.id }));
			this.items = await pb.collection('activity_submissions').getFullList({ sort: '-submittedAt', expand: 'owner,reviewer', filter: filters.join(' && ') });
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.loading = false; }
	}

	async detail(id) {
		const pb = getPocketBase();
		if (!pb) return null;
		this.loading = true; this.error = '';
		try {
			[this.selected, this.reviews, this.fileToken] = await Promise.all([
				pb.collection('activity_submissions').getOne(id, { expand: 'owner,reviewer' }),
				pb.collection('submission_reviews').getFullList({ filter: pb.filter('submission = {:id}', { id }), sort: 'decidedAt', expand: 'reviewer' }),
				pb.files.getToken()
			]);
			return this.selected;
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.loading = false; }
	}

	async submit(values, existingId = '') {
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		const data = new FormData();
		for (const key of ['activityType','activityDate','title','description','externalUrl']) data.set(key, values[key] || '');
		data.set('owner', pb.authStore.record.id);
		for (const file of values.files || []) data.append('evidenceFiles', file);
		this.working = true; this.error = '';
		try {
			const result = existingId ? await pb.collection('activity_submissions').update(existingId, data) : await pb.collection('activity_submissions').create(data);
			await this.load({ mine: true });
			return result;
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.working = false; }
	}

	async review(id, decision, note = '') {
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		this.working = true; this.error = '';
		try {
			await pb.send(`/api/pfriends/activity-submissions/${id}/review`, { method: 'POST', body: { decision, note } });
			await this.detail(id);
			return this.selected;
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.working = false; }
	}

	fileUrl(record, filename) {
		const pb = getPocketBase();
		return pb ? pb.files.getURL(record, filename, { token: this.fileToken }) : '';
	}
}

export const activitySubmissions = new ActivitySubmissionStore();
