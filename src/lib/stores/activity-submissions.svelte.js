import { browser } from '$app/environment';
import { getPocketBase, pocketBaseMessage } from '$lib/infrastructure/pocketbase/client.js';

export const SubmissionStatus = Object.freeze({ SUBMITTED: 'SUBMITTED', IN_REVIEW: 'IN_REVIEW', NEEDS_REVISION: 'NEEDS_REVISION', APPROVED: 'APPROVED' });
export const SUBMISSION_STATUS_META = Object.freeze({
	SUBMITTED: { label: 'Sudah dikirim', color: 'amber' },
	IN_REVIEW: { label: 'Sedang diperiksa', color: 'blue' },
	NEEDS_REVISION: { label: 'Perlu revisi', color: 'red' },
	APPROVED: { label: 'Disetujui', color: 'green' }
});

export const SUBMISSION_EVENT_META = Object.freeze({
	SUBMITTED: 'Bukti berhasil dikirim',
	REVIEW_STARTED: 'Pemeriksaan dimulai',
	REVISION_REQUESTED: 'Perbaikan diminta',
	RESUBMITTED: 'Perbaikan dikirim ulang',
	APPROVED: 'Bukti disetujui'
});

class ActivitySubmissionStore {
	items = $state.raw([]);
	selected = $state.raw(null);
	reviews = $state.raw([]);
	events = $state.raw([]);
	reviewHistory = $state.raw([]);
	reviewHistoryPage = $state.raw({ page: 1, perPage: 25, totalPages: 1, totalItems: 0 });
	fileToken = $state('');
	loading = $state(false);
	working = $state(false);
	error = $state('');
	queueCount = $derived(this.items.filter((item) => item.status === SubmissionStatus.SUBMITTED || item.status === SubmissionStatus.IN_REVIEW).length);

	async load({ status = '', mine = false } = {}) {
		if (!browser) return;
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) { this.items = []; return; }
		this.loading = true; this.error = '';
		try {
			const filters = [];
			if (status) filters.push(pb.filter('status = {:status}', { status }));
			if (mine) filters.push(pb.filter('owner = {:owner}', { owner: pb.authStore.record.id }));
			const records = await pb.collection('activity_submissions').getFullList({ sort: '-submittedAt', expand: 'owner,reviewer', filter: filters.join(' && ') });
			this.items = records.map((item) => ({ ...item, expand: { ...item.expand, owner: item.expand?.owner ?? { displayName: item.awardeeName } } }));
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.loading = false; }
	}

	async detail(id) {
		const pb = getPocketBase();
		if (!pb) return null;
		this.loading = true; this.error = '';
		try {
			[this.selected, this.reviews, this.events, this.fileToken] = await Promise.all([
				pb.collection('activity_submissions').getOne(id, { expand: 'owner,reviewer' }),
				pb.collection('submission_reviews').getFullList({ filter: pb.filter('submission = {:id}', { id }), sort: 'decidedAt', expand: 'reviewer' }),
				pb.collection('submission_status_events').getFullList({ filter: pb.filter('submission = {:id}', { id }), sort: 'occurredAt', expand: 'actor' }),
				pb.files.getToken()
			]);
			this.selected = { ...this.selected, expand: { ...this.selected.expand, owner: this.selected.expand?.owner ?? { displayName: this.selected.awardeeName } } };
			this.reviews = this.reviews.map((review) => ({ ...review, expand: { ...review.expand, reviewer: review.expand?.reviewer ?? { displayName: review.reviewerName } } }));
			this.events = this.events.map((event) => ({ ...event, expand: { ...event.expand, actor: event.expand?.actor ?? { displayName: event.actorName } } }));
			return this.selected;
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.loading = false; }
	}

	async loadReviewHistory({ page = 1, decision = '' } = {}) {
		if (!browser) return;
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) { this.reviewHistory = []; return; }
		this.loading = true; this.error = '';
		try {
			const filter = decision ? pb.filter('decision = {:decision}', { decision }) : '';
			const result = await pb.collection('submission_reviews').getList(page, 25, { sort: '-decidedAt', filter, expand: 'reviewer,submission,submission.owner' });
			this.reviewHistory = result.items.map((review) => {
				const submission = review.expand?.submission;
				return { ...review, expand: { ...review.expand, reviewer: review.expand?.reviewer ?? { displayName: review.reviewerName }, submission: submission ? { ...submission, expand: { ...submission.expand, owner: submission.expand?.owner ?? { displayName: submission.awardeeName } } } : submission } };
			});
			this.reviewHistoryPage = { page: result.page, perPage: result.perPage, totalPages: result.totalPages, totalItems: result.totalItems };
			return result;
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.loading = false; }
	}

	async submit(values, existingId = '') {
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		const data = new FormData();
		for (const key of ['pointAction','activityType','activityDate','title','description','externalUrl']) data.set(key, values[key] || '');
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

	async submitAttendance(event, files, existingId = '') {
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		const data = new FormData();
		data.set('activityType', 'SESSION_ATTEND'); data.set('event', event.id); data.set('activityDate', event.endsAt.toISOString()); data.set('title', `Kehadiran: ${event.title}`); data.set('description', `Bukti kehadiran pada event ${event.title}.`); data.set('owner', pb.authStore.record.id);
		for (const file of files || []) data.append('evidenceFiles', file);
		this.working = true; this.error = '';
		try { const result = existingId ? await pb.collection('activity_submissions').update(existingId, data) : await pb.collection('activity_submissions').create(data); await this.load({ mine: true }); return result; }
		catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.working = false; }
	}

	async submitBroadcastShare(broadcast, platform, url, files, activityType = 'SHARE_PUBLIC') {
		const pb = getPocketBase(); if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		const data = new FormData(); data.set('activityType',activityType); data.set('broadcast',broadcast.id); data.set('activityDate',new Date().toISOString()); data.set('title',`${activityType === 'SHARE_PRIVATE' ? 'Share WhatsApp' : 'Share publik'}: ${broadcast.title}`); data.set('description',`Dibagikan melalui ${platform}.`); data.set('externalUrl',url); data.set('owner',pb.authStore.record.id); for(const file of files)data.append('evidenceFiles',file);
		this.working=true; try { const result=await pb.collection('activity_submissions').create(data); await this.load({mine:true}); return result; } catch(error){this.error=pocketBaseMessage(error);throw error} finally{this.working=false}
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

	async startReview(id) {
		const pb = getPocketBase();
		if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
		this.working = true; this.error = '';
		try {
			await pb.send(`/api/pfriends/activity-submissions/${id}/start-review`, { method: 'POST' });
			return await this.detail(id);
		} catch (error) { this.error = pocketBaseMessage(error); throw error; }
		finally { this.working = false; }
	}

	fileUrl(record, filename) {
		const pb = getPocketBase();
		return pb ? pb.files.getURL(record, filename, { token: this.fileToken }) : '';
	}
}

export const activitySubmissions = new ActivitySubmissionStore();
