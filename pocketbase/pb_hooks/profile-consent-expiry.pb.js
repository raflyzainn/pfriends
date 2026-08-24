cronAdd('profile-consent-expiry', '15 * * * *', () => {
	const utils=require(`${__hooks}/awardee-profile-utils.js`),storyUtils=require(`${__hooks}/story-utils.js`);
	for(const awardee of $app.findRecordsByFilter('awardees','id != ""','',0,0)){
		const rows=utils.events($app,awardee),storyActive=Boolean(utils.effective($app,awardee,'PUBLIKASI_CERITA'));
		utils.syncProjections($app,awardee,rows);
		if(storyActive)continue;
		for(const story of $app.findRecordsByFilter('stories','author = {:awardee} && consentActive = true','',0,0,{awardee:awardee.id})){
			const before=story.getString('status');story.set('consentActive',false);story.set('consentLegacyId','');
			if(['TERPUBLIKASI','DISETUJUI'].includes(before)){story.set('status','DIARSIPKAN');story.set('archiveReason','KEDALUWARSA');story.set('archivedAt',new Date().toISOString());try{$app.delete($app.findFirstRecordByData('story_public_covers','story',story.id));}catch(_){}storyUtils.statusEvent($app,story,null,'CONSENT_EXPIRED',before,'DIARSIPKAN','KEDALUWARSA');}
			$app.save(story);
		}
	}
});
