import { browser } from '$app/environment';
import {
	decideRegistration,
	myRegistration,
	proofUrls,
	registrationQueue,
	registrationReviews,
	resubmitRegistration,
	submitRegistration
} from '$lib/infrastructure/pocketbase/registration.js';

class RegistrationStore {
	current = $state.raw(null);
	items = $state.raw([]);
	reviews = $state.raw([]);
	proofs = $state.raw([]);
	loading = $state(false);
	working = $state(false);
	error = $state(null);

	async register(formData) {
		this.working = true;
		this.error = null;
		try {
			return await submitRegistration(formData);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Registrasi gagal dikirim.';
			throw error;
		} finally {
			this.working = false;
		}
	}

	async loadMine() {
		if (!browser) return null;
		this.loading = true;
		this.error = null;
		try {
			this.current = await myRegistration();
			this.proofs = this.current ? await proofUrls(this.current) : [];
			this.reviews = this.current ? await registrationReviews(this.current.id) : [];
			return this.current;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Status registrasi gagal dimuat.';
			return null;
		} finally {
			this.loading = false;
		}
	}

	async resubmit(formData) {
		this.working = true;
		this.error = null;
		try {
			const result = await resubmitRegistration(formData);
			await this.loadMine();
			return result;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Klarifikasi gagal dikirim.';
			throw error;
		} finally {
			this.working = false;
		}
	}

	async loadQueue() {
		if (!browser) return [];
		this.loading = true;
		this.error = null;
		try {
			this.items = await registrationQueue();
			return this.items;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Antrean registrasi gagal dimuat.';
			return [];
		} finally {
			this.loading = false;
		}
	}

	async decide(id, decision, note = '') {
		this.working = true;
		this.error = null;
		try {
			const result = await decideRegistration(id, decision, note);
			await this.loadQueue();
			return result;
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Keputusan gagal disimpan.';
			throw error;
		} finally {
			this.working = false;
		}
	}

	async files(record) {
		return proofUrls(record);
	}
}

export const registration = new RegistrationStore();
