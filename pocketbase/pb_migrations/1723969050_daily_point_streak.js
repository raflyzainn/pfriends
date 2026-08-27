migrate((app) => {
	const profiles = app.findCollectionByNameOrId('gamification_profiles');
	profiles.fields.add(new NumberField({ name: 'currentStreakDays', min: 0, onlyInt: true }));
	profiles.fields.add(new NumberField({ name: 'longestStreakDays', min: 0, onlyInt: true }));
	profiles.fields.add(new DateField({ name: 'lastPointAwardedAt' }));
	app.save(profiles);

	const wibDay = (value) => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return null;
		const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
		return Math.floor(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) / 86400000);
	};
	const today = wibDay(new Date());
	for (const profile of app.findRecordsByFilter('gamification_profiles', 'id != ""', '', 0, 0)) {
		const entries = app.findRecordsByFilter(
			'verified_point_activities',
			'awardeeId = {:awardee} && status = "AWARDED" && points > 0',
			'awardedAt', 0, 0, { awardee: profile.getString('awardeeId') }
		);
		const days = [...new Set(entries.map((row) => wibDay(row.getString('awardedAt'))).filter((day) => day !== null && day <= today))].sort((a, b) => a - b);
		let longest = 0, run = 0, previous = null;
		for (const day of days) {
			run = previous !== null && day === previous + 1 ? run + 1 : 1;
			longest = Math.max(longest, run);
			previous = day;
		}
		let current = previous !== null && previous >= today - 1 ? 1 : 0;
		if (current) for (let index = days.length - 2; index >= 0 && days[index] === days[index + 1] - 1; index--) current++;
		profile.set('currentStreakDays', current);
		profile.set('longestStreakDays', longest);
		profile.set('lastPointAwardedAt', entries.length ? entries[entries.length - 1].getString('awardedAt') : '');
		app.save(profile);
	}
}, (app) => {
	const profiles = app.findCollectionByNameOrId('gamification_profiles');
	for (const field of ['currentStreakDays', 'longestStreakDays', 'lastPointAwardedAt']) {
		try { profiles.fields.removeByName(field); } catch (_) {}
	}
	app.save(profiles);
});
