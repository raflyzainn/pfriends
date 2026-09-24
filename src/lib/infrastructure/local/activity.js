import { SCORING_TABLE } from '../../domain/constants/scoring-table.js';
import { TIER_TABLE } from '../../domain/constants/tier-table.js';

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const sum = (rows, field = 'points') => rows.reduce((n, row) => n + Number(row[field] || 0), 0);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const find = (rows, key) => rows.find((row) => row.id === key) || fail('Data tidak ditemukan.', 404);
const requireRole = (user, roles) => { if (!user || !roles.includes(user.role)) fail('Akses tidak diizinkan.', 403); };
const tierFor = (points, tiers) => tiers.filter((tier) => points >= tier.threshold).at(-1)?.level || 'NEWCOMER';
const mine = (row, awardee) => row.awardeeId === awardee.id || row.awardeeId === awardee.legacyId;
function workDays(value, end = new Date()) {
	const start = new Date(value); if (Number.isNaN(start.getTime()) || start > end) return 0;
	let days = 0; for (const cursor = new Date(start); cursor < end && days < 3650; cursor.setDate(cursor.getDate() + 1)) if (![0, 6].includes(cursor.getDay())) days++;
	return days;
}
function sla(state) {
	return [['STORY_DIAJUKAN', 'DIAJUKAN', 2], ['STORY_REVIEW', 'REVIEW', 3], ['STORY_DISETUJUI', 'DISETUJUI', 5], ['EVENT_DIUSULKAN', 'DIUSULKAN', 2]].map(([queue, status, limit]) => {
		const ages = (queue.startsWith('EVENT') ? state.events : state.stories).filter((s) => s.status === status).map((s) => workDays(s.reviewedAt || s.submittedAt)).sort((a, b) => a - b);
		return { queue, withinSla: ages.filter((n) => n <= limit).length, breachedSla: ages.filter((n) => n > limit).length, medianDays: ages.length ? ages[Math.floor(ages.length / 2)] : 0 };
	});
}

function initialize(state) {
	state.pointActions ||= SCORING_TABLE.map((row) => ({ ...row, id: row.type, code: row.type, description: row.label, workflow: row.needsEvidence ? 'EVIDENCE' : 'DIRECT', isCore: true, status: 'ACTIVE' }));
	state.tiers ||= TIER_TABLE.map((row) => ({ ...row, id: row.level, canonicalThreshold: row.threshold, description: row.deskripsi, updatedAt: '' }));
	for (const key of ['submissionReviews', 'submissionEvents', 'actionAudits', 'tierAudits']) state[key] ||= [];
	if (!state.submissions) {
		state.submissions = state.activities.filter((row) => ['PENDING', 'REJECTED'].includes(row.status)).slice(0, 18).map((row, index) => {
			const awardee = state.awardees.find((a) => mine(row, a));
			const account = state.accounts.find((a) => a.awardeeId === awardee?.id);
			return { id: `submission-${row.id}`, owner: account?.id || awardee?.id, awardeeId: awardee?.id, awardeeName: awardee?.fullName, pointAction: row.activityType, actionCode: row.activityType, activityType: row.activityType, title: `Bukti ${state.pointActions.find((a) => a.code === row.activityType)?.label || 'keaktifan'}`, description: 'Dokumentasi kegiatan komunitas untuk diperiksa oleh verifikator lokal.', activityDate: row.occurredAt, submittedAt: row.occurredAt, status: index % 3 ? 'SUBMITTED' : 'NEEDS_REVISION', revisionCount: index % 3 ? 0 : 1, reviewNote: index % 3 ? '' : 'Mohon lengkapi dokumentasi kegiatan.', evidenceFiles: ['/img/sobi-mentoring.jpg'], awardedPoints: 0 };
		});
	}
}

function profile(state, awardee) {
	const entries = state.activities.filter((row) => mine(row, awardee) && row.status === 'AWARDED');
	const totalPoints = sum(entries), days = [...new Set(entries.map((row) => String(row.occurredAt).slice(0, 10)))].sort();
	const today = now().slice(0, 10), yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	let streak = 0, cursor = days.at(-1);
	if (cursor === today || cursor === yesterday) while (days.includes(cursor)) { streak++; cursor = new Date(new Date(cursor).getTime() - 86400000).toISOString().slice(0, 10); }
	return { ...awardee, awardeeId: awardee.id, totalPoints, tier: tierFor(totalPoints, state.tiers), currentStreakWeeks: Math.floor(streak / 7), currentStreakDays: streak, activeToday: days.includes(today), lastActiveAt: entries.map((row) => row.occurredAt).sort().at(-1) || '' };
}

function wallet(state, awardee) {
	const bonuses = { UMUM: 25, LANGKA: 75, EPIK: 200, LEGENDARIS: 500 };
	const earned = sum(state.activities.filter((row) => mine(row, awardee) && row.status === 'AWARDED')) + state.badges.filter((badge) => (awardee.badgeCodes || []).includes(badge.code)).reduce((n, badge) => n + (bonuses[badge.rarity] || 0), 0);
	const spent = sum(state.redemptions.filter((row) => mine(row, awardee) && row.status !== 'DITOLAK'), 'coins');
	return { balance: earned - spent, lifetimeEarned: earned, lifetimeSpent: spent };
}

function rewards(state) {
	const month = now().slice(0, 7);
	return state.rewards.map((row) => {
		const used = state.redemptions.filter((r) => r.rewardId === row.id && String(r.requestedAt).startsWith(month) && r.status !== 'DITOLAK').length;
		return { ...row, remaining: row.monthlyQuota == null ? null : Math.max(0, row.monthlyQuota - used) };
	});
}

export function refreshLocalBalances(state) {
	const totals = new Map(), spent = new Map(), month = now().slice(0, 7), seasonal = new Map();
	for (const row of state.activities) if (row.status === 'AWARDED') { totals.set(row.awardeeId, (totals.get(row.awardeeId) || 0) + Number(row.points || 0)); if (String(row.occurredAt).startsWith(month)) seasonal.set(row.awardeeId, (seasonal.get(row.awardeeId) || 0) + Number(row.points || 0)); }
	for (const row of state.redemptions) if (row.status !== 'DITOLAK') spent.set(row.awardeeId, (spent.get(row.awardeeId) || 0) + Number(row.coins || 0));
	const bonuses = { UMUM: 25, LANGKA: 75, EPIK: 200, LEGENDARIS: 500 };
	for (const awardee of state.awardees) { awardee.points = totals.get(awardee.id) || 0; awardee.seasonPoints = seasonal.get(awardee.id) || 0; awardee.coins = awardee.points + state.badges.filter((badge) => (awardee.badgeCodes || []).includes(badge.code)).reduce((n, badge) => n + (bonuses[badge.rarity] || 0), 0) - (spent.get(awardee.id) || 0); }
}

function attendance(state, submission) {
	const participant = (state.eventParticipants || []).find((p) => p.id === submission.eventParticipant || (p.event === submission.event && p.owner === submission.owner));
	if (participant) { participant.attendanceStatus = submission.status; if (submission.status === 'APPROVED') participant.attendedAt = now(); }
}

function decorate(state, row) {
	return { ...row, expand: { owner: { displayName: row.awardeeName }, reviewer: { displayName: state.accounts.find((a) => a.id === row.reviewer)?.displayName || 'Verifikator lokal' } } };
}

function rules(state, thresholds = Object.fromEntries(state.tiers.map((t) => [t.level, t.threshold]))) {
	const before = Object.fromEntries(state.tiers.map((t) => [t.level, 0])), after = { ...before }, transitions = {};
	const proposed = state.tiers.map((t) => ({ ...t, threshold: thresholds[t.level] }));
	for (const a of state.awardees) { const points = profile(state, a).totalPoints, from = tierFor(points, state.tiers), to = tierFor(points, proposed); before[from]++; after[to]++; if (from !== to) transitions[`${from}->${to}`] = (transitions[`${from}->${to}`] || 0) + 1; }
	const mix = { BROADCAST_VIEW: 4, CTA_REACT: 3, SHARE_PRIVATE: 3, SHARE_PUBLIC: 2, STORY_SUBMIT: 1, SESSION_ATTEND: 1 };
	const rows = state.pointActions.filter((a) => mix[a.code]).map((a) => ({ code: a.code, label: a.label, occurrences: mix[a.code], points: a.points, subtotal: mix[a.code] * a.points })), total = sum(rows, 'subtotal');
	return { tiers: state.tiers, thresholds, version: state.tiers.map((t) => t.updatedAt).sort().at(-1) || '', impact: { totalProfiles: state.awardees.length, moved: Object.values(transitions).reduce((a, b) => a + b, 0), before, after, transitions }, sample: { rows, total, tier: tierFor(total, proposed) }, audits: state.tierAudits };
}

function dashboard(state) {
	const active = state.awardees.filter((a) => a.status === 'AKTIF');
	const entries = state.activities.filter((a) => a.status === 'AWARDED');
	const monthly = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'].map((label, i) => {
		const monthKey = `2026-${String(i + 1).padStart(2, '0')}`, rows = entries.filter((a) => String(a.occurredAt).startsWith(monthKey)), sent = state.broadcasts.filter((a) => a.status === 'TERKIRIM' && String(a.sentAt).startsWith(monthKey));
		const amplifiers = new Set(rows.filter((a) => ['SHARE_PUBLIC', 'SHARE_PRIVATE'].includes(a.activityType)).map((a) => a.awardeeId)).size;
		return { monthKey, label, publishedStories: state.stories.filter((s) => s.status === 'TERPUBLIKASI' && String(s.publishedAt).startsWith(monthKey)).length, disseminatedContents: sent.length, disseminationDays: new Set(sent.map((a) => String(a.sentAt).slice(0, 10))).size, amplifiers, amplificationRate: active.length ? Math.round(amplifiers / active.length * 100) : 0, points: sum(rows), registered: state.awardees.filter((a) => String(a.joinedAt).slice(0, 7) <= monthKey).length, active: new Set(rows.map((a) => a.awardeeId)).size, engagedAmplifiers: amplifiers };
	});
	const july = monthly.at(-1), consent = active.filter((a) => a.consentActive).length, completed = state.events.filter((e) => e.status === 'SELESAI' && e.attendeeAwardeeIds?.length >= 10).length;
	return { capturedAt: now(), period: { startsAt: '2026-01-01', endsAt: '2026-07-31', referenceMonth: '2026-07' }, summary: { stories: { total: state.stories.length, published: state.stories.filter((s) => s.status === 'TERPUBLIKASI').length, pending: state.stories.filter((s) => ['DIAJUKAN', 'REVIEW', 'DISETUJUI'].includes(s.status)).length }, dissemination: { contents: sum(monthly, 'disseminatedContents'), days: sum(monthly, 'disseminationDays') }, accounts: { total: state.accounts.length, active: state.accounts.filter((a) => a.status === 'AKTIF').length, byRole: Object.fromEntries(['AWARDEE', 'VERIFIER', 'ADMIN'].map((role) => [role, state.accounts.filter((a) => a.role === role).length])) } }, kpiActuals: [ { id: 'M-01', actual: Math.round(consent / (state.awardees.length || 1) * 100), numerator: consent, denominator: state.awardees.length }, { id: 'M-02', actual: july.disseminatedContents, numerator: july.disseminatedContents, denominator: 2 }, { id: 'M-03', actual: july.disseminationDays, numerator: july.disseminationDays, denominator: 2 }, { id: 'M-04', actual: july.amplificationRate, numerator: july.amplifiers, denominator: active.length }, { id: 'M-05', actual: completed, numerator: completed, denominator: 2 } ], monthly, engagement: monthly, sla: sla(state), esg: { pillars: ['E', 'S', 'G'].map((pillar) => { const total = state.stories.filter((s) => s.esgTags?.some((tag) => tag.pillar === pillar)).length; return { pillar, label: { E: 'Environmental', S: 'Social', G: 'Governance' }[pillar], total, ready: total, incomplete: 0, readinessRate: total ? 100 : 0 }; }) }, chapters: [...new Set(state.awardees.map((a) => a.chapterId))].map((id) => ({ id, SOBI: state.awardees.filter((a) => a.chapterId === id && a.community === 'SOBI').length, WOMENPRENEUR: state.awardees.filter((a) => a.chapterId === id && a.community === 'WOMENPRENEUR').length })) };
}

export async function handleActivity(path, method, body, state, user, query = new URLSearchParams()) {
	path = path.replace('/api/pfriends', '');
	if (!/^\/(activity-submissions|point-actions|point-activities|gamification|achievements|redemptions|staff\/(rewards|point-actions)|admin\/(redemptions|gamification|dashboard)|verifier\/dashboard)(\/|$)/.test(path)) return undefined;
	if (!user) fail('Silakan masuk terlebih dahulu.', 401);
	initialize(state); body ||= {};
	const awardee = state.awardees.find((a) => (user.awardeeId && [a.id, a.legacyId].includes(user.awardeeId)) || (a.user && a.user === user.id));
	const own = () => { requireRole(user, ['AWARDEE']); return awardee || fail('Profil anggota tidak ditemukan.'); };
	const staff = () => requireRole(user, ['ADMIN', 'VERIFIER']);
	if (path === '/point-actions') return { actions: state.pointActions.filter((a) => user.role !== 'AWARDEE' || a.status === 'ACTIVE') };
	if (path.startsWith('/staff/point-actions')) {
		staff(); const key = path.split('/')[3], action = key ? find(state.pointActions, key) : null;
		if (path.endsWith('/audit')) return { audits: state.actionAudits.filter((a) => a.action === key) };
		const before = action ? { ...action } : null;
		if (method === 'DELETE') { const archived = action.isCore || state.activities.some((a) => a.pointAction === key || a.activityType === action.code) || state.submissions.some((a) => a.pointAction === key); if (archived) action.status = 'INACTIVE'; else state.pointActions = state.pointActions.filter((a) => a.id !== key); state.actionAudits.unshift({ id: id(), action: key, operation: archived ? 'ARCHIVE' : 'DELETE', before, after: archived ? { ...action } : null, actorName: user.displayName, actorRole: user.role, occurredAt: now() }); return { archived }; }
		const values = { ...action, ...body };
		if (String(values.label || '').trim().length < 3 || String(values.description || '').trim().length < 10 || String(values.pillar || '').trim().length < 3 || !['B', 'C', 'D'].includes(values.actionClass)) fail('Nama, deskripsi, pilar, dan kelas aksi wajib valid.');
		for (const field of ['points', 'dailyCap']) if (!Number.isInteger(Number(values[field])) || Number(values[field]) < 1) fail('Poin dan batas harian harus bilangan bulat positif.');
		const row = action || { id: id(), code: String(values.label).toUpperCase().replace(/[^A-Z0-9]+/g, '_'), workflow: 'EVIDENCE', isCore: false };
		Object.assign(row, { label: values.label, description: values.description, pillar: values.pillar, actionClass: values.actionClass, points: Number(values.points), dailyCap: Number(values.dailyCap), status: values.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE' }); if (!action) state.pointActions.push(row);
		state.actionAudits.unshift({ id: id(), action: row.id, operation: action ? 'UPDATE' : 'CREATE', before, after: { ...row }, actorName: user.displayName, actorRole: user.role, occurredAt: now() }); return row;
	}
	if (path === '/point-activities') return { items: state.activities.filter((a) => user.role !== 'AWARDEE' || (awardee && mine(a, awardee))) };
	if (/^\/point-activities\/[^/]+\/revoke$/.test(path)) { requireRole(user, ['ADMIN']); const row = find(state.activities, path.split('/')[2]); if (String(body.reason || '').trim().length < 5 || row.status !== 'AWARDED') fail('Alasan minimal lima karakter dan poin harus masih aktif.'); Object.assign(row, { status: 'REVOKED', revokedAt: now(), revokeReason: body.reason, revokedBy: user.id }); return { status: 'REVOKED' }; }
	if (path === '/gamification/me') { const a = own(), entries = state.activities.filter((r) => mine(r, a)), periodKey = now().slice(0, 10); return { profile: profile(state, a), wallet: wallet(state, a), tiers: state.tiers, actions: state.pointActions.filter((r) => r.status === 'ACTIVE'), ledger: entries.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), badges: state.badges.filter((b) => !b.community || b.community === a.community).map((b) => ({ ...b, unlocked: (a.badgeCodes || []).includes(b.code) })), dailyUsage: state.pointActions.map((action) => { const used = entries.filter((r) => (r.actionCode || r.activityType) === action.code && String(r.occurredAt).startsWith(periodKey) && r.status !== 'REJECTED').length; return { type: action.code, used, cap: action.dailyCap, remaining: Math.max(0, action.dailyCap - used), exhausted: used >= action.dailyCap, periodKey }; }) }; }
	if (path === '/gamification/leaderboard') { const scope = query.get('scope'), key = query.get('key'), month = now().slice(0, 7); return { entries: state.awardees.filter((a) => a.status === 'AKTIF' && (scope !== 'community' || a.community === key) && (scope !== 'chapter' || a.chapterId === key)).map((a) => { const p = profile(state, a); return { awardeeId: a.id, name: a.anonymousOnLeaderboard ? 'Peserta anonim' : a.fullName, community: a.community, chapterId: a.chapterId, points: query.get('period') === 'month' ? sum(state.activities.filter((r) => mine(r, a) && r.status === 'AWARDED' && String(r.occurredAt).startsWith(month))) : p.totalPoints, tier: p.tier, streakDays: p.currentStreakDays, streakWeeks: p.currentStreakWeeks, activeToday: p.activeToday }; }).filter((r) => r.points > 0).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, Math.min(100, Number(query.get('limit') || 20))).map((a, i) => ({ ...a, rank: i + 1 })) }; }
	if (path.startsWith('/admin/gamification')) {
		requireRole(user, ['ADMIN']); if (path.endsWith('/audit')) return { audits: state.tierAudits };
		if (method === 'GET') return rules(state);
		const thresholds = body.thresholds || {}; for (let i = 0; i < state.tiers.length; i++) { const t = state.tiers[i], value = Number(thresholds[t.level]); if (!Number.isInteger(value) || value < 0 || (i === 0 ? value !== 0 : value <= Number(thresholds[state.tiers[i - 1].level]))) fail('Ambang tier harus bilangan bulat, dimulai dari 0 dan berurutan naik.'); thresholds[t.level] = value; }
		const result = rules(state, thresholds); if (path.endsWith('/preview')) return result;
		if (body.expectedVersion !== result.version) fail('Konfigurasi berubah. Muat ulang sebelum menyimpan.');
		state.tierAudits.unshift({ id: id(), actorName: user.displayName, before: Object.fromEntries(state.tiers.map((t) => [t.level, t.threshold])), after: thresholds, impact: result.impact, occurredAt: now() }); for (const t of state.tiers) { t.threshold = thresholds[t.level]; t.updatedAt = now(); } return rules(state);
	}
	if (path === '/achievements') { const a = own(); return { wallet: wallet(state, a), rewards: rewards(state).filter((r) => !r.community || r.community === a.community), redemptions: state.redemptions.filter((r) => mine(r, a)) }; }
	if (path === '/redemptions') {
		const a = own(); if (String(body.requestKey || '').length < 8) fail('Kunci penukaran tidak valid.'); const duplicate = state.redemptions.find((r) => r.requestKey === body.requestKey); if (duplicate) { if (!mine(duplicate, a)) fail('Kunci penukaran sudah digunakan.', 403); return { redemption: duplicate, wallet: wallet(state, a) }; }
		const reward = find(rewards(state), body.rewardId), p = profile(state, a), ranks = state.tiers.map((t) => t.level);
		if (reward.status !== 'TERSEDIA' || (reward.community && reward.community !== a.community) || ranks.indexOf(p.tier) < ranks.indexOf(reward.minTierLevel) || reward.remaining === 0 || wallet(state, a).balance < reward.priceCoins) fail('Hadiah, kuota, jenjang, atau saldo belum memenuhi syarat.');
		const redemption = { id: id(), awardeeId: a.id, awardeeName: a.fullName, awardeeWhatsapp: a.whatsapp, rewardId: reward.id, rewardName: reward.name, coins: reward.priceCoins, status: reward.requiresApproval ? 'DIAJUKAN' : 'DISETUJUI', requestedAt: now(), note: reward.fulfillmentNote || '', adminNote: '', requestKey: body.requestKey }; state.redemptions.unshift(redemption); return { redemption, wallet: wallet(state, a) };
	}
	if (path.startsWith('/staff/rewards')) {
		staff(); const key = path.split('/')[3]; if (method === 'GET') return { rewards: rewards(state) };
		const row = key ? find(state.rewards, key) : { id: id() };
		if (method === 'DELETE') { const archived = state.redemptions.some((r) => r.rewardId === key); if (archived) row.status = 'SEGERA'; else state.rewards = state.rewards.filter((r) => r.id !== key); return { deleted: !archived, archived }; }
		const values = { ...row, ...body }; if (String(values.name || '').trim().length < 3 || !Number.isInteger(Number(values.priceCoins)) || Number(values.priceCoins) < 1 || !state.tiers.some((t) => t.level === values.minTierLevel)) fail('Nama, harga, dan jenjang hadiah wajib valid.'); Object.assign(row, values, { id: row.id, priceCoins: Number(values.priceCoins), monthlyQuota: Number(values.monthlyQuota) || null }); if (!key) state.rewards.push(row); return row;
	}
	if (path.startsWith('/admin/redemptions')) {
		staff(); if (method === 'GET') return { redemptions: state.redemptions.filter((r) => !query.get('status') || r.status === query.get('status')).map((r) => { const a = state.awardees.find((a) => mine(r, a)); return { ...r, awardeeName: r.awardeeName || a?.fullName, awardeeWhatsapp: r.awardeeWhatsapp || a?.whatsapp }; }) };
		requireRole(user, ['VERIFIER']); const r = find(state.redemptions, path.split('/')[3]), allowed = { DIAJUKAN: ['DISETUJUI', 'DITOLAK'], DISETUJUI: ['DIKIRIM'], DIKIRIM: ['SELESAI'] }; if (!allowed[r.status]?.includes(body.status) || (body.status === 'DITOLAK' && String(body.note || '').trim().length < 5)) fail('Perubahan status atau alasan tidak valid.'); Object.assign(r, { status: body.status, adminNote: body.note || '', actedBy: user.id, [{ DISETUJUI: 'decidedAt', DITOLAK: 'rejectedAt', DIKIRIM: 'shippedAt', SELESAI: 'fulfilledAt' }[body.status]]: now() }); return { redemption: r };
	}
	if (path === '/admin/dashboard') { requireRole(user, ['ADMIN']); return dashboard(state); }
	if (path === '/verifier/dashboard') {
		requireRole(user, ['VERIFIER']); const official = dashboard(state), profiles = state.awardees.map((a) => profile(state, a)), reviews = state.submissionReviews.filter((r) => r.reviewer === user.id), tiers = {}, chapter = {}; for (const p of profiles) { tiers[p.tier] = (tiers[p.tier] || 0) + 1; const key = `${p.community} Â· ${p.chapterId}`; chapter[key] = (chapter[key] || 0) + p.totalPoints; }
		return { generatedAt: now(), totalPoints: sum(profiles, 'totalPoints'), registeredAwardees: profiles.length, activeAwardees: profiles.filter((p) => new Date(p.lastActiveAt).getTime() > Date.now() - 90 * 86400000).length, monthly: official.monthly.map((r) => ({ ...r, key: r.monthKey })), kpis: official.kpiActuals, tiers: Object.entries(tiers).map(([label, value]) => ({ label, value })), chapter: Object.entries(chapter).map(([label, value]) => ({ label, value })), activeStreaks: profiles.filter((p) => p.currentStreakDays > 0).length, badgeAwards: state.awardees.reduce((n, a) => n + (a.badgeCodes || []).length, 0), leaderboard: profiles.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 8).map((p, i) => ({ rank: i + 1, id: p.id, name: p.anonymousOnLeaderboard ? 'Peserta anonim' : p.fullName, community: p.community, chapter: p.chapterId, points: p.totalPoints })), reviewPerformance: { decisionsThisWeek: reviews.filter((r) => new Date(r.decidedAt).getTime() > Date.now() - 7 * 86400000).length, averageResponseDays: reviews.length ? Math.round(reviews.reduce((n, r) => n + workDays(state.submissions.find((s) => s.id === r.submission)?.submittedAt, new Date(r.decidedAt)), 0) / reviews.length * 10) / 10 : 0, approvalRate: reviews.length ? Math.round(reviews.filter((r) => r.decision === 'APPROVE').length / reviews.length * 100) : 0, decisionCount: reviews.length }, workRecord: { stories: (state.storyReviews || []).filter((r) => r.reviewer === user.id).length, events: state.events.filter((e) => e.reviewedBy === user.id).length, evidence: reviews.length, registrations: (state.registrationReviews || []).filter((r) => r.reviewer === user.id).length, movements: (state.movementDecisions || []).filter((r) => r.actor === user.id).length, redemptions: state.redemptions.filter((r) => r.actedBy === user.id).length, proposals: state.events.filter((e) => e.proposedBy === user.id).length } };
	}
	if (path.startsWith('/activity-submissions')) {
		requireRole(user, ['AWARDEE', 'VERIFIER']);
		if (path.endsWith('/reviews')) { requireRole(user, ['VERIFIER']); const rows = state.submissionReviews.filter((r) => !query.get('decision') || r.decision === query.get('decision')), page = Math.max(1, Number(query.get('page') || 1)); return { page, perPage: 25, totalPages: Math.max(1, Math.ceil(rows.length / 25)), totalItems: rows.length, items: rows.slice((page - 1) * 25, page * 25).map((r) => ({ ...r, expand: { reviewer: { displayName: r.reviewerName }, submission: decorate(state, find(state.submissions, r.submission)) } })) }; }
		const key = path.split('/')[2], row = key ? find(state.submissions, key) : null;
		if (row && user.role === 'AWARDEE' && row.owner !== user.id && row.awardeeId !== user.awardeeId) fail('Bukti ini milik anggota lain.', 403);
		if (method === 'GET') { if (row) return { submission: decorate(state, row), reviews: state.submissionReviews.filter((r) => r.submission === key), events: state.submissionEvents.filter((r) => r.submission === key) }; return { items: state.submissions.filter((r) => (user.role === 'VERIFIER' && query.get('mine') !== 'true' || r.owner === user.id || r.awardeeId === user.awardeeId) && (!query.get('status') || r.status === query.get('status'))).map((r) => decorate(state, r)) }; }
		const fromStatus = row?.status || '', event = { id: id(), submission: key, actor: user.id, actorName: user.displayName, fromStatus, occurredAt: now() };
		if (path.endsWith('/start-review')) { requireRole(user, ['VERIFIER']); if (row.status !== 'SUBMITTED') fail('Pengajuan tidak menunggu pemeriksaan.'); Object.assign(row, { status: 'IN_REVIEW', reviewer: user.id, reviewStartedAt: now() }); attendance(state, row); state.submissionEvents.push({ ...event, eventType: 'REVIEW_STARTED', toStatus: row.status }); return row; }
		if (path.endsWith('/review')) {
			requireRole(user, ['VERIFIER']); if (row.status !== 'IN_REVIEW' || !['APPROVE', 'REQUEST_REVISION'].includes(body.decision) || (body.decision === 'REQUEST_REVISION' && String(body.note || '').trim().length < 5)) fail('Status, keputusan, atau catatan revisi tidak valid.');
			const approved = body.decision === 'APPROVE', action = state.pointActions.find((a) => a.id === row.pointAction || a.code === row.actionCode); if (approved && (!action || action.status !== 'ACTIVE')) fail('Aksi poin tidak aktif.');
			const capped = approved && state.activities.filter((a) => a.awardeeId === row.awardeeId && (a.actionCode || a.activityType) === action.code && String(a.occurredAt).slice(0, 10) === String(row.activityDate).slice(0, 10) && a.status === 'AWARDED').length >= action.dailyCap;
			Object.assign(row, { status: approved ? 'APPROVED' : 'NEEDS_REVISION', awardedPoints: approved && !capped ? action.points : 0, revisionCount: Number(row.revisionCount || 0) + (approved ? 0 : 1), reviewer: user.id, reviewNote: body.note || '', reviewedAt: now() });
			if (approved) state.activities.push({ id: id(), awardeeId: row.awardeeId, user: row.owner, activityType: action.code, actionCode: action.code, actionLabel: action.label, pointAction: action.id, submission: row.id, points: row.awardedPoints, status: 'AWARDED', occurredAt: row.activityDate, awardedAt: now(), capReason: capped ? 'DAILY_CAP' : null, refId: row.event || row.broadcast || row.id });
			attendance(state, row); state.submissionReviews.unshift({ id: id(), submission: row.id, reviewer: user.id, reviewerName: user.displayName, decision: body.decision, note: body.note || '', decidedAt: now() }); state.submissionEvents.push({ ...event, eventType: approved ? 'APPROVED' : 'REVISION_REQUESTED', toStatus: row.status, note: body.note || '' }); return row;
		}
		const a = own(); if (row && row.status !== 'NEEDS_REVISION') fail('Hanya bukti yang perlu revisi dapat diperbarui.'); const action = state.pointActions.find((a) => a.id === (body.pointAction || row?.pointAction) || a.code === (body.activityType || row?.activityType)); if (!action || action.status !== 'ACTIVE' || action.workflow !== 'EVIDENCE') fail('Pilih aksi bukti yang aktif.');
		const files = [body.evidenceFiles || []].flat().filter(Boolean); if ((!row && !files.length) || files.length > 5) fail('Unggah satu sampai lima berkas bukti.');
		if (!body.activityDate || String(body.title || '').trim().length < 3 || String(body.description || '').trim().length < 20 || Number.isNaN(new Date(body.activityDate).getTime())) fail('Tanggal, judul, dan deskripsi minimal 20 karakter wajib diisi.');
		let participant;
		if (action.code === 'SESSION_ATTEND') { const e = find(state.events, body.event || row?.event); participant = (state.eventParticipants || []).find((p) => p.event === e.id && p.owner === user.id); if (!participant || !['TERJADWAL', 'BERLANGSUNG', 'SELESAI'].includes(e.status) || new Date(e.endsAt) > new Date()) fail('Bukti hadir memerlukan pendaftaran pada kegiatan yang telah selesai.'); }
		if (['SHARE_PUBLIC', 'SHARE_PRIVATE'].includes(action.code)) { const broadcast = find(state.broadcasts, body.broadcast || row?.broadcast); if (broadcast.status !== 'TERKIRIM' || (action.code === 'SHARE_PUBLIC' && !body.externalUrl)) fail('Kabar harus terbit dan tautan share publik wajib diisi.'); }
		const result = row || { id: id(), owner: user.id, awardeeId: a.id, awardeeName: a.fullName, revisionCount: 0, awardedPoints: 0 };
		Object.assign(result, { pointAction: action.id, actionCode: action.code, activityType: action.code, activityDate: body.activityDate, title: body.title, description: body.description, externalUrl: body.externalUrl || '', event: body.event || row?.event || '', eventParticipant: participant?.id || row?.eventParticipant || '', broadcast: body.broadcast || row?.broadcast || '', evidenceFiles: files.length ? files : row?.evidenceFiles || [], status: 'SUBMITTED', reviewer: '', submittedAt: now() }); if (!row) state.submissions.unshift(result); attendance(state, result); state.submissionEvents.push({ ...event, submission: result.id, eventType: row ? 'RESUBMITTED' : 'SUBMITTED', toStatus: 'SUBMITTED' }); return result;
	}
	return undefined;
}
