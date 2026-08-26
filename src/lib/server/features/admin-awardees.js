import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recordId } from '../registration.js';

const ACCOUNT_STATUSES = ['AKTIF', 'TERKUNCI', 'NONAKTIF'], MEMBERSHIP_STATUSES = ['AKTIF', 'NONAKTIF'];
function text(value) { return String(value ?? '').trim(); }
async function adminContext(ctx) { const principal = await ctx.principal({ roles: ['ADMIN'] }); return { principal, pb: await ctx.admin() }; }
function userDto(user) { return { id: user.id, collectionId: user.collectionId, collectionName: user.collectionName, email: user.email, legacyAccountId: user.legacyAccountId, awardeeId: user.awardeeId, role: user.role, displayName: user.displayName, unit: user.unit || '', status: user.status, onboardingStatus: user.onboardingStatus || '' }; }
function awardeeDto(awardee, user, profile) { return { id: awardee.id, legacyId: awardee.legacyId, userId: user.id, name: awardee.fullName, email: awardee.email, community: awardee.community, chapterId: awardee.chapterId, city: awardee.city || '', programPillar: awardee.programPillar, accountStatus: user.status, membershipStatus: awardee.status, lastLoginAt: user.lastLoginAt || null, joinedAt: awardee.joinedAt || null, totalPoints: Number(profile?.totalPoints || 0), tierLevel: profile?.tier || '' }; }
function actionDto(row) { return { id: row.id, actorName: row.actorName, action: row.action, fromStatus: row.fromStatus || null, toStatus: row.toStatus || null, reason: row.reason || null, occurredAt: row.occurredAt, expiresAt: row.expiresAt || null, endedAt: row.endedAt || null }; }
function actionValues(principal, awardee, action, data = {}) { return { id: recordId(), actor: principal.record.id, actorName: principal.record.displayName, awardee: awardee.id, targetUser: awardee.user, action, fromStatus: data.fromStatus || '', toStatus: data.toStatus || '', reason: data.reason || '', sessionKey: data.sessionKey || '', occurredAt: data.occurredAt || new Date().toISOString(), expiresAt: data.expiresAt || '' }; }
async function maps(pb) { const [users, profiles] = await Promise.all([pb.collection('users').getFullList(), pb.collection('gamification_profiles').getFullList()]); return { users: new Map(users.map((row) => [row.id, row])), profiles: new Map(profiles.map((row) => [row.awardee, row])) }; }

apiRoute('GET', '/admin/awardees', async (ctx) => {
	const { pb } = await adminContext(ctx), page = Math.max(1, Number(ctx.url.searchParams.get('page') || 1)), perPage = Math.min(50, Math.max(1, Number(ctx.url.searchParams.get('perPage') || 20))), keyword = text(ctx.url.searchParams.get('q')).toLowerCase(), accountStatus = text(ctx.url.searchParams.get('accountStatus')), membershipStatus = text(ctx.url.searchParams.get('membershipStatus')), community = text(ctx.url.searchParams.get('community')), chapter = text(ctx.url.searchParams.get('chapter'));
	const [awardees, linked] = await Promise.all([pb.collection('awardees').getFullList({ sort: 'fullName' }), maps(pb)]), mapped = awardees.map((row) => awardeeDto(row, linked.users.get(row.user), linked.profiles.get(row.id)));
	const filtered = mapped.filter((row) => { if (accountStatus && row.accountStatus !== accountStatus) return false; if (membershipStatus && row.membershipStatus !== membershipStatus) return false; if (community && row.community !== community) return false; if (chapter && row.chapterId !== chapter) return false; return !keyword || `${row.name} ${row.email} ${row.legacyId} ${row.city} ${row.community} ${row.chapterId}`.toLowerCase().includes(keyword); });
	const offset = (page - 1) * perPage; return { items: filtered.slice(offset, offset + perPage), page, perPage, totalItems: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / perPage)), stats: { total: mapped.length, activeAccounts: mapped.filter((row) => row.accountStatus === 'AKTIF').length, inactiveMemberships: mapped.filter((row) => row.membershipStatus === 'NONAKTIF').length, everLoggedIn: mapped.filter((row) => row.lastLoginAt).length } };
});
apiRoute('GET', '/admin/awardees/{id}/history', async (ctx) => {
	const { pb } = await adminContext(ctx), awardee = await pb.collection('awardees').getOne(ctx.params.id), user = await pb.collection('users').getOne(awardee.user), profile = await pb.collection('gamification_profiles').getFirstListItem(pb.filter('awardee = {:id}', { id: awardee.id })).catch(() => null), rows = await pb.collection('admin_awardee_actions').getList(1, 100, { filter: pb.filter('awardee = {:awardee}', { awardee: awardee.id }), sort: '-occurredAt' });
	return { awardee: awardeeDto(awardee, user, profile), items: rows.items.map(actionDto) };
});
async function statusMutation(ctx, kind) {
	const { principal, pb } = await adminContext(ctx), body = await ctx.body(), status = text(body.status), reason = text(body.reason), allowed = kind === 'account' ? ACCOUNT_STATUSES : MEMBERSHIP_STATUSES;
	if (!allowed.includes(status)) throw new ApiError(400, kind === 'account' ? 'Status akun tidak dikenal.' : 'Status keanggotaan tidak dikenal.');
	if (reason.length < 10) throw new ApiError(400, 'Alasan perubahan minimal 10 karakter.');
	const awardee = await pb.collection('awardees').getOne(ctx.params.id), user = await pb.collection('users').getOne(awardee.user), before = kind === 'account' ? user.status : awardee.status;
	if (before === status) throw new ApiError(400, kind === 'account' ? 'Status akun sudah sesuai pilihan.' : 'Status keanggotaan sudah sesuai pilihan.');
	await sendBatch(pb, async (batch) => {
		if (kind === 'account') batch.collection('users').update(user.id, { status, ...(status === 'AKTIF' ? {} : { tokenKey: crypto.randomUUID().replaceAll('-', '') }) });
		else batch.collection('awardees').update(awardee.id, { status });
		batch.collection('admin_awardee_actions').create(actionValues(principal, awardee, kind === 'account' ? 'ACCOUNT_STATUS_CHANGED' : 'MEMBERSHIP_STATUS_CHANGED', { fromStatus: before, toStatus: status, reason }));
	});
	return awardeeDto(kind === 'account' ? awardee : { ...awardee, status }, kind === 'account' ? { ...user, status } : user, await pb.collection('gamification_profiles').getFirstListItem(pb.filter('awardee = {:id}', { id: awardee.id })).catch(() => null));
}
apiRoute('POST', '/admin/awardees/{id}/account-status', (ctx) => statusMutation(ctx, 'account'));
apiRoute('POST', '/admin/awardees/{id}/membership-status', (ctx) => statusMutation(ctx, 'membership'));
apiRoute('POST', '/admin/awardees/{id}/impersonate', async (ctx) => {
	const { principal, pb } = await adminContext(ctx), awardee = await pb.collection('awardees').getOne(ctx.params.id), user = await pb.collection('users').getOne(awardee.user);
	if (user.role !== 'AWARDEE' || user.status !== 'AKTIF') throw new ApiError(400, 'Hanya akun Awardee aktif yang dapat dibuka.');
	const now = new Date(), expires = new Date(now.getTime() + 30 * 60 * 1000), action = actionValues(principal, awardee, 'IMPERSONATION_STARTED', { sessionKey: crypto.randomUUID().replaceAll('-', ''), occurredAt: now.toISOString(), expiresAt: expires.toISOString() });
	await pb.collection('admin_awardee_actions').create(action);
	const impersonated = await pb.collection('users').impersonate(user.id, 1800);
	return { token: impersonated.authStore.token, record: userDto(impersonated.authStore.record), impersonation: { id: action.id, awardeeId: awardee.id, awardeeName: awardee.fullName, expiresAt: expires.toISOString() } };
});
apiRoute('POST', '/admin/impersonations/{id}/end', async (ctx) => {
	const principal = await ctx.principal(), pb = await ctx.admin(), row = await pb.collection('admin_awardee_actions').getOne(ctx.params.id);
	if ((row.actor !== principal.record.id && row.targetUser !== principal.record.id) || row.action !== 'IMPERSONATION_STARTED') throw new ApiError(403, 'Sesi impersonasi tidak ditemukan.');
	const endedAt = row.endedAt || new Date().toISOString(); if (!row.endedAt) await pb.collection('admin_awardee_actions').update(row.id, { endedAt }); return { endedAt };
});
