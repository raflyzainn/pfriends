migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const awardees = app.findCollectionByNameOrId('awardees');
	awardees.fields.add(new BoolField({ name: 'avatarConsentActive' }));
	awardees.fields.add(new BoolField({ name: 'contactConsentActive' }));
	app.save(awardees);

	const avatars = new Collection({
		type: 'base',
		name: 'profile_avatars',
		listRule: null,
		viewRule: 'awardee.user = @request.auth.id || @request.auth.role = "ADMIN" || @request.auth.role = "VERIFIER" || (@request.auth.status = "AKTIF" && awardee.status = "AKTIF" && awardee.profileVisibility = "DIRECTORY" && awardee.nameConsentActive = true && awardee.avatarConsentActive = true)',
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'awardee', type: 'relation', required: true, maxSelect: 1, collectionId: awardees.id, cascadeDelete: true },
			{ name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
			{ name: 'image', type: 'file', required: true, maxSelect: 1, maxSize: 2097152, protected: true, mimeTypes: ['image/jpeg','image/png','image/webp'] },
			{ name: 'updatedAt', type: 'date', required: true }
		],
		indexes: ['CREATE UNIQUE INDEX idx_profile_avatar_awardee ON profile_avatars (awardee)']
	});
	app.save(avatars);
	const now = new Date();
	for (const awardee of app.findRecordsByFilter('awardees', 'id != ""', '', 0, 0)) {
		const rows = app.findRecordsByFilter('profile_consents', 'awardee = {:awardee}', '-occurredAt', 0, 0, { awardee: awardee.id });
		const active = (type) => {
			const latest = rows.find((row) => row.getString('consentType') === type);
			if (!latest || latest.getString('eventType') !== 'GRANTED') return false;
			const expiry = new Date(latest.getString('expiresAt'));
			return !Number.isNaN(expiry.getTime()) && expiry > now;
		};
		awardee.set('avatarConsentActive', active('PUBLIKASI_FOTO_WAJAH'));
		awardee.set('contactConsentActive', active('KONTAK_UNTUK_MENTORING'));
		app.save(awardee);
	}

	let fsys;
	try {
		fsys = app.newFilesystem();
		for (const awardee of app.findRecordsByFilter('awardees', 'avatar != ""', '', 0, 0)) {
			const filename = awardee.getString('avatar');
			const row = new Record(avatars);
			row.set('awardee', awardee.id);
			row.set('owner', awardee.getString('user'));
			row.set('image', fsys.getReuploadableFile(`${awardee.baseFilesPath()}/${filename}`, true));
			row.set('updatedAt', new Date().toISOString());
			app.save(row);
		}
	} finally {
		if (fsys) fsys.close();
	}
}, (app) => {
	try { app.delete(app.findCollectionByNameOrId('profile_avatars')); } catch (_) {}
	const awardees = app.findCollectionByNameOrId('awardees');
	for (const field of ['avatarConsentActive','contactConsentActive']) {
		try { awardees.fields.removeByName(field); } catch (_) {}
	}
	app.save(awardees);
});
