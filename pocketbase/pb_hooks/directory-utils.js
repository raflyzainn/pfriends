function skillsOf(record) {
	let value = record.get('skills');
	// JSONField dari sisi Goja dapat hadir sebagai byte array JSON mentah.
	if (Array.isArray(value) && value.length && typeof value[0] === 'number') {
		try { value = JSON.parse(value.map((code) => String.fromCharCode(code)).join('')); } catch (_) { value = []; }
	}
	if (!Array.isArray(value)) return [];
	return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
}

function item(app, awardee) {
	const profile = require(`${__hooks}/gamification-utils.js`).ensureProfile(app, awardee).profile;
	const badges = app.findRecordsByFilter('awardee_badges', 'awardee = {:awardee} && status = "ACTIVE"', '', 0, 0, { awardee: awardee.id });
	const showBusiness = awardee.getString('community') === 'WOMENPRENEUR' && awardee.getBool('businessConsentActive');
	const products = showBusiness ? app.findRecordsByFilter('business_products', 'awardee = {:awardee}', 'createdAt', 0, 0, { awardee: awardee.id }).map((row) => {
		const image = row.getString('image');
		return { id: row.id, name: row.getString('name'), category: row.getString('category'), description: row.getString('description'), image, collectionName: 'business_products' };
	}) : [];
	return {
		id: awardee.getString('legacyId'), fullName: awardee.getString('fullName'),
		community: awardee.getString('community'), chapterId: awardee.getString('chapterId'),
		city: awardee.getString('city'), university: awardee.getString('university'),
		graduationYear: awardee.getInt('graduationYear') || null,
		occupation: awardee.getString('occupation'), bio: awardee.getString('bio'),
		skills: skillsOf(awardee), openToMentoring: awardee.getBool('openToMentoring'),
		businessProfile: showBusiness ? {
			businessName: awardee.getString('businessName'), sector: awardee.getString('businessSector'),
			city: awardee.getString('businessCity') || awardee.getString('city'),
			description: awardee.getString('businessDescription'), contact: awardee.getString('businessContact'),
			employees: awardee.getInt('businessEmployees'), growthPercent: Number(awardee.get('businessGrowthPercent') || 0), products
		} : null,
		points: profile.getInt('totalPoints'), tier: profile.getString('tier'),
		streakWeeks: profile.getInt('currentStreakWeeks'), badgeCodes: badges.map((row) => row.getString('badgeCode')),
		joinedAt: awardee.getString('joinedAt')
	};
}

module.exports = { skillsOf, item };
