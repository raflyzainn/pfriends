import { apiRoute } from '../api-router.js';
import { ApiError } from '../auth.js';
import { sendBatch } from '../batch.js';
import { recordId } from '../registration.js';

const OPTIONAL_TYPES = [
	'PUBLIKASI_NAMA', 'PUBLIKASI_FOTO_WAJAH', 'PUBLIKASI_CERITA', 'PUBLIKASI_VIDEO',
	'PUBLIKASI_DATA_USAHA', 'PUBLIKASI_NOMINAL_OMZET', 'PUBLIKASI_INSTITUSI',
	'AMPLIFIKASI_SOSMED', 'KONTAK_UNTUK_MENTORING'
];
const LOCKED_PROFILE_FIELDS = ['fullName', 'email', 'community', 'programPillar', 'chapterId', 'university', 'graduationYear'];
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function filter(pb, expression, values) { return pb.filter(expression, values); }
function asArray(value) { return Array.isArray(value) ? value : []; }
function groupBy(rows, keyOf) {
	const groups = new Map();
	for (const row of rows) {
		const key = keyOf(row), group = groups.get(key) || [];
		group.push(row);
		groups.set(key, group);
	}
	return groups;
}
function text(value) { return String(value ?? '').trim(); }
function bool(value, fallback = false) {
	if (value === undefined || value === null || value === '') return fallback;
	return value === true || String(value).toLowerCase() === 'true';
}
function formObject(body) {
	if (!(body instanceof FormData)) return body || {};
	return Object.fromEntries([...body.entries()].filter(([, value]) => !(value instanceof File)));
}
function uploaded(body, field) {
	if (!(body instanceof FormData)) return [];
	return body.getAll(field).filter((value) => value instanceof File && value.size > 0);
}
function validateImage(file, maxSize, label) {
	if (!file) return;
	if (!IMAGE_TYPES.has(file.type)) throw new ApiError(400, `${label} harus berupa JPG, PNG, atau WebP.`);
	if (file.size > maxSize) throw new ApiError(400, `${label} terlalu besar.`);
}
async function optionalOne(pb, collection, query) {
	try { return await pb.collection(collection).getFirstListItem(query); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}
async function awardeeFor(pb, userId) {
	const awardee = await optionalOne(pb, 'awardees', filter(pb, 'user = {:user}', { user: userId }));
	if (!awardee) throw new ApiError(403, 'Profil Awardee aktif belum tersedia.');
	return awardee;
}
async function awardeeContext(ctx) {
	const principal = await ctx.principal({ roles: ['AWARDEE'] });
	const pb = await ctx.admin();
	const awardee = await awardeeFor(pb, principal.record.id);
	return { principal, pb, awardee };
}
async function consentEvents(pb, awardeeId) {
	return pb.collection('profile_consents').getFullList({ filter: filter(pb, 'awardee = {:awardee}', { awardee: awardeeId }), sort: '-occurredAt' });
}
function effectiveFrom(rows, type, now = new Date()) {
	const latest = rows.find((row) => row.consentType === type);
	if (!latest || latest.eventType !== 'GRANTED') return null;
	const expiry = new Date(latest.expiresAt);
	return !Number.isNaN(expiry.getTime()) && expiry > now ? latest : null;
}
function projections(rows) {
	return {
		consentActive: Boolean(effectiveFrom(rows, 'PUBLIKASI_CERITA')),
		nameConsentActive: Boolean(effectiveFrom(rows, 'PUBLIKASI_NAMA')),
		businessConsentActive: Boolean(effectiveFrom(rows, 'PUBLIKASI_DATA_USAHA')),
		avatarConsentActive: Boolean(effectiveFrom(rows, 'PUBLIKASI_FOTO_WAJAH')),
		contactConsentActive: Boolean(effectiveFrom(rows, 'KONTAK_UNTUK_MENTORING'))
	};
}
function consentDto(row) {
	return {
		id: row.id, consentType: row.consentType, eventType: row.eventType,
		policyVersion: row.policyVersion, purpose: row.purpose, statementText: row.statementText,
		scope: asArray(row.scope), channels: asArray(row.channels), occurredAt: row.occurredAt,
		expiresAt: row.expiresAt, via: row.via, reason: row.reason || ''
	};
}
function productDto(row) {
	return {
		id: row.id, name: row.name, category: row.category, description: row.description || '', image: row.image || '',
		imagePath: row.image ? `/api/files/${row.collectionId}/${row.id}/${row.image}` : '',
		createdAt: row.createdAt, updatedAt: row.updatedAt
	};
}
function avatarDto(row) { return row?.image ? { id: row.id, image: row.image, collectionName: 'profile_avatars' } : null; }
function profileSnapshot(awardee, avatar) {
	return {
		whatsapp: awardee.whatsapp || '', city: awardee.city || '', occupation: awardee.occupation || '', bio: awardee.bio || '',
		skills: asArray(awardee.skills).map(text).filter(Boolean).slice(0, 12), openToMentoring: Boolean(awardee.openToMentoring),
		profileVisibility: awardee.profileVisibility || 'DIRECTORY', businessName: awardee.businessName || '',
		businessSector: awardee.businessSector || '', businessCity: awardee.businessCity || '',
		businessDescription: awardee.businessDescription || '', businessContact: awardee.businessContact || '',
		businessEmployees: Number(awardee.businessEmployees || 0), businessGrowthPercent: Number(awardee.businessGrowthPercent || 0),
		avatar: avatar?.image || ''
	};
}
async function profileDto(pb, awardee) {
	const [rows, products, avatar, stories] = await Promise.all([
		consentEvents(pb, awardee.id),
		pb.collection('business_products').getFullList({ filter: filter(pb, 'awardee = {:awardee}', { awardee: awardee.id }), sort: 'createdAt' }),
		optionalOne(pb, 'profile_avatars', filter(pb, 'awardee = {:awardee}', { awardee: awardee.id })),
		pb.collection('stories').getFullList({ filter: filter(pb, 'author = {:awardee}', { awardee: awardee.id }) })
	]);
	const flags = projections(rows);
	if (Object.entries(flags).some(([key, value]) => Boolean(awardee[key]) !== value)) {
		awardee = await pb.collection('awardees').update(awardee.id, flags);
	}
	const processing = new Set(['DIAJUKAN', 'REVIEW', 'PERLU_REVISI', 'DISETUJUI']);
	return {
		profile: {
			id: awardee.legacyId, recordId: awardee.id, fullName: awardee.fullName, email: awardee.email,
			community: awardee.community, programPillar: awardee.programPillar, chapterId: awardee.chapterId,
			university: awardee.university || '', graduationYear: Number(awardee.graduationYear || 0) || null,
			joinedAt: awardee.joinedAt, ...profileSnapshot(awardee, avatar), avatarAsset: avatarDto(avatar)
		},
		statistics: {
			total: stories.length, draft: stories.filter((row) => row.status === 'DRAFT').length,
			processing: stories.filter((row) => processing.has(row.status)).length,
			published: stories.filter((row) => row.status === 'TERPUBLIKASI').length,
			archived: stories.filter((row) => row.status === 'DIARSIPKAN').length,
			totalViews: stories.reduce((sum, row) => sum + Number(row.views || 0), 0)
		},
		consents: { effective: Object.fromEntries(OPTIONAL_TYPES.map((type) => [type, Boolean(effectiveFrom(rows, type))])), history: rows.map(consentDto) },
		products: products.map(productDto)
	};
}
function parseSkills(value, fallback) {
	if (value === undefined) return fallback;
	let skills = value;
	if (typeof skills === 'string') {
		try { skills = JSON.parse(skills); } catch { skills = skills.split(','); }
	}
	const unique = [...new Set(asArray(skills).map(text).filter(Boolean))];
	if (unique.length > 12 || unique.some((item) => item.length > 60)) throw new ApiError(400, 'Maksimal 12 keahlian, masing-masing 60 karakter.');
	return unique;
}
async function validateProfile(pb, awardee, body) {
	const field = (key, max) => text(body[key] === undefined ? awardee[key] : body[key]).slice(0, max);
	const whatsapp = text(body.whatsapp === undefined ? awardee.whatsapp : body.whatsapp).replace(/[^0-9]/g, '');
	if (whatsapp.length < 10 || whatsapp.length > 16) throw new ApiError(400, 'Nomor WhatsApp harus 10 sampai 16 digit.');
	const duplicate = await optionalOne(pb, 'awardees', filter(pb, 'whatsapp = {:whatsapp} && id != {:id}', { whatsapp, id: awardee.id }));
	if (duplicate) throw new ApiError(400, 'Nomor WhatsApp sudah dipakai Awardee lain.');
	const visibility = text(body.profileVisibility || awardee.profileVisibility || 'DIRECTORY');
	if (!['DIRECTORY', 'PRIVATE'].includes(visibility)) throw new ApiError(400, 'Visibilitas profil tidak dikenal.');
	return {
		whatsapp, city: field('city', 120), occupation: field('occupation', 160), bio: field('bio', 1200),
		skills: parseSkills(body.skills, asArray(awardee.skills)), openToMentoring: bool(body.openToMentoring, Boolean(awardee.openToMentoring)),
		profileVisibility: visibility, businessName: field('businessName', 180), businessSector: field('businessSector', 120),
		businessCity: field('businessCity', 120), businessDescription: field('businessDescription', 1600),
		businessContact: text(body.businessContact === undefined ? awardee.businessContact : body.businessContact).replace(/[^0-9]/g, '').slice(0, 16),
		businessEmployees: Math.max(0, Number(body.businessEmployees === undefined ? awardee.businessEmployees : body.businessEmployees) || 0),
		businessGrowthPercent: Math.max(-100, Number(body.businessGrowthPercent === undefined ? awardee.businessGrowthPercent : body.businessGrowthPercent) || 0)
	};
}
async function saveAudit(pb, awardeeId, actorId, operation, objectId, before, after) {
	await pb.collection('profile_audits').create({ id: recordId(), awardee: awardeeId, actor: actorId, operation, objectId: objectId || '', before: before || null, after: after || null, occurredAt: new Date().toISOString() });
}
async function saveAvatar(pb, awardee, userId, file, remove) {
	const current = await optionalOne(pb, 'profile_avatars', filter(pb, 'awardee = {:awardee}', { awardee: awardee.id }));
	if (remove) { if (current) await pb.collection('profile_avatars').delete(current.id); return null; }
	if (!file) return current;
	validateImage(file, 2 * 1024 * 1024, 'Foto profil');
	const data = new FormData();
	data.set('awardee', awardee.id); data.set('owner', userId); data.set('updatedAt', new Date().toISOString()); data.set('image', file);
	return current ? pb.collection('profile_avatars').update(current.id, data) : pb.collection('profile_avatars').create(data);
}

apiRoute('GET', '/awardees', async (ctx) => {
	await ctx.principal({ roles: ['ADMIN', 'VERIFIER'] });
	const pb = await ctx.admin();
	return { items: await pb.collection('awardees').getFullList({ sort: 'fullName' }) };
});

apiRoute('GET', '/awardees/{id}', async (ctx) => {
	const principal = await ctx.principal(), pb = await ctx.admin();
	const awardee = await pb.collection('awardees').getFirstListItem(filter(pb, 'legacyId = {:id}', { id: ctx.params.id }));
	if (principal.role === 'AWARDEE' && awardee.user !== principal.record.id) throw new ApiError(403, 'Profil Awardee ini tidak dapat diakses.');
	return awardee;
});

apiRoute('GET', '/directory', async (ctx) => {
	await ctx.principal();
	const pb = await ctx.admin();
	const params = ctx.url.searchParams;
	const search = text(params.get('search')).toLowerCase(), community = text(params.get('community')),
		chapter = text(params.get('chapter')), city = text(params.get('city')), skill = text(params.get('skill')),
		mentor = params.get('mentor') === 'true', page = Math.max(1, Number(params.get('page') || 1)),
		perPage = Math.min(48, Math.max(1, Number(params.get('perPage') || 12)));
	const awardees = await pb.collection('awardees').getFullList({
		filter: 'status = "AKTIF" && profileVisibility = "DIRECTORY" && nameConsentActive = true', sort: 'fullName', expand: 'user'
	});
	const eligible = awardees.filter((row) => row.expand?.user?.role === 'AWARDEE' && row.expand?.user?.status === 'AKTIF');
	const ids = new Set(eligible.map((row) => row.id));
	const [profiles, badges, products, avatars] = await Promise.all([
		pb.collection('gamification_profiles').getFullList(), pb.collection('awardee_badges').getFullList({ filter: 'status = "ACTIVE"' }),
		pb.collection('business_products').getFullList({ sort: 'createdAt' }), pb.collection('profile_avatars').getFullList()
	]);
	const profileBy = new Map(profiles.filter((row) => ids.has(row.awardee)).map((row) => [row.awardee, row]));
	const avatarBy = new Map(avatars.filter((row) => ids.has(row.awardee)).map((row) => [row.awardee, row]));
	const badgesBy = groupBy(badges.filter((row) => ids.has(row.awardee)), (row) => row.awardee);
	const productsBy = groupBy(products.filter((row) => ids.has(row.awardee)), (row) => row.awardee);
	const grouped = (source, awardeeId) => source.get(awardeeId) || [];
	const all = eligible.map((awardee) => {
		const profile = profileBy.get(awardee.id) || {}, showBusiness = awardee.community === 'WOMENPRENEUR' && awardee.businessConsentActive,
			showAvatar = awardee.avatarConsentActive, showContact = awardee.contactConsentActive && awardee.openToMentoring;
		return {
			id: awardee.legacyId, fullName: awardee.fullName, community: awardee.community, chapterId: awardee.chapterId,
			city: awardee.city || '', university: awardee.university || '', graduationYear: Number(awardee.graduationYear || 0) || null,
			occupation: awardee.occupation || '', bio: awardee.bio || '', skills: asArray(awardee.skills).map(text).filter(Boolean).slice(0, 12),
			openToMentoring: Boolean(awardee.openToMentoring), avatar: showAvatar ? avatarDto(avatarBy.get(awardee.id)) : null,
			...(showContact ? { whatsapp: awardee.whatsapp || '' } : {}),
			businessProfile: showBusiness ? {
				businessName: awardee.businessName || '', sector: awardee.businessSector || '', city: awardee.businessCity || awardee.city || '',
				description: awardee.businessDescription || '', contact: awardee.businessContact || '', employees: Number(awardee.businessEmployees || 0),
				growthPercent: Number(awardee.businessGrowthPercent || 0), products: grouped(productsBy, awardee.id).map((row) => ({ id: row.id, name: row.name, category: row.category, description: row.description || '', image: row.image || '', collectionName: 'business_products' }))
			} : null,
			points: Number(profile.totalPoints || 0), tier: profile.tier || 'NEWCOMER', streakWeeks: Number(profile.currentStreakWeeks || 0),
			badgeCodes: grouped(badgesBy, awardee.id).map((row) => row.badgeCode), joinedAt: awardee.joinedAt
		};
	});
	const cities = [...new Set(all.map((row) => row.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	const skills = [...new Set(all.flatMap((row) => row.skills))].sort((a, b) => a.localeCompare(b));
	const filtered = all.filter((row) => {
		if (community && row.community !== community) return false;
		if (chapter && row.chapterId !== chapter) return false;
		if (city && row.city !== city) return false;
		if (skill && !row.skills.includes(skill)) return false;
		if (mentor && !row.openToMentoring) return false;
		if (!search) return true;
		return [row.fullName, row.occupation, row.university, row.city, row.bio, row.skills.join(' '), row.businessProfile?.businessName || '', row.businessProfile?.sector || '', ...(row.businessProfile?.products || []).flatMap((product) => [product.name, product.category])].join(' ').toLowerCase().includes(search);
	});
	const start = (page - 1) * perPage;
	return { page, perPage, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / perPage), items: filtered.slice(start, start + perPage), facets: { cities, skills }, stats: { active: all.length, sobi: all.filter((row) => row.community === 'SOBI').length, womenpreneur: all.filter((row) => row.community === 'WOMENPRENEUR').length, mentors: all.filter((row) => row.community === 'SOBI' && row.openToMentoring).length } };
});

apiRoute('GET', '/profile/me', async (ctx) => {
	const { pb, awardee } = await awardeeContext(ctx);
	return profileDto(pb, awardee);
});

apiRoute('PATCH', '/profile/me', async (ctx) => {
	const { principal, pb, awardee } = await awardeeContext(ctx);
	const requestBody = await ctx.body(), body = formObject(requestBody);
	if (LOCKED_PROFILE_FIELDS.some((key) => body[key] !== undefined)) throw new ApiError(400, 'Data identitas terverifikasi tidak dapat diubah dari Profil Saya.');
	const existingAvatar = await optionalOne(pb, 'profile_avatars', filter(pb, 'awardee = {:awardee}', { awardee: awardee.id }));
	const before = profileSnapshot(awardee, existingAvatar), data = await validateProfile(pb, awardee, body);
	if (awardee.community !== 'WOMENPRENEUR') for (const key of Object.keys(data)) if (key.startsWith('business')) delete data[key];
	let updated = await pb.collection('awardees').update(awardee.id, data);
	const files = uploaded(requestBody, 'avatar');
	if (files.length > 1) throw new ApiError(400, 'Maksimal satu foto profil dapat diunggah.');
	const avatar = await saveAvatar(pb, updated, principal.record.id, files[0], bool(body.removeAvatar));
	await saveAudit(pb, awardee.id, principal.record.id, 'PROFILE_UPDATE', '', before, profileSnapshot(updated, avatar));
	const result = await profileDto(pb, updated);
	return { ...result.profile, ...result };
});

export async function consentMutation(ctx, eventType, consentType = '') {
	const { principal, pb, awardee } = await awardeeContext(ctx), type = consentType || ctx.params.type;
	if (!OPTIONAL_TYPES.includes(type)) throw new ApiError(400, 'Jenis consent tidak dapat diubah secara mandiri.');
	const rows = await consentEvents(pb, awardee.id), active = effectiveFrom(rows, type);
	if (eventType === 'GRANTED' && active) throw new ApiError(400, 'Persetujuan ini sudah aktif.');
	if (eventType === 'REVOKED' && !active) throw new ApiError(400, 'Persetujuan ini tidak sedang aktif.');
	const source = active || await pb.collection('consent_policies').getFirstListItem(filter(pb, 'consentType = {:type} && status = "ACTIVE"', { type }));
	const now = new Date(), expires = new Date(now); expires.setMonth(expires.getMonth() + 24);
	const consent = {
		id: recordId(), awardee: awardee.id, owner: principal.record.id, consentType: type, eventType,
		policyVersion: eventType === 'GRANTED' ? source.version : source.policyVersion, purpose: source.purpose,
		statementText: source.statementText, scope: asArray(source.scope).length ? source.scope : ['SEMUA_KONTEN'],
		channels: asArray(source.channels).length ? source.channels : ['MICROSITE_PFRIENDS'], occurredAt: now.toISOString(),
		expiresAt: eventType === 'GRANTED' ? expires.toISOString() : active.expiresAt, via: 'SELF_SERVICE'
	};
	const nextRows = [consent, ...rows], flags = projections(nextRows);
	let withdrawn = 0, blocked = 0, stories = [], covers = [];
	if (eventType === 'REVOKED' && type === 'PUBLIKASI_CERITA') {
		stories = await pb.collection('stories').getFullList({ filter: filter(pb, 'author = {:awardee}', { awardee: awardee.id }) });
		covers = await pb.collection('story_public_covers').getFullList();
	}
	await sendBatch(pb, async (batch) => {
		batch.collection('profile_consents').create(consent);
		batch.collection('awardees').update(awardee.id, flags);
		for (const story of stories) {
			const publishable = ['TERPUBLIKASI', 'DISETUJUI'].includes(story.status);
			const update = { consentActive: false, consentLegacyId: '' };
			if (publishable) Object.assign(update, { status: 'DIARSIPKAN', archiveReason: 'CONSENT_DICABUT', archivedAt: now.toISOString() });
			batch.collection('stories').update(story.id, update);
			if (publishable) {
				for (const cover of covers.filter((row) => row.story === story.id)) batch.collection('story_public_covers').delete(cover.id);
				batch.collection('story_status_events').create({ id: recordId(), story: story.id, actor: principal.record.id, actorName: principal.record.displayName || 'Awardee', eventType: 'CONSENT_REVOKED', fromStatus: story.status, toStatus: 'DIARSIPKAN', note: 'CONSENT_DICABUT', occurredAt: now.toISOString() });
				withdrawn++;
			} else blocked++;
		}
	});
	return eventType === 'GRANTED' ? { status: 201, body: consentDto(consent) } : { consent: consentDto(consent), withdrawn, blocked };
}

apiRoute('POST', '/profile/consents/{type}/grant', (ctx) => consentMutation(ctx, 'GRANTED'));
apiRoute('POST', '/profile/consents/{type}/revoke', (ctx) => consentMutation(ctx, 'REVOKED'));

apiRoute('POST', '/profile/products', async (ctx) => {
	const { principal, pb, awardee } = await awardeeContext(ctx);
	if (awardee.community !== 'WOMENPRENEUR') throw new ApiError(403, 'Etalase hanya tersedia untuk Womenpreneur.');
	const current = await pb.collection('business_products').getFullList({ filter: filter(pb, 'awardee = {:awardee}', { awardee: awardee.id }) });
	if (current.length >= 5) throw new ApiError(400, 'Etalase maksimal memuat lima produk.');
	const requestBody = await ctx.body(), body = formObject(requestBody), files = uploaded(requestBody, 'image');
	const name = text(body.name), category = text(body.category), description = text(body.description);
	if (name.length < 2 || category.length < 2) throw new ApiError(400, 'Nama dan kategori produk wajib diisi.');
	if (description.length > 1200) throw new ApiError(400, 'Deskripsi produk maksimal 1200 karakter.');
	if (files.length !== 1) throw new ApiError(400, 'Satu foto produk wajib diunggah.');
	validateImage(files[0], 5 * 1024 * 1024, 'Foto produk');
	const now = new Date().toISOString(), data = new FormData();
	data.set('awardee', awardee.id); data.set('name', name); data.set('category', category); data.set('description', description);
	data.set('createdAt', now); data.set('updatedAt', now); data.set('image', files[0]);
	const product = await pb.collection('business_products').create(data);
	await saveAudit(pb, awardee.id, principal.record.id, 'PRODUCT_CREATE', product.id, null, productDto(product));
	return { status: 201, body: productDto(product) };
});

apiRoute('PATCH', '/profile/products/{id}', async (ctx) => {
	const { principal, pb, awardee } = await awardeeContext(ctx), product = await pb.collection('business_products').getOne(ctx.params.id);
	if (product.awardee !== awardee.id) throw new ApiError(403, 'Produk ini bukan milik Anda.');
	const before = productDto(product), requestBody = await ctx.body(), body = formObject(requestBody), files = uploaded(requestBody, 'image');
	if (files.length > 1) throw new ApiError(400, 'Maksimal satu foto produk dapat diunggah.');
	const name = body.name === undefined ? product.name : text(body.name), category = body.category === undefined ? product.category : text(body.category),
		description = body.description === undefined ? product.description || '' : text(body.description);
	if (name.length < 2 || category.length < 2 || description.length > 1200) throw new ApiError(400, 'Data produk belum memenuhi ketentuan.');
	if (files[0]) validateImage(files[0], 5 * 1024 * 1024, 'Foto produk');
	let data;
	if (files[0]) { data = new FormData(); data.set('name', name); data.set('category', category); data.set('description', description); data.set('updatedAt', new Date().toISOString()); data.set('image', files[0]); }
	else data = { name, category, description, updatedAt: new Date().toISOString() };
	const updated = await pb.collection('business_products').update(product.id, data);
	await saveAudit(pb, awardee.id, principal.record.id, 'PRODUCT_UPDATE', product.id, before, productDto(updated));
	return productDto(updated);
});

apiRoute('DELETE', '/profile/products/{id}', async (ctx) => {
	const { principal, pb, awardee } = await awardeeContext(ctx), product = await pb.collection('business_products').getOne(ctx.params.id);
	if (product.awardee !== awardee.id) throw new ApiError(403, 'Produk ini bukan milik Anda.');
	await saveAudit(pb, awardee.id, principal.record.id, 'PRODUCT_DELETE', product.id, productDto(product), null);
	await pb.collection('business_products').delete(product.id);
	return { deleted: true };
});

apiRoute('POST', '/admin/jobs/expire-profile-consents', async (ctx) => {
	await ctx.principal({ roles: ['ADMIN'] });
	const pb = await ctx.admin(), awardees = await pb.collection('awardees').getFullList(), covers = await pb.collection('story_public_covers').getFullList(), now = new Date().toISOString();
	let profilesUpdated = 0, storiesBlocked = 0, storiesArchived = 0;
	for (const awardee of awardees) {
		const rows = await consentEvents(pb, awardee.id), flags = projections(rows), stories = flags.consentActive ? [] : await pb.collection('stories').getFullList({ filter: pb.filter('author = {:awardee} && consentActive = true', { awardee: awardee.id }) });
		await sendBatch(pb, async (batch) => {
			batch.collection('awardees').update(awardee.id, flags); profilesUpdated++;
			for (const story of stories) {
				const publishable = ['TERPUBLIKASI', 'DISETUJUI'].includes(story.status), update = { consentActive: false, consentLegacyId: '' };
				if (publishable) Object.assign(update, { status: 'DIARSIPKAN', archiveReason: 'KEDALUWARSA', archivedAt: now });
				batch.collection('stories').update(story.id, update);
				if (publishable) {
					for (const cover of covers.filter((row) => row.story === story.id)) batch.collection('story_public_covers').delete(cover.id);
					batch.collection('story_status_events').create({ id: recordId(), story: story.id, actorName: 'Sistem', eventType: 'CONSENT_EXPIRED', fromStatus: story.status, toStatus: 'DIARSIPKAN', note: 'KEDALUWARSA', occurredAt: now }); storiesArchived++;
				} else storiesBlocked++;
			}
		});
	}
	return { profilesUpdated, storiesBlocked, storiesArchived, processedAt: now };
});
