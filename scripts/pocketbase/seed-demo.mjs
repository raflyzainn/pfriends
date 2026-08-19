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
const { accounts, awardees, activities, rewards, redemptions } = buildSeed();
let created = 0;
const usersByAwardeeId = new Map();
const recordsByAwardeeId = new Map();
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
	const record = existing
		? await pb.collection('awardees').update(existing.id, data)
		: await pb.collection('awardees').create(data);
	if (!existing) profilesCreated++;
	recordsByAwardeeId.set(awardee.id, record);
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

async function findOne(collection, filter, params) {
	try { return await pb.collection(collection).getFirstListItem(pb.filter(filter, params)); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}

async function upsert(collection, filter, params, data) {
	const existing = await findOne(collection, filter, params);
	return existing ? pb.collection(collection).update(existing.id, data) : pb.collection(collection).create(data);
}

const rewardRecords = new Map();
for (const reward of rewards) {
	const record = await upsert('rewards', 'legacyId = {:id}', { id: reward.id }, {
		legacyId: reward.id, name: reward.name, category: reward.category, description: reward.description || '',
		priceCoins: reward.priceCoins, minTierLevel: reward.minTierLevel, status: reward.status,
		monthlyQuota: reward.monthlyQuota, requiresApproval: reward.requiresApproval,
		community: reward.community || '', fulfillmentNote: reward.fulfillmentNote || ''
	});
	rewardRecords.set(reward.id, record);
}

for (const redemption of redemptions) {
	const awardee = recordsByAwardeeId.get(redemption.awardeeId);
	const reward = rewardRecords.get(redemption.rewardId);
	if (!awardee || !reward) continue;
	await upsert('redemptions', 'legacyId = {:id}', { id: redemption.id }, {
		legacyId: redemption.id, requestKey: `SEED:${redemption.id}`, awardee: awardee.id,
		user: awardee.user, reward: reward.id, awardeeName: awardee.fullName,
		awardeeWhatsapp: awardee.whatsapp || '', rewardName: redemption.rewardName,
		coins: redemption.coins, status: redemption.status, quotaMonth: redemption.requestedAt.slice(0, 7),
		note: redemption.note || '', requestedAt: redemption.requestedAt,
		fulfilledAt: redemption.fulfilledAt || ''
	});
}

const badgeBonus = { UMUM: 25, LANGKA: 75, EPIK: 200, LEGENDARIS: 500 };
for (const awardeeData of awardees) {
	const awardee = recordsByAwardeeId.get(awardeeData.id);
	if (!awardee) continue;
	const pointRows = await pb.collection('verified_point_activities').getFullList({ filter: pb.filter('awardeeId = {:id}', { id: awardeeData.id }) });
	for (const row of pointRows) {
		if (!row.points) continue;
		await upsert('coin_transactions', 'sourceKey = {:key}', { key: `POINT:${row.id}` }, {
		awardee: awardee.id, user: awardee.user, sourceKey: `POINT:${row.id}`, type: 'POINT_CREDIT',
		amount: row.points, referenceId: row.id, note: 'Koin dari poin terverifikasi.', occurredAt: row.awardedAt || row.occurredAt
	});
	}
	const badgeRows = await pb.collection('awardee_badges').getFullList({ filter: pb.filter('awardee = {:id} && status = "ACTIVE"', { id: awardee.id }), expand: 'badge' });
	for (const row of badgeRows) {
		const badge = row.expand?.badge;
		await upsert('coin_transactions', 'sourceKey = {:key}', { key: `BADGE:${row.id}` }, {
			awardee: awardee.id, user: awardee.user, sourceKey: `BADGE:${row.id}`, type: 'BADGE_BONUS',
			amount: badgeBonus[badge?.rarity] || 0, referenceId: row.id,
			note: `Bonus lencana ${badge?.name || row.badgeCode}.`, occurredAt: row.awardedAt
		});
	}
	const orderRows = await pb.collection('redemptions').getFullList({ filter: pb.filter('awardee = {:id}', { id: awardee.id }) });
	for (const row of orderRows) await upsert('coin_transactions', 'sourceKey = {:key}', { key: `REDEMPTION:${row.id}` }, {
		awardee: awardee.id, user: awardee.user, sourceKey: `REDEMPTION:${row.id}`, type: 'REDEMPTION_DEBIT',
		amount: -row.coins, referenceId: row.id, note: `Penukaran ${row.rewardName}.`, occurredAt: row.requestedAt
	});
	let transactions = await pb.collection('coin_transactions').getFullList({ filter: pb.filter('awardee = {:id}', { id: awardee.id }) });
	const nonAdjustmentBalance = transactions.filter((row) => row.sourceKey !== `MIGRATION:${awardee.id}`).reduce((sum, row) => sum + row.amount, 0);
	const adjustment = awardeeData.coins - nonAdjustmentBalance;
	const adjustmentKey = `MIGRATION:${awardee.id}`;
	const existingAdjustment = await findOne('coin_transactions', 'sourceKey = {:key}', { key: adjustmentKey });
	if (adjustment === 0) {
		if (existingAdjustment) await pb.collection('coin_transactions').delete(existingAdjustment.id);
	} else await upsert('coin_transactions', 'sourceKey = {:key}', { key: adjustmentKey }, {
		awardee: awardee.id, user: awardee.user, sourceKey: adjustmentKey, type: 'MIGRATION_ADJUSTMENT',
		amount: adjustment, referenceId: awardeeData.id, note: 'Penyesuaian saldo data demo lama.', occurredAt: awardeeData.joinedAt
	});
	transactions = await pb.collection('coin_transactions').getFullList({ filter: pb.filter('awardee = {:id}', { id: awardee.id }) });
	const balance = transactions.reduce((sum, row) => sum + row.amount, 0);
	const lifetimeEarned = transactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
	const lifetimeSpent = -transactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0);
	await upsert('coin_accounts', 'awardee = {:id}', { id: awardee.id }, { awardee: awardee.id, user: awardee.user, balance, lifetimeEarned, lifetimeSpent, recalculatedAt: new Date().toISOString() });
}

console.log(`Seed PocketBase selesai: akun ${created} dibuat/${accounts.length - created} diperbarui; profil ${profilesCreated} dibuat/${awardees.length - profilesCreated} diperbarui; ledger ${ledgerCreated} dibuat/${awardedActivities.length - ledgerCreated} diperbarui; reward ${rewards.length}; penukaran ${redemptions.length}.`);
