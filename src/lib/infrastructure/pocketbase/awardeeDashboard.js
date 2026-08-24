import { Broadcast } from '$lib/domain/entities/Broadcast.js';
import { CommunityEvent } from '$lib/domain/entities/CommunityEvent.js';
import { getPocketBase, pocketBaseMessage } from './client.js';
import { listBroadcasts } from './broadcasts.js';
import { myStories } from './stories.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

function broadcastEntity(row) {
	return new Broadcast({
		...row,
		contentIds: [row.id],
		openedBy: row.read ? ['ME'] : [],
		amplifiedBy: row.privateShares ? ['ME'] : []
	});
}

function eventEntity(row) {
	const myId = row.myParticipant?.awardeeId ?? '';
	const registered = Array.from(
		{ length: Math.max(0, row.registeredCount || 0) },
		(_, index) => (index === 0 && myId ? myId : `participant-${row.id}-${index}`)
	);
	const attended = Array.from(
		{ length: Math.max(0, row.attendeeCount || 0) },
		(_, index) =>
			row.myParticipant?.attendanceStatus === 'APPROVED' && index === 0 && myId
				? myId
				: `attendee-${row.id}-${index}`
	);
	return CommunityEvent.from({
		...row,
		submittedAt: row.submittedAt || null,
		reviewedAt: row.reviewedAt || null,
		publishedAt: row.publishedAt || null,
		proposedByRole: 'AWARDEE',
		registeredAwardeeIds: registered,
		attendeeAwardeeIds: attended,
		evidenceRefs: []
	});
}

export async function fetchAwardeeDashboard() {
	try {
		const pb = client();
		const [broadcasts, eventResponse, stories] = await Promise.all([
			listBroadcasts(),
			pb.send('/api/pfriends/events'),
			myStories()
		]);
		return {
			broadcasts: broadcasts.map(broadcastEntity),
			events: (eventResponse.items || []).map(eventEntity),
			stories
		};
	} catch (error) {
		throw new Error(pocketBaseMessage(error, 'Ringkasan beranda Awardee gagal dimuat.'));
	}
}
