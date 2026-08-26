import { Story } from '$lib/domain/entities/Story.js';
import { getPocketBase, pocketBaseMessage } from './client.js';
import { apiRequest } from '$lib/infrastructure/sveltekit-api/client.js';

function client() { const pb = getPocketBase(); if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.'); return pb; }
function entity(value) { return Story.from(value); }
async function send(path, options = {}) { try { client(); return await apiRequest(path, options); } catch (error) { throw new Error(pocketBaseMessage(error, 'PocketBase tidak dapat memproses Cerita.')); } }

export async function myStories() { const response = await send('/api/pfriends/stories/mine'); return (response.items || []).map(entity); }
export async function verifierStories(scope = 'queue') { const response = await send(`/api/pfriends/verifier/stories?scope=${encodeURIComponent(scope)}`); return (response.items || []).map(entity); }
export async function verifierStoryDetail(id) { const response = await send(`/api/pfriends/verifier/stories/${id}`); return { ...response, story: entity(response.story) }; }

function draftForm(values) {
	const data = new FormData();
	for (const key of ['title','summary','body','location','activityDate','participantCount']) data.set(key, values[key] ?? '');
	data.set('esgTags', JSON.stringify(values.esgTags || [])); data.set('outcome', JSON.stringify(values.outcome || null));
	if (values.removeEvidence) data.set('removeEvidence', 'true'); if (values.removeCover) data.set('removeCover', 'true');
	for (const file of values.evidenceFiles || []) data.append('evidenceFiles', file);
	if (values.coverCandidate instanceof File) data.set('coverCandidate', values.coverCandidate);
	return data;
}

export async function createStoryDraft(values) { return entity(await send('/api/pfriends/stories/drafts', { method: 'POST', body: draftForm(values) })); }
export async function updateStoryDraft(id, values) { return entity(await send(`/api/pfriends/stories/${id}/draft`, { method: 'PATCH', body: draftForm(values) })); }
export async function submitStoryRecord(id) { return entity(await send(`/api/pfriends/stories/${id}/submit`, { method: 'POST' })); }
export async function startStoryReview(id) { return entity(await send(`/api/pfriends/verifier/stories/${id}/start-review`, { method: 'POST' })); }
export async function decideStory(id, decision, note = '', sensitivityChecks = []) { return entity(await send(`/api/pfriends/verifier/stories/${id}/decision`, { method: 'POST', body: { decision, note, sensitivityChecks } })); }
export async function publishStoryRecord(id) { return entity(await send(`/api/pfriends/verifier/stories/${id}/publish`, { method: 'POST' })); }
export async function archiveStoryRecord(id, reason) { return entity(await send(`/api/pfriends/verifier/stories/${id}/archive`, { method: 'POST', body: { reason } })); }
export async function revokeStoryConsent() { return send('/api/pfriends/stories/consent/revoke', { method: 'POST' }); }

export async function storyFileToken() { try { return await client().files.getToken(); } catch (error) { throw new Error(pocketBaseMessage(error, 'Token berkas Cerita gagal dibuat.')); } }
export function storyFileUrl(story, filename, token = '') { const pb = getPocketBase(); if (!pb || !filename) return ''; return pb.files.getURL({ id: story.id, collectionName: 'stories' }, filename, { token }); }
