import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();
const url=process.env.VITE_PB_URL||'http://127.0.0.1:8090',maintenance=new PocketBase(url);
maintenance.autoCancellation(false);
await maintenance.collection('_superusers').authWithPassword(process.env.PB_SUPERUSER_EMAIL,process.env.PB_SUPERUSER_PASSWORD);
const accounts=buildSeed().accounts;
async function login(role){const account=accounts.find(item=>item.role===role&&item.status==='AKTIF'),client=new PocketBase(url);await client.collection('users').authWithPassword(account.email,SANDI_DEMO);return client;}
const verifier=await login('VERIFIER'),admin=await login('ADMIN'),awardee=await login('AWARDEE');
let checks=0;function expect(value,message){if(!value)throw new Error(message);checks++;console.log(`  ✓ ${message}`);}

const snapshot=await verifier.send('/api/pfriends/verifier/dashboard');
expect(snapshot.monthly.length===7&&snapshot.monthly[0].key==='2026-01'&&snapshot.monthly[6].key==='2026-07','deret program lengkap Januari sampai Juli');
expect(snapshot.kpis.length===5&&snapshot.kpis.map(row=>row.id).join(',')==='M-01,M-02,M-03,M-04,M-05','lima KPI resmi tersedia');
expect(snapshot.monthly.every(row=>Number.isInteger(row.publishedStories)&&Number.isInteger(row.points)),'Cerita terbit dan poin bulanan berupa agregat numerik');

const adminSnapshot=await admin.send('/api/pfriends/admin/dashboard');
expect(JSON.stringify(snapshot.kpis)===JSON.stringify(adminSnapshot.kpiActuals),'nilai KPI sama dengan sumber resmi dasbor Admin');
expect(snapshot.monthly.every((row,index)=>row.publishedStories===adminSnapshot.monthly[index].publishedStories&&row.points===adminSnapshot.monthly[index].points),'deret produktivitas sama dengan agregat operasional');

const actor=verifier.authStore.record.id,filter=(field)=>maintenance.filter(`${field} = {:actor}`,{actor});
const [storyReviews,events,evidenceReviews,registrationReviews,movementDecisions,redemptions,proposals]=await Promise.all([
	maintenance.collection('story_reviews').getFullList({filter:maintenance.filter('reviewer = {:actor} && decision != "PUBLISH"',{actor})}),
	maintenance.collection('events').getFullList({filter:filter('reviewedBy')}),
	maintenance.collection('submission_reviews').getFullList({filter:filter('reviewer')}),
	maintenance.collection('registration_reviews').getFullList({filter:maintenance.filter('reviewer = {:actor} && decision != "RESUBMIT"',{actor})}),
	maintenance.collection('movement_decisions').getFullList({filter:maintenance.filter('actor = {:actor} && (decision = "REQUEST_REVISION" || decision = "APPROVE" || decision = "REJECT" || decision = "COMPLETE")',{actor})}),
	maintenance.collection('redemptions').getFullList({filter:filter('actedBy')}),
	maintenance.collection('events').getFullList({filter:filter('proposedBy')})
]);
const expected={stories:storyReviews.length,events:events.filter(row=>row.reviewedAt).length,evidence:evidenceReviews.length,registrations:registrationReviews.length,movements:movementDecisions.length,redemptions:redemptions.length,proposals:proposals.length};
expect(Object.entries(expected).every(([key,value])=>snapshot.workRecord[key]===value),'rekam kerja seluruh workflow sesuai aktor PocketBase');
expect(['decisionsThisWeek','averageResponseDays','approvalRate','decisionCount'].every(key=>Number.isFinite(snapshot.reviewPerformance[key])),'metrik laju peninjauan lengkap dan numerik');
expect(!JSON.stringify(snapshot).match(/email|whatsapp|note|evidenceFiles|mediaRefs|reviewerName/i),'DTO tidak membawa data privat atau isi keputusan');

for(const client of [admin,awardee]){let forbidden=false;try{await client.send('/api/pfriends/verifier/dashboard');}catch(error){forbidden=error.status===403;}expect(forbidden,'peran selain Verifikator ditolak');}
const repeated=await verifier.send('/api/pfriends/verifier/dashboard');
expect(repeated.totalPoints===snapshot.totalPoints&&repeated.reviewPerformance.decisionCount===snapshot.reviewPerformance.decisionCount,'pembacaan berulang stabil dan tidak mengubah data');
console.log(`\nDasbor Verifikator PocketBase: ${checks} pemeriksaan lulus.`);
