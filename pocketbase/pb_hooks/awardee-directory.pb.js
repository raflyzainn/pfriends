routerAdd('GET', '/api/pfriends/directory', (e) => {
	if (!e.auth || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Akun aktif diperlukan untuk membuka Jejaring.');
	const query = e.request.url.query();
	const search = String(query.get('search') || '').trim().toLowerCase();
	const community = String(query.get('community') || '');
	const chapter = String(query.get('chapter') || '');
	const city = String(query.get('city') || '');
	const skill = String(query.get('skill') || '');
	const mentor = String(query.get('mentor') || '') === 'true';
	const page = Math.max(1, Number(query.get('page') || 1));
	const perPage = Math.min(48, Math.max(1, Number(query.get('perPage') || 12)));
	const records = e.app.findRecordsByFilter('awardees', 'status = "AKTIF"', 'fullName', 0, 0);
	const all = [];
	for (const awardee of records) {
		let user;
		try { user = e.app.findRecordById('users', awardee.getString('user')); } catch (_) { continue; }
		if (user.getString('role') !== 'AWARDEE' || user.getString('status') !== 'AKTIF') continue;
		try { all.push(require(`${__hooks}/directory-utils.js`).item(e.app, awardee)); }
		catch (error) { throw new BadRequestError(`Profil ${awardee.getString('legacyId')} gagal dipetakan: ${error}`); }
	}
	const cities = [...new Set(all.map((item) => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	const skills = [...new Set(all.flatMap((item) => item.skills))].sort((a, b) => a.localeCompare(b));
	const stats = {
		active: all.length, sobi: all.filter((item) => item.community === 'SOBI').length,
		womenpreneur: all.filter((item) => item.community === 'WOMENPRENEUR').length,
		mentors: all.filter((item) => item.community === 'SOBI' && item.openToMentoring).length
	};
	const filtered = all.filter((item) => {
		if (community && item.community !== community) return false;
		if (chapter && item.chapterId !== chapter) return false;
		if (city && item.city !== city) return false;
		if (skill && item.skills.indexOf(skill) === -1) return false;
		if (mentor && !item.openToMentoring) return false;
		if (!search) return true;
		return [item.fullName,item.occupation,item.university,item.city,item.bio,item.skills.join(' '),item.businessProfile?.businessName || '',item.businessProfile?.sector || ''].join(' ').toLowerCase().indexOf(search) !== -1;
	});
	const start = (page - 1) * perPage;
	return e.json(200, { page, perPage, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / perPage), items: filtered.slice(start, start + perPage), facets: { cities, skills }, stats });
}, $apis.requireAuth('users'));

routerAdd('PATCH', '/api/pfriends/profile/me', (e) => {
	if (!e.auth || e.auth.getString('role') !== 'AWARDEE' || e.auth.getString('status') !== 'AKTIF') throw new ForbiddenError('Sesi Awardee aktif diperlukan.');
	const data = new DynamicModel({ occupation: '', bio: '', skills: [], openToMentoring: false, businessEmployees: 0, businessGrowthPercent: 0 });
	e.bindBody(data);
	const occupation = String(data.occupation || '').trim();
	const bio = String(data.bio || '').trim();
	if (occupation.length > 160) throw new BadRequestError('Pekerjaan maksimal 160 karakter.');
	if (bio.length > 1200) throw new BadRequestError('Bio maksimal 1200 karakter.');
	const skills = (Array.isArray(data.skills) ? data.skills : []).map((item) => String(item).trim()).filter(Boolean);
	if (skills.length > 12 || skills.some((item) => item.length > 60)) throw new BadRequestError('Maksimal 12 keahlian, masing-masing 60 karakter.');
	const awardee = e.app.findFirstRecordByData('awardees', 'user', e.auth.id);
	const uniqueSkills = [];
	for (const skill of skills) if (uniqueSkills.indexOf(skill) === -1) uniqueSkills.push(skill);
	awardee.set('occupation', occupation); awardee.set('bio', bio); awardee.set('skills', uniqueSkills);
	awardee.set('openToMentoring', Boolean(data.openToMentoring));
	if (awardee.getString('community') === 'WOMENPRENEUR') {
		awardee.set('businessEmployees', Math.max(0, Number(data.businessEmployees) || 0));
		awardee.set('businessGrowthPercent', Math.max(-100, Number(data.businessGrowthPercent) || 0));
	}
	e.app.save(awardee);
	return e.json(200, require(`${__hooks}/directory-utils.js`).item(e.app, awardee));
}, $apis.requireAuth('users'));
