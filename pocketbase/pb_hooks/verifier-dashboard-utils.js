const DECISIVE_MOVEMENT = ['REQUEST_REVISION','APPROVE','REJECT','COMPLETE'];

function all(app, collection, sort) { return app.findRecordsByFilter(collection, 'id != ""', sort || '', 0, 0); }
function related(app, collection, id, field) { if (!id) return ''; try { return app.findRecordById(collection,id).getString(field); } catch (_) { return ''; } }

function workingDaysBetween(startValue,endValue) {
	const startRaw=new Date(startValue),endRaw=new Date(endValue); if(Number.isNaN(startRaw.getTime())||Number.isNaN(endRaw.getTime())||endRaw<startRaw)return null;
	const offset=7*60*60*1000,start=new Date(startRaw.getTime()+offset),end=new Date(endRaw.getTime()+offset); start.setUTCHours(0,0,0,0); end.setUTCHours(0,0,0,0);
	let days=0; for(const cursor=new Date(start);cursor<end;cursor.setUTCDate(cursor.getUTCDate()+1)){const next=new Date(cursor);next.setUTCDate(next.getUTCDate()+1);if(next.getUTCDay()!==0&&next.getUTCDay()!==6)days++;} return days;
}
function weekStart(now){const offset=7*60*60*1000,local=new Date(now.getTime()+offset),day=local.getUTCDay()||7;local.setUTCDate(local.getUTCDate()-day+1);local.setUTCHours(0,0,0,0);return new Date(local.getTime()-offset);}
function action(source,at,submittedAt,positive){return{source,at,submittedAt,positive};}

function reviewData(app,auth,now){
	const actor=auth.id;
	const stories=all(app,'story_reviews','decidedAt').filter(row=>row.getString('reviewer')===actor&&row.getString('decision')!=='PUBLISH');
	const registrations=all(app,'registration_reviews','decidedAt').filter(row=>row.getString('reviewer')===actor&&row.getString('decision')!=='RESUBMIT');
	const evidence=all(app,'submission_reviews','decidedAt').filter(row=>row.getString('reviewer')===actor);
	const movements=all(app,'movement_decisions','decidedAt').filter(row=>row.getString('actor')===actor&&DECISIVE_MOVEMENT.includes(row.getString('decision')));
	const events=all(app,'events','reviewedAt').filter(row=>row.getString('reviewedBy')===actor&&row.getString('reviewedAt'));
	const redemptions=all(app,'redemptions','requestedAt').filter(row=>row.getString('actedBy')===actor);
	const actions=[];
	for(const row of stories)actions.push(action('STORY',row.getString('decidedAt'),related(app,'stories',row.getString('story'),'submittedAt'),['APPROVE','ARCHIVE'].includes(row.getString('decision'))));
	for(const row of registrations)actions.push(action('REGISTRATION',row.getString('decidedAt'),related(app,'awardee_registrations',row.getString('registration'),'submittedAt'),row.getString('decision')==='APPROVE'));
	for(const row of evidence)actions.push(action('EVIDENCE',row.getString('decidedAt'),related(app,'activity_submissions',row.getString('submission'),'submittedAt'),row.getString('decision')==='APPROVE'));
	for(const row of movements){const isReport=row.getString('kind')==='REPORT',collection=isReport?'movement_reports':'movements',relation=isReport?row.getString('report'):row.getString('movement');actions.push(action('MOVEMENT',row.getString('decidedAt'),related(app,collection,relation,'submittedAt'),['APPROVE','COMPLETE'].includes(row.getString('decision'))));}
	for(const row of events)actions.push(action('EVENT',row.getString('reviewedAt'),row.getString('submittedAt'),['TERJADWAL','SELESAI'].includes(row.getString('status'))));
	for(const row of redemptions){const at=row.getString('fulfilledAt')||row.getString('shippedAt')||row.getString('decidedAt');if(at)actions.push(action('REDEMPTION',at,row.getString('requestedAt'),row.getString('status')!=='DITOLAK'));}
	const responseDays=actions.map(row=>workingDaysBetween(row.submittedAt,row.at)).filter(value=>value!==null),positive=actions.filter(row=>row.positive).length,start=weekStart(now);
	return{decisionsThisWeek:actions.filter(row=>new Date(row.at)>=start&&new Date(row.at)<=now).length,averageResponseDays:responseDays.length?Math.round(responseDays.reduce((sum,value)=>sum+value,0)/responseDays.length*10)/10:0,approvalRate:actions.length?Math.round(positive/actions.length*100):0,decisionCount:actions.length,workRecord:{stories:stories.length,events:events.length,evidence:evidence.length,registrations:registrations.length,movements:movements.length,redemptions:redemptions.length,proposals:all(app,'events','').filter(row=>row.getString('proposedBy')===actor).length}};
}

function dashboard(app,auth){
	const gamification=require(`${__hooks}/gamification-utils.js`),official=require(`${__hooks}/admin-dashboard-utils.js`).dashboard(app),profiles=gamification.ensureAll(app),now=new Date(),cutoff=new Date(now.getTime()-90*86400000),tiers=Object.fromEntries(gamification.tiers(app).map(item=>[item.level,0])),chapter={};
	for(const item of profiles){tiers[item.profile.getString('tier')]++;const key=`${item.profile.getString('community')} · ${item.profile.getString('chapterId')}`;chapter[key]=(chapter[key]||0)+item.profile.getInt('totalPoints');}
	const ranked=profiles.filter(item=>item.profile.getInt('totalPoints')>0).sort((a,b)=>b.profile.getInt('totalPoints')-a.profile.getInt('totalPoints')||a.profile.getString('fullName').localeCompare(b.profile.getString('fullName'))),review=reviewData(app,auth,now);
	return{generatedAt:now.toISOString(),totalPoints:profiles.reduce((sum,item)=>sum+item.profile.getInt('totalPoints'),0),registeredAwardees:all(app,'awardees','').length,activeAwardees:profiles.filter(item=>item.profile.getString('lastActiveAt')&&new Date(item.profile.getString('lastActiveAt'))>=cutoff).length,monthly:official.monthly.map(row=>({key:row.monthKey,label:row.label,points:row.points,publishedStories:row.publishedStories})),kpis:official.kpiActuals,tiers:Object.entries(tiers).map(([label,value])=>({label,value})),chapter:Object.entries(chapter).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value),activeStreaks:profiles.filter(item=>item.profile.getInt('currentStreakWeeks')>0).length,badgeAwards:all(app,'awardee_badges','').filter(row=>row.getString('status')==='ACTIVE').length,leaderboard:ranked.slice(0,8).map((item,index)=>({rank:index+1,id:item.profile.getString('awardeeId'),name:item.profile.getBool('anonymousOnLeaderboard')?'Peserta anonim':item.profile.getString('fullName'),community:item.profile.getString('community'),chapter:item.profile.getString('chapterId'),points:item.profile.getInt('totalPoints')})),reviewPerformance:{decisionsThisWeek:review.decisionsThisWeek,averageResponseDays:review.averageResponseDays,approvalRate:review.approvalRate,decisionCount:review.decisionCount},workRecord:review.workRecord};
}
module.exports={dashboard,reviewData,workingDaysBetween};
