import { Awardee } from '$lib/domain/entities/Awardee.js';
import { getPocketBase, pocketBaseMessage } from './client.js';

function client() {
	const pb = getPocketBase();
	if (!pb?.authStore.isValid) throw new Error('Sesi PocketBase tidak tersedia.');
	return pb;
}

function mapAwardee(record, pb, token) {
	const businessProfile = record.businessProfile ? {
		...record.businessProfile,
		products: (record.businessProfile.products || []).map((product) => ({
			...product,
			imageUrl: product.image ? pb.files.getURL({ id: product.id, collectionName: product.collectionName || 'business_products' }, product.image, { token }) : ''
		}))
	} : null;
	return new Awardee({
		id: record.id, fullName: record.fullName,
		email: `${record.id}@directory.invalid`, community: record.community, chapterId: record.chapterId,
		status: 'AKTIF', points: record.points || 0, coins: 0, seasonPoints: 0,
		streakWeeks: record.streakWeeks || 0, university: record.university || '', city: record.city || '',
		graduationYear: record.graduationYear || null, occupation: record.occupation || '', bio: record.bio || '',
		skills: record.skills || [], badgeCodes: record.badgeCodes || [],
		openToMentoring: Boolean(record.openToMentoring), consentActive: true,
		businessProfile, joinedAt: record.joinedAt
	});
}

export async function fetchDirectory(query = {}) {
	try {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(query)) if (value !== '' && value !== undefined && value !== false) params.set(key, String(value));
		const pb = client();
		const [response, token] = await Promise.all([pb.send(`/api/pfriends/directory?${params}`), pb.files.getToken()]);
		return { ...response, items: (response.items || []).map((record) => mapAwardee(record, pb, token)) };
	} catch (error) { throw new Error(pocketBaseMessage(error, 'Jejaring gagal dimuat.')); }
}

export async function updateMyDirectoryProfile(data) {
	try { return await client().send('/api/pfriends/profile/me', { method: 'PATCH', body: data }); }
	catch (error) { throw new Error(pocketBaseMessage(error, 'Profil Jejaring gagal disimpan.')); }
}
