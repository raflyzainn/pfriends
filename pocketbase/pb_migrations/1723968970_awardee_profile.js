migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const awardees = app.findCollectionByNameOrId('awardees');
	awardees.fields.add(new SelectField({ name: 'profileVisibility', maxSelect: 1, values: ['DIRECTORY', 'PRIVATE'] }));
	awardees.fields.add(new TextField({ name: 'businessDescription', max: 1600 }));
	awardees.fields.add(new TextField({ name: 'businessContact', max: 16 }));
	awardees.fields.add(new FileField({ name: 'avatar', maxSelect: 1, maxSize: 2097152, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp'] }));
	awardees.fields.add(new BoolField({ name: 'nameConsentActive' }));
	awardees.fields.add(new BoolField({ name: 'businessConsentActive' }));
	app.save(awardees);

	const policyTypes = ['PUBLIKASI_NAMA','PUBLIKASI_FOTO_WAJAH','PUBLIKASI_CERITA','PUBLIKASI_VIDEO','PUBLIKASI_DATA_USAHA','PUBLIKASI_NOMINAL_OMZET','PUBLIKASI_INSTITUSI','AMPLIFIKASI_SOSMED','KONTAK_UNTUK_MENTORING','PENGOLAHAN_DATA_INTERNAL'];
	const policies = new Collection({
		type: 'base', name: 'consent_policies', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'consentType', type: 'select', required: true, maxSelect: 1, values: policyTypes },
			{ name: 'version', type: 'text', required: true, max: 40 },
			{ name: 'purpose', type: 'text', required: true, max: 1000 },
			{ name: 'statementText', type: 'text', required: true, max: 5000 },
			{ name: 'scope', type: 'json', maxSize: 10000 },
			{ name: 'channels', type: 'json', maxSize: 10000 },
			{ name: 'status', type: 'select', required: true, maxSelect: 1, values: ['ACTIVE','RETIRED'] },
			{ name: 'activeFrom', type: 'date', required: true },
			{ name: 'retiredAt', type: 'date' }
		],
		indexes: ['CREATE UNIQUE INDEX idx_consent_policy_version ON consent_policies (consentType, version)','CREATE INDEX idx_consent_policy_active ON consent_policies (consentType, status)']
	});
	app.save(policies);

	const consents = new Collection({
		type: 'base', name: 'profile_consents', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'consentType', type: 'select', required: true, maxSelect: 1, values: policyTypes },
			{ name: 'eventType', type: 'select', required: true, maxSelect: 1, values: ['GRANTED','REVOKED'] },
			{ name: 'policyVersion', type: 'text', required: true, max: 40 },
			{ name: 'purpose', type: 'text', required: true, max: 1000 },
			{ name: 'statementText', type: 'text', required: true, max: 5000 },
			{ name: 'scope', type: 'json', maxSize: 10000 },
			{ name: 'channels', type: 'json', maxSize: 10000 },
			{ name: 'occurredAt', type: 'date', required: true },
			{ name: 'expiresAt', type: 'date', required: true },
			{ name: 'via', type: 'select', required: true, maxSelect: 1, values: ['FORM_MICROSITE','MIGRATED_REGISTRATION','SELF_SERVICE'] },
			{ name: 'reason', type: 'text', max: 1000 }
		],
		indexes: ['CREATE INDEX idx_profile_consent_effective ON profile_consents (awardee, consentType, occurredAt)','CREATE INDEX idx_profile_consent_owner ON profile_consents (owner, occurredAt)']
	});
	app.save(consents);

	const audits = new Collection({
		type: 'base', name: 'profile_audits', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
			{ name: 'operation', type: 'select', required: true, maxSelect: 1, values: ['PROFILE_UPDATE','PRODUCT_CREATE','PRODUCT_UPDATE','PRODUCT_DELETE'] },
			{ name: 'objectId', type: 'text', max: 80 },
			{ name: 'before', type: 'json', maxSize: 30000 },
			{ name: 'after', type: 'json', maxSize: 30000 },
			{ name: 'occurredAt', type: 'date', required: true }
		], indexes: ['CREATE INDEX idx_profile_audit ON profile_audits (awardee, occurredAt)']
	});
	app.save(audits);

	const products = new Collection({
		type: 'base', name: 'business_products', listRule: null,
		viewRule: 'awardee.user = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "VERIFIER" || (@request.auth.status = "AKTIF" && awardee.profileVisibility = "DIRECTORY" && awardee.businessConsentActive = true)',
		createRule: null, updateRule: null, deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'name', type: 'text', required: true, min: 2, max: 160 },
			{ name: 'category', type: 'text', required: true, min: 2, max: 120 },
			{ name: 'description', type: 'text', max: 1200 },
			{ name: 'image', type: 'file', required: true, maxSelect: 1, maxSize: 5242880, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp'] },
			{ name: 'createdAt', type: 'date', required: true },
			{ name: 'updatedAt', type: 'date', required: true }
		], indexes: ['CREATE INDEX idx_business_products ON business_products (awardee, createdAt)']
	});
	app.save(products);

	const statements = {
		PUBLIKASI_NAMA:'Saya menyetujui nama saya ditampilkan pada kanal PFriends yang dipilih.',
		PUBLIKASI_FOTO_WAJAH:'Saya menyetujui foto wajah saya digunakan pada kanal PFriends yang dipilih.',
		PUBLIKASI_CERITA:'Saya menyetujui Cerita yang telah lolos verifikasi diterbitkan pada kanal PFriends.',
		PUBLIKASI_VIDEO:'Saya menyetujui rekaman video atau suara saya digunakan pada kanal yang dipilih.',
		PUBLIKASI_DATA_USAHA:'Saya menyetujui profil usaha, produk, dan kontak usaha ditampilkan kepada anggota PFriends.',
		PUBLIKASI_NOMINAL_OMZET:'Saya menyetujui nominal omzet usaha dipublikasikan pada ruang lingkup yang dipilih.',
		PUBLIKASI_INSTITUSI:'Saya menyetujui nama institusi saya ditampilkan pada kanal yang dipilih.',
		AMPLIFIKASI_SOSMED:'Saya menyetujui konten saya diamplifikasi melalui media sosial Pertamina Foundation.',
		KONTAK_UNTUK_MENTORING:'Saya menyetujui kontak mentoring dibagikan kepada anggota terverifikasi.',
		PENGOLAHAN_DATA_INTERNAL:'Saya menyetujui data keanggotaan diproses untuk operasional dan pelaporan internal Pertamina Foundation.'
	};
	const now = new Date().toISOString();
	for (const type of policyTypes) {
		const row = new Record(policies); row.set('consentType', type); row.set('version', 'PF-CONSENT-v1.0'); row.set('purpose', statements[type]); row.set('statementText', statements[type]); row.set('scope', ['SEMUA_KONTEN']); row.set('channels', type === 'PENGOLAHAN_DATA_INTERNAL' ? ['LAPORAN_INTERNAL'] : ['MICROSITE_PFRIENDS']); row.set('status', 'ACTIVE'); row.set('activeFrom', now); app.save(row);
	}
	for (const awardee of app.findRecordsByFilter('awardees', 'id != ""', '', 0, 0)) {
		awardee.set('profileVisibility', 'DIRECTORY'); awardee.set('nameConsentActive', true);
		awardee.set('businessConsentActive', awardee.getString('community') === 'WOMENPRENEUR'); app.save(awardee);
		const types = ['PENGOLAHAN_DATA_INTERNAL','PUBLIKASI_NAMA'];
		if (awardee.getBool('consentActive')) types.push('PUBLIKASI_CERITA');
		if (awardee.getString('community') === 'WOMENPRENEUR') types.push('PUBLIKASI_DATA_USAHA');
		for (const type of types) {
			const event = new Record(consents); event.set('awardee', awardee.id); event.set('owner', awardee.getString('user')); event.set('consentType', type); event.set('eventType', 'GRANTED'); event.set('policyVersion', 'PF-CONSENT-v1.0'); event.set('purpose', statements[type]); event.set('statementText', statements[type]); event.set('scope', ['SEMUA_KONTEN']); event.set('channels', type === 'PENGOLAHAN_DATA_INTERNAL' ? ['LAPORAN_INTERNAL'] : ['MICROSITE_PFRIENDS']); event.set('occurredAt', awardee.getString('joinedAt') || now); const expiry = new Date(awardee.getString('joinedAt') || now); expiry.setFullYear(expiry.getFullYear() + 100); event.set('expiresAt', expiry.toISOString()); event.set('via', 'MIGRATED_REGISTRATION'); app.save(event);
		}
	}
}, (app) => {
	for (const name of ['business_products','profile_audits','profile_consents','consent_policies']) try { app.delete(app.findCollectionByNameOrId(name)); } catch (_) {}
	const awardees = app.findCollectionByNameOrId('awardees');
	for (const field of ['profileVisibility','businessDescription','businessContact','avatar','nameConsentActive','businessConsentActive']) try { awardees.fields.removeByName(field); } catch (_) {}
	app.save(awardees);
});
