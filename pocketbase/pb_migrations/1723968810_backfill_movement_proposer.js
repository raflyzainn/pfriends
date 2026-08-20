migrate((app) => {
	const awardees = app.findRecordsByFilter('awardees', 'status = "AKTIF" && user != ""', 'fullName', 1, 0);
	if (!awardees.length) return;
	const fallback = awardees[0];
	for (const movement of app.findRecordsByFilter('movements', 'status = "DIUSULKAN" && proposedBy = ""', '', 0, 0)) {
		let awardee = fallback;
		if (movement.getString('leaderLegacyId')) {
			try { awardee = app.findFirstRecordByData('awardees', 'legacyId', movement.getString('leaderLegacyId')); } catch (_) {}
		}
		movement.set('proposedBy', awardee.getString('user'));
		movement.set('leaderLegacyId', awardee.getString('legacyId'));
		movement.set('leaderName', awardee.getString('fullName'));
		app.save(movement);
	}
}, (app) => {
	for (const movement of app.findRecordsByFilter('movements', 'status = "DIUSULKAN"', '', 0, 0)) {
		movement.set('proposedBy', '');
		app.save(movement);
	}
});
