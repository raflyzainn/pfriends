function meta(app, row) {
	let reviewerName = '';
	try { reviewerName = app.findRecordById('users', row.getString('reviewer')).getString('displayName'); } catch (_) {}
	return {
		id: row.id, legacyId: row.getString('legacyId'), slug: row.getString('slug'), title: row.getString('title') || 'Draf tanpa judul',
		authorId: row.getString('authorLegacyId'), authorName: row.getString('authorName'), community: row.getString('community'), chapterId: row.getString('chapterId'),
		status: row.getString('status'), reviewerId: row.getString('reviewer'), reviewerName, revisionCount: row.getInt('revisionCount'),
		createdAt: row.getString('created') || null, draftSavedAt: row.getString('draftSavedAt') || null, submittedAt: row.getString('submittedAt') || null,
		reviewedAt: row.getString('reviewedAt') || null, publishedAt: row.getString('publishedAt') || null, archivedAt: row.getString('archivedAt') || null,
		archiveReason: row.getString('archiveReason') || null
	};
}

module.exports = { meta };
