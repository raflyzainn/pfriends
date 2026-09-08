migrate((app) => {
	const users = app.findCollectionByNameOrId('users');
	const submissions = app.findCollectionByNameOrId('activity_submissions');
	const statusField = submissions.fields.getByName('status');
	statusField.values = ['SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED'];
	submissions.fields.add(new TextField({ name: 'awardeeName', required: true, max: 160 }));
	submissions.fields.add(new DateField({ name: 'reviewStartedAt' }));
	app.save(submissions);
	const reviews = app.findCollectionByNameOrId('submission_reviews');
	reviews.fields.add(new TextField({ name: 'reviewerName', required: true, max: 160 }));
	app.save(reviews);

	const events = new Collection({
		type: 'base',
		name: 'submission_status_events',
		listRule: '@request.auth.role = "VERIFIER" || submission.owner = @request.auth.id',
		viewRule: '@request.auth.role = "VERIFIER" || submission.owner = @request.auth.id',
		createRule: null,
		updateRule: null,
		deleteRule: null,
		fields: [
			{ name: 'submission', type: 'relation', required: true, maxSelect: 1, collectionId: submissions.id, cascadeDelete: true },
			{ name: 'actor', type: 'relation', maxSelect: 1, collectionId: users.id },
			{ name: 'actorName', type: 'text', required: true, max: 160 },
			{ name: 'eventType', type: 'select', required: true, maxSelect: 1, values: ['SUBMITTED','REVIEW_STARTED','REVISION_REQUESTED','RESUBMITTED','APPROVED'] },
			{ name: 'fromStatus', type: 'select', maxSelect: 1, values: ['SUBMITTED','IN_REVIEW','NEEDS_REVISION','APPROVED'] },
			{ name: 'toStatus', type: 'select', required: true, maxSelect: 1, values: ['SUBMITTED','IN_REVIEW','NEEDS_REVISION','APPROVED'] },
			{ name: 'note', type: 'text', max: 2000 },
			{ name: 'occurredAt', type: 'date', required: true }
		],
		indexes: ['CREATE INDEX idx_submission_events ON submission_status_events (submission, occurredAt)']
	});
	app.save(events);
	const reviewRecords = app.findRecordsByFilter('submission_reviews', 'id != ""', 'decidedAt', 0, 0);
	for (const review of reviewRecords) {
		let reviewerName = 'Verifikator';
		try { reviewerName = app.findRecordById('users', review.getString('reviewer')).getString('displayName') || reviewerName; } catch (_) {}
		review.set('reviewerName', reviewerName);
		app.save(review);
	}

	const records = app.findRecordsByFilter('activity_submissions', 'id != ""', 'submittedAt', 0, 0);
	for (const submission of records) {
		let ownerName = submission.getString('awardeeId');
		try { ownerName = app.findRecordById('users', submission.getString('owner')).getString('displayName') || ownerName; } catch (_) {}
		submission.set('awardeeName', ownerName);
		app.save(submission);
		const submitted = new Record(events);
		submitted.set('submission', submission.id);
		submitted.set('actor', submission.getString('owner'));
		submitted.set('actorName', ownerName);
		submitted.set('eventType', 'SUBMITTED');
		submitted.set('toStatus', 'SUBMITTED');
		submitted.set('occurredAt', submission.getString('submittedAt') || submission.getString('created'));
		app.save(submitted);

		const status = submission.getString('status');
		if (status === 'NEEDS_REVISION' || status === 'APPROVED') {
			const decision = new Record(events);
			decision.set('submission', submission.id);
			decision.set('actor', submission.getString('reviewer'));
			let reviewerName = 'Verifikator';
			try { reviewerName = app.findRecordById('users', submission.getString('reviewer')).getString('displayName') || reviewerName; } catch (_) {}
			decision.set('actorName', reviewerName);
			decision.set('eventType', status === 'APPROVED' ? 'APPROVED' : 'REVISION_REQUESTED');
			decision.set('fromStatus', 'IN_REVIEW');
			decision.set('toStatus', status);
			decision.set('note', submission.getString('reviewNote'));
			decision.set('occurredAt', submission.getString('reviewedAt') || submission.getString('updated'));
			app.save(decision);
		}
	}
}, (app) => {
	try { app.delete(app.findCollectionByNameOrId('submission_status_events')); } catch (_) {}
	const submissions = app.findCollectionByNameOrId('activity_submissions');
	const statusField = submissions.fields.getByName('status');
	statusField.values = ['SUBMITTED', 'NEEDS_REVISION', 'APPROVED'];
	try { submissions.fields.removeByName('reviewStartedAt'); } catch (_) {}
	try { submissions.fields.removeByName('awardeeName'); } catch (_) {}
	app.save(submissions);
	const reviews = app.findCollectionByNameOrId('submission_reviews');
	try { reviews.fields.removeByName('reviewerName'); } catch (_) {}
	app.save(reviews);
});
