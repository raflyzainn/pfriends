import { PasswordHash } from '../../domain/value-objects/PasswordHash.js';
import { whatsappResult } from '../../domain/constants/whatsapp.js';
import emojiSource from '../../../../pocketbase/pb_hooks/forum-emoji-allowlist.js?raw';

const emojis = new Set(JSON.parse(emojiSource.slice(emojiSource.indexOf('['), emojiSource.lastIndexOf(']') + 1)));
const consentTypes = ['PUBLIKASI_NAMA', 'PUBLIKASI_FOTO_WAJAH', 'PUBLIKASI_CERITA', 'PUBLIKASI_VIDEO', 'PUBLIKASI_DATA_USAHA', 'PUBLIKASI_NOMINAL_OMZET', 'PUBLIKASI_INSTITUSI', 'AMPLIFIKASI_SOSMED', 'KONTAK_UNTUK_MENTORING'];
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const text = (value) => String(value ?? '').trim();
const bool = (value) => value === true || value === 'true';
const array = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
function fail(message, status = 400, code = '', data = {}) { throw Object.assign(new Error(message), { status, code, data }); }
function requireRole(user, roles) { if (!user || !roles.includes(user.role)) fail('Anda tidak memiliki akses untuk tindakan ini.', 403); }
function page(items, query, perPage = 20) { const page = Math.max(1, Number(query.get('page')) || 1), size = Math.min(50, Math.max(1, Number(query.get('perPage')) || perPage)); return { items: items.slice((page - 1) * size, page * size), page, perPage: size, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) }; }
function moderation(row) { const inactive = !row || row.mode === 'NONE' || (row.mode === 'TIMEOUT' && new Date(row.timeoutUntil) <= new Date()); return { mode: inactive ? 'NONE' : row.mode, readOnly: !inactive, source: inactive ? '' : row.source, reason: inactive ? '' : row.reason, timeoutUntil: inactive ? null : row.timeoutUntil, strikeLevel: row?.lastViolationAt && Date.now() - Date.parse(row.lastViolationAt) >= 2592000000 ? 0 : Number(row?.strikeLevel || 0), lastViolationAt: row?.lastViolationAt || null }; }
function image(value) { return Array.isArray(value) ? value[0] : value; }
function validateUploads(value, limit, pdf = false) { for (const file of array(value)) { const match = /^data:([^;,]+);base64,(.*)$/s.exec(String(file)); if (!match || !['image/jpeg','image/png','image/webp', ...(pdf ? ['application/pdf'] : [])].includes(match[1])) fail('Format berkas tidak didukung.'); if (match[2].length * 0.75 > limit) fail('Ukuran berkas melebihi batas.'); } }
function registrationFields(body) {
  const phone = whatsappResult(body.whatsapp);
  if (!phone.valid) fail(phone.message);
  if (text(body.fullName).length < 3 || text(body.region).length < 2 || !['SOBI','WOMENPRENEUR'].includes(body.community) || !['PFprestasi','PFmuda','PFsains','PFlestari'].includes(body.programPillar) || !['PF10','PF11','PF12'].includes(body.batch)) fail('Data registrasi belum lengkap.');
  const year = Number(body.graduationYear);
  if (body.community === 'SOBI' ? (!text(body.university) || !Number.isInteger(year) || year < 1980 || year > 2100) : (!text(body.businessName) || !text(body.businessSector) || !text(body.businessCity))) fail('Data komunitas belum lengkap.');
  if (array(body.proofs).length > 3) fail('Maksimal tiga berkas bukti.');
  validateUploads(body.proofs, 5 * 1024 * 1024, true);
  return phone.normalized;
}

export async function handlePeople(path, method, body = {}, state, user, query = new URLSearchParams()) {
  const route = path === '/api/pfriends/stories/consent/revoke' ? '/profile/consents/PUBLIKASI_CERITA/revoke' : path.replace(/^\/api\/pfriends/, '');
  if (!/^\/(forum|directory|profile|registrations|admin\/awardees|admin\/impersonations)(\/|$)/.test(route)) return undefined;
  for (const name of ['registrations', 'registrationReviews', 'adminAwardeeActions', 'profileProducts', 'forumReactions', 'forumPresences', 'forumModerationActions', 'forumModerationStates']) state[name] ||= [];
  if (!state.peopleSeeded) {
    state.peopleSeeded = true;
    for (const row of state.awardees.filter(a => a.community === 'WOMENPRENEUR')) state.profileProducts.push({ id: `product-${row.id}`, awardee: row.id, name: `Produk ${row.businessProfile?.businessName || 'Usaha Lokal'}`, category: row.businessProfile?.sector || 'Produk lokal', description: 'Contoh produk unggulan anggota Womenpreneur.', image: '/img/womenpreneur-produk.jpg', createdAt: row.joinedAt, updatedAt: row.joinedAt });
    for (const [index, status] of ['PENDING','CLARIFICATION','REJECTED'].entries()) {
      const accountId = `demo-applicant-${index}`, email = `pendaftar${index + 1}@pfriends.id`, fullName = ['Nadia Putri','Bima Pratama','Citra Lestari'][index];
      state.accounts.push({ id: accountId, email, passwordHash: PasswordHash.of('pfriends2026', accountId).value, role: 'AWARDEE', awardeeId: '', displayName: fullName, status: 'NONAKTIF', onboardingStatus: status, createdAt: now() });
      state.registrations.push({ id: `registration-${index}`, owner: accountId, email, fullName, whatsapp: `628123456780${index}`, community: 'SOBI', programPillar: 'PFprestasi', batch: 'PF12', region: 'Jakarta', university: 'Universitas Indonesia', graduationYear: 2026, status, proofs: ['/img/sobi-alumni-kampus.jpg'], revisionCount: status === 'CLARIFICATION' ? 1 : 0, reviewNote: status === 'PENDING' ? '' : 'Mohon lengkapi bukti kepesertaan program.', submittedAt: now(), consentedAt: now(), consentVersion: 'awardee-registration-v1' });
    }
  }
  state.profileConsents ||= state.consents.map(row => ({ ...row, awardee: row.awardeeId, eventType: row.revokedAt ? 'REVOKED' : 'GRANTED', occurredAt: row.revokedAt || row.grantedAt, expiresAt: row.expiresAt || '2028-12-31T00:00:00.000Z', via: row.grantedVia || 'FORM_MICROSITE', scope: array(row.scope), channels: array(row.channels) }));
  const accountFor = (awardee) => state.accounts.find(row => row.awardeeId === awardee.id);
  const mine = () => { requireRole(user, ['AWARDEE']); const row = state.awardees.find(row => row.id === user.awardeeId); if (!row) fail('Profil Awardee belum tersedia.', 403); return row; };
  const effective = (awardeeId, type) => { const row = state.profileConsents.filter(row => row.awardee === awardeeId && row.consentType === type).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]; return Boolean(row && row.eventType === 'GRANTED' && Date.parse(row.expiresAt) > Date.now()); };
  const profileData = (row) => {
    const stories = state.stories.filter(story => story.authorId === row.id), business = row.businessProfile || {};
    return { profile: { ...row, recordId: row.id, profileVisibility: row.profileVisibility || 'DIRECTORY', businessName: row.businessName ?? business.businessName ?? '', businessSector: row.businessSector ?? business.sector ?? '', businessCity: row.businessCity ?? business.city ?? row.city, businessDescription: row.businessDescription ?? business.description ?? '', businessContact: row.businessContact ?? business.contact ?? '', businessEmployees: row.businessEmployees ?? business.employees ?? 0, businessGrowthPercent: row.businessGrowthPercent ?? business.growthPercent ?? 0, avatarAsset: row.avatar ? { id: row.id, image: row.avatar } : null }, statistics: { total: stories.length, draft: stories.filter(s => s.status === 'DRAFT').length, processing: stories.filter(s => ['DIAJUKAN', 'REVIEW', 'PERLU_REVISI', 'DISETUJUI'].includes(s.status)).length, published: stories.filter(s => s.status === 'TERPUBLIKASI').length, archived: stories.filter(s => s.status === 'DIARSIPKAN').length, totalViews: stories.reduce((sum, s) => sum + Number(s.views || 0), 0) }, consents: { effective: Object.fromEntries(consentTypes.map(type => [type, effective(row.id, type)])), history: state.profileConsents.filter(c => c.awardee === row.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) }, products: state.profileProducts.filter(p => p.awardee === row.id) };
  };
  const adminDto = (row) => { const account = accountFor(row) || {}; return { id: row.id, legacyId: row.id, userId: account.id, name: row.fullName, email: row.email, community: row.community, chapterId: row.chapterId, city: row.city, programPillar: row.programPillar, accountStatus: account.status, membershipStatus: row.status, lastLoginAt: account.lastLoginAt, joinedAt: row.joinedAt, totalPoints: row.points || 0, tierLevel: row.tierLevel || '' }; };

  if (route === '/registrations' && method === 'POST') {
    const email = text(body.email).toLowerCase(), password = String(body.password || ''), phone = whatsappResult(body.whatsapp);
    if (!/^\S+@\S+\.\S+$/.test(email)) fail('Alamat email tidak sah.');
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) fail('Kata sandi minimal delapan karakter, memiliki huruf kapital dan angka.');
    if (password !== body.passwordConfirm) fail('Konfirmasi kata sandi tidak cocok.');
    if (state.accounts.some(a => a.email.toLowerCase() === email)) fail('Email sudah terdaftar.', 409);
    if (!phone.valid) fail(phone.message);
    if (state.registrations.some(r => r.whatsapp === phone.normalized) || state.awardees.some(r => r.whatsapp === phone.normalized)) fail('Nomor WhatsApp sudah terdaftar.', 409);
    if (!bool(body.consent) || !array(body.proofs).length || array(body.proofs).length > 3) fail('Persetujuan dan satu sampai tiga bukti wajib diberikan.');
    registrationFields(body);
    const accountId = id(), registration = { ...body, id: id(), owner: accountId, email, whatsapp: phone.normalized, status: 'PENDING', revisionCount: 0, submittedAt: now(), consentedAt: now(), consentVersion: 'awardee-registration-v1', proofs: array(body.proofs) };
    delete registration.password; delete registration.passwordConfirm;
    state.accounts.push({ id: accountId, email, passwordHash: PasswordHash.of(password, accountId).value, role: 'AWARDEE', awardeeId: '', displayName: body.fullName, status: 'NONAKTIF', onboardingStatus: 'PENDING', createdAt: now() });
    state.registrations.unshift(registration);
    return { id: registration.id, status: 'PENDING', message: 'Registrasi berhasil dikirim.' };
  }
  if (!user) fail('Silakan masuk terlebih dahulu.', 401);
  if (route === '/registrations') { requireRole(user, ['ADMIN', 'VERIFIER']); return { items: state.registrations }; }
  if (route === '/registrations/me') {
    const registration = state.registrations.find(row => row.owner === user.id) || null;
    if (method === 'PATCH') { requireRole(user, ['AWARDEE']); registrationFields(body); body.whatsapp = whatsappResult(body.whatsapp).normalized; }
    if (method === 'PATCH') { if (registration?.status !== 'CLARIFICATION') fail('Registrasi tidak sedang menunggu klarifikasi.', 409); const fields = ['fullName','whatsapp','community','programPillar','batch','region','university','graduationYear','businessName','businessSector','businessCity']; for (const key of fields) if (body[key] !== undefined) registration[key] = body[key]; if (body.proofs) registration.proofs = array(body.proofs); Object.assign(registration, { status: 'PENDING', submittedAt: now(), reviewNote: '' }); const account = state.accounts.find(a => a.id === user.id); account.onboardingStatus = 'PENDING'; account.displayName = registration.fullName; state.registrationReviews.unshift({ id: id(), registration: registration.id, reviewerName: account.displayName, decision: 'RESUBMIT', note: 'Klarifikasi dikirim ulang.', decidedAt: now() }); return { status: 'PENDING' }; }
    return { registration };
  }
  let match = route.match(/^\/registrations\/([^/]+)\/(reviews|decision)$/);
  if (match) {
    const row = state.registrations.find(r => r.id === match[1]); if (!row) fail('Registrasi tidak ditemukan.', 404);
    if (match[2] === 'reviews') { if (row.owner !== user.id) requireRole(user, ['ADMIN','VERIFIER']); return { items: state.registrationReviews.filter(r => r.registration === row.id) }; }
    requireRole(user, ['VERIFIER']); const decision = body.decision, next = { APPROVE: 'APPROVED', REJECT: 'REJECTED', REQUEST_CLARIFICATION: 'CLARIFICATION', REOPEN: 'CLARIFICATION' }[decision];
    if (!next || (decision !== 'APPROVE' && text(body.note).length < 5)) fail('Keputusan dan catatan belum sesuai.');
    if (decision === 'REOPEN' ? row.status !== 'REJECTED' : row.status !== 'PENDING') fail('Status registrasi sudah berubah.', 409);
    const account = state.accounts.find(a => a.id === row.owner);
    if (decision === 'APPROVE' && !account.awardeeId) { account.awardeeId = `AWD-${id()}`; state.awardees.push({ id: account.awardeeId, fullName: row.fullName, email: row.email, whatsapp: row.whatsapp, community: row.community, programPillar: row.programPillar, chapterId: row.batch, city: row.region, university: row.university, graduationYear: Number(row.graduationYear) || null, businessName: row.businessName, businessSector: row.businessSector, businessCity: row.businessCity, status: 'AKTIF', points: 0, coins: 0, seasonPoints: 0, streakWeeks: 0, streakDays: 0, skills: [], badgeCodes: [], consentActive: false, joinedAt: now() }); }
    Object.assign(account, { status: decision === 'APPROVE' ? 'AKTIF' : 'NONAKTIF', onboardingStatus: next }); Object.assign(row, { status: next, reviewer: user.id, reviewerName: user.displayName, reviewNote: text(body.note), reviewedAt: now(), revisionCount: row.revisionCount + (next === 'CLARIFICATION' ? 1 : 0) });
    state.registrationReviews.unshift({ id: id(), registration: row.id, reviewer: user.id, reviewerName: user.displayName, decision, note: text(body.note), decidedAt: now() }); return { status: next };
  }
  if (route === '/directory') {
    const all = state.awardees.filter(row => row.status === 'AKTIF' && row.profileVisibility !== 'PRIVATE' && accountFor(row)?.status === 'AKTIF' && effective(row.id, 'PUBLIKASI_NAMA'));
    const filtered = all.filter(row => (!query.get('community') || row.community === query.get('community')) && (!query.get('chapter') || row.chapterId === query.get('chapter')) && (!query.get('city') || row.city === query.get('city')) && (!query.get('skill') || row.skills?.includes(query.get('skill'))) && (query.get('mentor') !== 'true' || row.openToMentoring) && (!query.get('search') || JSON.stringify(row).toLowerCase().includes(query.get('search').toLowerCase()))).map(row => ({ ...row, avatar: effective(row.id, 'PUBLIKASI_FOTO_WAJAH') && row.avatar ? { id: row.id, image: row.avatar } : null, whatsapp: effective(row.id, 'KONTAK_UNTUK_MENTORING') ? row.whatsapp : '', businessProfile: effective(row.id, 'PUBLIKASI_DATA_USAHA') ? { ...row.businessProfile, businessName: row.businessName || row.businessProfile?.businessName, sector: row.businessSector || row.businessProfile?.sector, products: state.profileProducts.filter(p => p.awardee === row.id) } : null }));
    return { ...page(filtered, query, 12), facets: { cities: [...new Set(all.map(r => r.city).filter(Boolean))].sort(), skills: [...new Set(all.flatMap(r => r.skills || []))].sort() }, stats: { active: all.length, sobi: all.filter(r => r.community === 'SOBI').length, womenpreneur: all.filter(r => r.community === 'WOMENPRENEUR').length, mentors: all.filter(r => r.openToMentoring).length } };
  }
  if (route === '/profile/me') {
    const row = mine();
    if (method === 'PATCH') {
      validateUploads(body.avatar, 2 * 1024 * 1024);
      if (['fullName','email','community','programPillar','chapterId','university','graduationYear'].some(key => key in body)) fail('Data identitas terverifikasi tidak dapat diubah.');
      const phone = text(body.whatsapp ?? row.whatsapp).replace(/\D/g, ''); if (phone.length < 10 || phone.length > 16) fail('Nomor WhatsApp harus 10 sampai 16 digit.');
      if (state.awardees.some(a => a.id !== row.id && a.whatsapp === phone)) fail('Nomor WhatsApp sudah digunakan.');
      let skills = body.skills ?? row.skills ?? []; if (typeof skills === 'string') { try { skills = JSON.parse(skills); } catch { skills = skills.split(','); } } skills = [...new Set(array(skills).map(text).filter(Boolean))]; if (skills.length > 12 || skills.some(s => s.length > 60)) fail('Maksimal 12 keahlian, masing-masing 60 karakter.');
      if (body.profileVisibility && !['DIRECTORY','PRIVATE'].includes(body.profileVisibility)) fail('Visibilitas tidak dikenal.');
      Object.assign(row, { whatsapp: phone, skills }); for (const key of ['city','occupation','bio','profileVisibility','businessName','businessSector','businessCity','businessDescription','businessContact','businessEmployees','businessGrowthPercent']) if (key in body && (!key.startsWith('business') || row.community === 'WOMENPRENEUR')) row[key] = body[key]; if ('openToMentoring' in body) row.openToMentoring = bool(body.openToMentoring); if (bool(body.removeAvatar)) row.avatar = ''; else if (body.avatar) row.avatar = image(body.avatar);
    }
    return profileData(row);
  }
  match = route.match(/^\/profile\/consents\/([^/]+)\/(grant|revoke)$/);
  if (match) {
    const row = mine(), type = decodeURIComponent(match[1]), grant = match[2] === 'grant'; if (!consentTypes.includes(type)) fail('Jenis persetujuan tidak dikenal.'); if (effective(row.id, type) === grant) fail('Status persetujuan sudah sesuai.');
    const consent = { id: id(), awardee: row.id, consentType: type, eventType: grant ? 'GRANTED' : 'REVOKED', occurredAt: now(), expiresAt: new Date(Date.now() + 63072000000).toISOString(), policyVersion: 'PF-CONSENT-v1.0', scope: ['SEMUA_KONTEN'], channels: ['MICROSITE_PFRIENDS'], via: 'SELF_SERVICE' }; state.profileConsents.unshift(consent);
    let withdrawn = 0, blocked = 0; if (type === 'PUBLIKASI_CERITA') { row.consentActive = grant; if (!grant) for (const story of state.stories.filter(s => s.authorId === row.id)) { story.consentActive = false; if (['TERPUBLIKASI','DISETUJUI'].includes(story.status)) { story.status = 'DIARSIPKAN'; story.archiveReason = 'CONSENT_DICABUT'; story.archivedAt = now(); withdrawn++; } else blocked++; } }
    return grant ? consent : { consent, withdrawn, blocked };
  }
  match = route.match(/^\/profile\/products(?:\/([^/]+))?$/);
  if (match) {
    const row = mine(); if (row.community !== 'WOMENPRENEUR') fail('Etalase hanya tersedia untuk Womenpreneur.', 403);
    let product = match[1] ? state.profileProducts.find(p => p.id === match[1] && p.awardee === row.id) : null; if (match[1] && !product) fail('Produk tidak ditemukan.', 404);
    if (method === 'DELETE') { state.profileProducts = state.profileProducts.filter(p => p.id !== product.id); return { deleted: true }; }
    validateUploads(body.image, 5 * 1024 * 1024);
    if (text(body.name ?? product?.name).length < 2 || text(body.category ?? product?.category).length < 2 || text(body.description).length > 1200) fail('Nama dan kategori produk wajib diisi.');
    if (!product) { if (state.profileProducts.filter(p => p.awardee === row.id).length >= 5) fail('Etalase maksimal lima produk.'); if (!body.image) fail('Foto produk wajib diunggah.'); product = { id: id(), awardee: row.id, createdAt: now() }; state.profileProducts.push(product); }
    for (const key of ['name','category','description']) if (key in body) product[key] = text(body[key]); if (body.image) product.image = image(body.image); product.updatedAt = now(); return product;
  }
  if (route.startsWith('/admin/awardees')) {
    requireRole(user, ['ADMIN']);
    if (route === '/admin/awardees') { const all = state.awardees.map(adminDto), filtered = all.filter(row => ['accountStatus','membershipStatus','community'].every(key => !query.get(key) || row[key] === query.get(key)) && (!query.get('chapter') || row.chapterId === query.get('chapter')) && (!query.get('q') || JSON.stringify(row).toLowerCase().includes(query.get('q').toLowerCase()))); return { ...page(filtered, query), stats: { total: all.length, activeAccounts: all.filter(r => r.accountStatus === 'AKTIF').length, inactiveMemberships: all.filter(r => r.membershipStatus === 'NONAKTIF').length, everLoggedIn: all.filter(r => r.lastLoginAt).length } }; }
    match = route.match(/^\/admin\/awardees\/([^/]+)\/(history|account-status|membership-status|impersonate)$/);
    if (match) { const row = state.awardees.find(a => a.id === decodeURIComponent(match[1])); if (!row) fail('Awardee tidak ditemukan.', 404); const account = accountFor(row); if (match[2] === 'history') return { awardee: adminDto(row), items: state.adminAwardeeActions.filter(a => a.awardee === row.id) };
      if (match[2] === 'impersonate') { if (account.status !== 'AKTIF') fail('Hanya akun aktif yang dapat dibuka.'); const action = { id: id(), awardee: row.id, targetUser: account.id, actor: user.id, actorName: user.displayName, action: 'IMPERSONATION_STARTED', occurredAt: now(), expiresAt: new Date(Date.now() + 1800000).toISOString() }; state.adminAwardeeActions.unshift(action); const { passwordHash: _, ...record } = account; return { token: `local:${account.id}`, record: { ...record, legacyAccountId: record.id }, impersonation: { id: action.id, awardeeId: row.id, awardeeName: row.fullName, expiresAt: action.expiresAt } }; }
      const target = match[2] === 'account-status' ? account : row; if (!(target === account ? ['AKTIF','NONAKTIF','TERKUNCI'] : ['AKTIF','NONAKTIF']).includes(body.status) || text(body.reason).length < 10) fail('Status tidak sah atau alasan kurang dari 10 karakter.'); if (target.status === body.status) fail('Status sudah sesuai.'); state.adminAwardeeActions.unshift({ id: id(), awardee: row.id, actorName: user.displayName, action: target === account ? 'ACCOUNT_STATUS_CHANGED' : 'MEMBERSHIP_STATUS_CHANGED', fromStatus: target.status, toStatus: body.status, reason: body.reason, occurredAt: now() }); target.status = body.status; return adminDto(row);
    }
  }
  match = route.match(/^\/admin\/impersonations\/([^/]+)\/end$/);
  if (match) { const row = state.adminAwardeeActions.find(a => a.id === match[1]); if (!row || ![row.actor,row.targetUser].includes(user.id)) fail('Sesi impersonasi tidak ditemukan.', 403); row.endedAt ||= now(); return { endedAt: row.endedAt }; }

  if (route.startsWith('/forum/')) {
    state.forumChannels ||= [['umum','Umum','Ruang berbagi seluruh anggota','',false],['pengumuman','Pengumuman','Informasi resmi Pertamina Foundation','',true],['sobi','SOBI','Diskusi alumni Sobat Bumi','SOBI',false],['womenpreneur','Womenpreneur','Berbagi pengalaman dan peluang usaha','WOMENPRENEUR',false]].map(([slug,name,topic,community,staffOnlyWrite]) => ({ id: `channel-${slug}`, slug, name, topic, community, staffOnlyWrite, note: 'Jaga percakapan tetap ramah dan bermanfaat.' }));
    state.forumMessages ||= state.forumChannels.map(channel => ({ id: `welcome-${channel.slug}`, channel: channel.id, authorId: 'SYSTEM', authorKind: 'SYSTEM', authorName: 'PFriends', authorLabel: 'Pertamina Foundation', content: `Selamat datang di kanal ${channel.name}. Mari berbagi kabar, pengalaman, dan peluang kolaborasi.`, createdAt: now() }));
    const profile = state.awardees.find(a => a.id === user.awardeeId), staff = ['ADMIN','VERIFIER'].includes(user.role), currentModeration = () => moderation(state.forumModerationStates.find(r => r.user === user.id));
    const canRead = channel => channel && (staff || !channel.community || (profile?.status === 'AKTIF' && profile.community === channel.community));
    const assertWrite = () => { const status = currentModeration(); if (!staff && status.readOnly) fail(status.reason || 'Akses menulis Forum sedang dibatasi.', status.mode === 'BANNED' ? 403 : 429, status.mode === 'BANNED' ? 'FORUM_BANNED' : 'FORUM_TIMEOUT', { moderation: status }); };
    const reactions = messageId => Object.values(state.forumReactions.filter(r => r.message === messageId).reduce((all,r) => { const entry = all[r.emoji] ||= { emoji: r.emoji, count: 0, selected: false }; entry.count++; if (r.user === user.id) entry.selected = true; return all; }, {}));
    const messageDto = row => { const reply = state.forumMessages.find(m => m.id === row.replyTo); return { ...row, channelId: row.channel, mine: row.authorId === user.id, canDelete: row.authorKind !== 'SYSTEM' && (staff || row.authorId === user.id), reply: reply ? { id: reply.id, authorName: reply.authorName, content: reply.content.slice(0,180) } : null, reactions: reactions(row.id) }; };
    const moderationUser = account => { const awardee = state.awardees.find(a => a.id === account.awardeeId); return { id: account.id, awardeeId: awardee?.id, name: awardee?.fullName || account.displayName, email: account.email, community: awardee?.community, chapterId: awardee?.chapterId, accountStatus: account.status, moderation: moderation(state.forumModerationStates.find(r => r.user === account.id)) }; };
    if (route === '/forum/moderation/me') return { moderation: currentModeration() };
    if (route === '/forum/moderation/users') { requireRole(user, ['ADMIN','VERIFIER']); const items = state.accounts.filter(a => a.role === 'AWARDEE' && a.awardeeId).map(moderationUser).filter(row => (!query.get('userId') || row.id === query.get('userId')) && (!query.get('status') || row.moderation.mode === query.get('status')) && (!query.get('q') || JSON.stringify(row).toLowerCase().includes(query.get('q').toLowerCase()))); return { items: items.slice(0,50), totalItems: items.length }; }
    match = route.match(/^\/forum\/moderation\/users\/([^/]+)\/(history|actions)$/);
    if (match) {
      requireRole(user, ['ADMIN','VERIFIER']); const account = state.accounts.find(a => a.id === decodeURIComponent(match[1]) && a.role === 'AWARDEE'); if (!account) fail('Awardee tidak ditemukan.',404); if (match[2] === 'history') return { items: state.forumModerationActions.filter(a => a.targetUser === account.id) };
      const action = body.action, reason = text(body.reason); if (!['TIMEOUT','CLEAR_TIMEOUT','BAN','UNBAN','DEACTIVATE_ACCOUNT'].includes(action) || reason.length < 10) fail('Tindakan tidak dikenal atau alasan kurang dari 10 karakter.');
      const current = state.forumModerationStates.find(r => r.user === account.id), status = moderation(current); let mode = status.mode, timeoutUntil = '', eventAction;
      if (action === 'TIMEOUT') { const duration = Date.parse(body.expiresAt) - Date.now(); if (!Number.isFinite(duration) || duration < 300000 || duration > 2592000000) fail('Timeout harus antara 5 menit dan 30 hari.'); if (mode === 'BANNED') fail('Cabut ban terlebih dahulu.'); if (mode === 'TIMEOUT' && Date.parse(status.timeoutUntil) >= Date.parse(body.expiresAt)) fail('Timeout baru harus lebih lama.'); mode = 'TIMEOUT'; timeoutUntil = body.expiresAt; eventAction = 'MANUAL_TIMEOUT'; }
      else if (action === 'CLEAR_TIMEOUT') { if (mode !== 'TIMEOUT') fail('Pengguna tidak sedang timeout.'); mode = 'NONE'; eventAction = 'TIMEOUT_CLEARED'; }
      else if (action === 'UNBAN') { if (mode !== 'BANNED') fail('Pengguna tidak sedang diban.'); mode = 'NONE'; eventAction = 'BAN_CLEARED'; }
      else if (action === 'BAN') { if (mode === 'BANNED') fail('Pengguna sudah diban.'); mode = 'BANNED'; eventAction = 'MANUAL_BAN'; }
      else { if (text(body.confirmIdentity).toLowerCase() !== account.email.toLowerCase()) fail('Konfirmasi email tidak sesuai.'); account.status = 'NONAKTIF'; mode = 'BANNED'; eventAction = 'ACCOUNT_DEACTIVATED'; }
      const values = { user: account.id, mode, source: mode === 'NONE' ? '' : 'MANUAL', reason, timeoutUntil, strikeLevel: action === 'UNBAN' ? 0 : status.strikeLevel, lastViolationAt: status.lastViolationAt }; if (current) Object.assign(current, values); else state.forumModerationStates.push(values); state.forumModerationActions.unshift({ id: id(), targetUser: account.id, actorName: user.displayName, action: eventAction, source: 'MANUAL', reason, strikeLevel: values.strikeLevel, occurredAt: now(), expiresAt: timeoutUntil || null }); return moderationUser(account);
    }
    if (route === '/forum/channels') return { moderation: currentModeration(), items: state.forumChannels.filter(canRead).map(c => ({ ...c, canPost: (staff || !c.staffOnlyWrite) && !currentModeration().readOnly })) };
    if (route === '/forum/presence/heartbeat') { const channel = state.forumChannels.find(c => c.slug === body.channel); if (body.channel && !canRead(channel)) fail('Kanal tidak dapat diakses.',403); let presence = state.forumPresences.find(p => p.user === user.id); if (!presence) { presence = { user: user.id }; state.forumPresences.push(presence); } presence.lastSeenAt = now(); return {}; }
    if (route === '/forum/presence') return { items: state.forumPresences.filter(p => Date.now() - Date.parse(p.lastSeenAt) < 300000).map(p => { const account = state.accounts.find(a => a.id === p.user); return { id: p.user, name: account?.displayName || 'Anggota', label: account?.role === 'AWARDEE' ? 'Awardee PFriends' : 'Pertamina Foundation', state: Date.now() - Date.parse(p.lastSeenAt) < 90000 ? 'aktif' : 'sibuk' }; }) };
    match = route.match(/^\/forum\/channels\/([^/]+)\/(messages|search)$/);
    if (match) {
      const channel = state.forumChannels.find(c => c.slug === decodeURIComponent(match[1])); if (!canRead(channel)) fail('Kanal tidak dapat diakses.',403);
      const all = state.forumMessages.filter(m => m.channel === channel.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
      if (match[2] === 'search') { const q = text(query.get('q')); if (q.length < 2 || q.length > 80) fail('Pencarian harus berisi 2 sampai 80 karakter.'); const items = all.filter(m => m.content.toLowerCase().includes(q.toLowerCase())).reverse(); return { items: items.slice(0,20).map(messageDto), totalItems: items.length }; }
      if (method === 'POST') {
        assertWrite(); if (!staff && channel.staffOnlyWrite) fail('Hanya staf yang dapat menulis di kanal ini.',403); const content = text(body.content); if (!content || content.length > 600 || !body.requestKey) fail('Pesan wajib berisi 1 sampai 600 karakter.');
        const duplicate = state.forumMessages.find(m => m.authorId === user.id && m.requestKey === body.requestKey); if (duplicate) return messageDto(duplicate);
        if (body.replyTo && !all.some(m => m.id === body.replyTo)) fail('Pesan balasan harus berada di kanal yang sama.');
        const own = state.forumMessages.filter(m => m.authorId === user.id), age = m => Date.now() - Date.parse(m.createdAt);
        if (own.filter(m => age(m) < 30000).length >= 6 || own.filter(m => age(m) < 600000).length >= 30 || own.some(m => m.channel === channel.id && age(m) < 120000 && m.content === content)) {
          if (staff) fail('Batas pengiriman pesan tercapai.',429);
          const level = Math.min(6, state.forumModerationActions.filter(a => a.targetUser === user.id && a.source === 'AUTO' && Date.now() - Date.parse(a.occurredAt) < 2592000000).length + 1), mode = level === 6 ? 'BANNED' : 'TIMEOUT', timeoutUntil = level === 6 ? '' : new Date(Date.now() + [5,30,360,1440,10080][level - 1] * 60000).toISOString(), reason = 'Terlalu banyak pesan atau pesan yang sama dikirim berulang kali.', values = { user: user.id, mode, source: 'AUTO', reason, timeoutUntil, strikeLevel: level, lastViolationAt: now() }, current = state.forumModerationStates.find(r => r.user === user.id); if (current) Object.assign(current,values); else state.forumModerationStates.push(values); state.forumModerationActions.unshift({ id: id(), targetUser: user.id, actorName: 'Sistem PFriends', action: mode === 'BANNED' ? 'AUTO_BAN' : 'AUTO_TIMEOUT', source: 'AUTO', reason, strikeLevel: level, occurredAt: now(), expiresAt: timeoutUntil }); assertWrite();
        }
        const row = { id: id(), channel: channel.id, authorId: user.id, authorKind: 'USER', authorName: profile?.fullName || user.displayName, authorLabel: profile ? `${profile.community} · ${profile.chapterId}` : 'Pertamina Foundation', content, requestKey: body.requestKey, replyTo: body.replyTo || '', createdAt: now() }; state.forumMessages.push(row); return messageDto(row);
      }
      const visible = all.filter(m => !query.get('before') || m.createdAt < query.get('before')), limit = Math.min(50, Math.max(1, Number(query.get('perPage')) || 50)), items = visible.slice(-limit); return { items: items.map(messageDto), hasMore: visible.length > limit, nextCursor: visible.length > limit ? items[0].createdAt : '' };
    }
    match = route.match(/^\/forum\/messages\/([^/]+)(?:\/(context|reaction))?$/);
    if (match) {
      const row = state.forumMessages.find(m => m.id === match[1]), channel = state.forumChannels.find(c => c.id === row?.channel); if (!row) fail('Pesan tidak ditemukan.',404); if (!canRead(channel)) fail('Pesan tidak dapat diakses.',403);
      if (match[2] === 'context') return { channelSlug: channel.slug, items: state.forumMessages.filter(m => m.channel === channel.id).map(messageDto) };
      assertWrite(); if (match[2] === 'reaction') { if (!emojis.has(body.emoji)) fail('Reaksi tidak didukung.'); const existing = state.forumReactions.find(r => r.message === row.id && r.user === user.id && r.emoji === body.emoji); if (body.selected && !existing) state.forumReactions.push({ id: id(), message: row.id, user: user.id, emoji: body.emoji }); else if (!body.selected && existing) state.forumReactions = state.forumReactions.filter(r => r.id !== existing.id); return { reactions: reactions(row.id) }; }
      if (method === 'DELETE') { if (row.authorKind === 'SYSTEM' || (!staff && row.authorId !== user.id)) fail('Anda tidak dapat menghapus pesan ini.',403); state.forumMessages = state.forumMessages.filter(m => m.id !== row.id); state.forumReactions = state.forumReactions.filter(r => r.message !== row.id); return {}; }
    }
  }
  return undefined;
}
