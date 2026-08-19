import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { loadLocalEnv } from './local-env.mjs';

await loadLocalEnv();

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const email = process.env.PB_SUPERUSER_EMAIL;
const password = process.env.PB_SUPERUSER_PASSWORD;
if (!email || !password) throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');
const pb = new PocketBase(url);
await pb.collection('_superusers').authWithPassword(email, password);
const { accounts, awardees, activities } = buildSeed();
let created = 0;
const usersByAwardeeId = new Map();
for (const account of accounts) {
	let existing = null;
	try { existing = await pb.collection('users').getFirstListItem(pb.filter('legacyAccountId = {:id}', { id: account.id })); } catch (error) { if (error?.status !== 404) throw error; }
	const data = { email: account.email, emailVisibility: false, password: SANDI_DEMO, passwordConfirm: SANDI_DEMO, legacyAccountId: account.id, awardeeId: account.awardeeId || '', role: account.role, displayName: account.displayName, unit: account.unit || '', status: account.status, onboardingStatus: 'APPROVED' };
	const user = existing
		? await pb.collection('users').update(existing.id, data)
		: await pb.collection('users').create(data);
	if (!existing) created++;
	if (account.role === 'AWARDEE' && account.awardeeId) usersByAwardeeId.set(account.awardeeId, user.id);
}
let profilesCreated = 0;
for (const awardee of awardees) {
	const userId = usersByAwardeeId.get(awardee.id);
	if (!userId) continue;
	let existing = null;
	try { existing = await pb.collection('awardees').getFirstListItem(pb.filter('legacyId = {:id}', { id: awardee.id })); } catch (error) { if (error?.status !== 404) throw error; }
	const business = awardee.businessProfile;
	const data = {
		user: userId, legacyId: awardee.id, fullName: awardee.fullName, email: awardee.email,
		whatsapp: awardee.whatsapp || '', community: awardee.community,
		programPillar: awardee.community === 'SOBI' ? 'PFlestari' : 'PFmuda', chapterId: awardee.chapterId,
		city: awardee.city || '', university: awardee.university || '', graduationYear: awardee.graduationYear || null,
		businessName: business?.businessName || '', businessSector: business?.sector || '', businessCity: business?.city || '',
		status: awardee.status === 'AKTIF' ? 'AKTIF' : 'NONAKTIF', joinedAt: awardee.joinedAt,
		occupation: awardee.occupation || '', bio: awardee.bio || '', skills: awardee.skills || [],
		openToMentoring: Boolean(awardee.openToMentoring), businessEmployees: business?.employees || 0,
		businessGrowthPercent: business?.growthPercent || 0
	};
	if (existing) await pb.collection('awardees').update(existing.id, data);
	else { await pb.collection('awardees').create(data); profilesCreated++; }
}
let ledgerCreated = 0;
const awardedActivities = activities.filter((activity) => activity.status === 'AWARDED');
for (const activity of awardedActivities) {
	const userId = usersByAwardeeId.get(activity.awardeeId);
	if (!userId) continue;
	let existing = null;
	try { existing = await pb.collection('verified_point_activities').getFirstListItem(pb.filter('legacyActivityId = {:id}', { id: activity.id })); } catch (error) { if (error?.status !== 404) throw error; }
	const data = {
		user: userId, source: 'DEMO_SEED', legacyActivityId: activity.id,
		awardeeId: activity.awardeeId, activityType: activity.activityType, points: activity.points,
		capReason: activity.capReason || '', occurredAt: activity.occurredAt,
		awardedAt: activity.occurredAt, status: 'AWARDED'
	};
	if (existing) await pb.collection('verified_point_activities').update(existing.id, data);
	else { await pb.collection('verified_point_activities').create(data); ledgerCreated++; }
}
console.log(`Seed PocketBase selesai: akun ${created} dibuat/${accounts.length - created} diperbarui; profil ${profilesCreated} dibuat/${awardees.length - profilesCreated} diperbarui; ledger ${ledgerCreated} dibuat/${awardedActivities.length - ledgerCreated} diperbarui.`);
