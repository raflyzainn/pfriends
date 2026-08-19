import PocketBase from 'pocketbase';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const suffix = Date.now().toString(36);
const email = `registration-${suffix}@example.com`;
const whatsapp = `081${String(Date.now()).slice(-9)}`;
const password = 'RegistrationTest123!';
let passed = 0;

function ok(condition, message) {
	if (!condition) throw new Error(message);
	passed++;
}

function form(overrides = {}, withCredentials = true) {
	const values = {
		fullName: 'Awardee Integration Test',
		email,
		whatsapp,
		community: 'SOBI',
		programPillar: 'PFprestasi',
		batch: 'PF10',
		region: 'Jakarta',
		university: 'Universitas Indonesia',
		graduationYear: '2025',
		businessName: '',
		businessSector: '',
		businessCity: '',
		consent: 'true',
		...overrides
	};
	if (withCredentials) Object.assign(values, { password, passwordConfirm: password });
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, String(value));
	const pdf = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF';
	data.append('proofs', new Blob([pdf], { type: 'application/pdf' }), 'bukti-awardee.pdf');
	return data;
}

const guest = new PocketBase(url);
const created = await guest.send('/api/pfriends/registrations', { method: 'POST', body: form() });
ok(created.status === 'PENDING', 'Registrasi baru tidak berstatus PENDING.');

const applicant = new PocketBase(url);
let auth = await applicant.collection('users').authWithPassword(email, password);
ok(auth.record.status === 'NONAKTIF', 'Akun pending tidak dikunci dari zona Awardee.');
ok(auth.record.onboardingStatus === 'PENDING', 'Status onboarding user tidak sinkron.');

const verifier = new PocketBase(url);
await verifier.collection('users').authWithPassword('verifikator@pertaminafoundation.org', 'pfriends2026');
await verifier.send(`/api/pfriends/registrations/${created.id}/decision`, {
	method: 'POST',
	body: { decision: 'REQUEST_CLARIFICATION', note: 'Mohon unggah bukti yang lebih jelas.' }
});

auth = await applicant.collection('users').authRefresh();
ok(auth.record.onboardingStatus === 'CLARIFICATION', 'Klarifikasi tidak dipantulkan ke auth user.');
await applicant.send('/api/pfriends/registrations/me', {
	method: 'PATCH',
	body: form({ region: 'Kota Jakarta' }, false)
});
const resubmitted = await applicant.collection('awardee_registrations').getOne(created.id);
ok(resubmitted.status === 'PENDING', 'Klarifikasi tidak kembali ke antrean.');

await verifier.send(`/api/pfriends/registrations/${created.id}/decision`, {
	method: 'POST',
	body: { decision: 'APPROVE', note: '' }
});
auth = await applicant.collection('users').authRefresh();
ok(auth.record.status === 'AKTIF', 'Approval tidak mengaktifkan akun.');
ok(auth.record.onboardingStatus === 'APPROVED', 'Approval tidak menyelesaikan onboarding.');
ok(Boolean(auth.record.awardeeId), 'Approval tidak menautkan awardeeId.');
const profile = await applicant.collection('awardees').getFirstListItem(
	applicant.filter('legacyId = {:id}', { id: auth.record.awardeeId })
);
ok(profile.fullName === 'Awardee Integration Test', 'Profil Awardee hasil approval tidak ditemukan.');

const reviews = await applicant.collection('registration_reviews').getFullList({
	filter: applicant.filter('registration = {:registration}', { registration: created.id })
});
ok(reviews.some((item) => item.decision === 'RESUBMIT'), 'Audit resubmission tidak tercatat.');
ok(reviews.some((item) => item.decision === 'APPROVE'), 'Audit approval tidak tercatat.');

// Bukti yang disetujui adalah satu-satunya sumber poin operasional saat ini.
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const submission = await applicant.collection('activity_submissions').create({
	owner: applicant.authStore.record.id,
	activityType: 'SHARE_PUBLIC',
	activityDate: new Date().toISOString(),
	title: `Bukti gamifikasi ${suffix}`,
	description: 'Bukti integrasi registrasi, verifikasi, ledger, tier, badge, streak, dan leaderboard.',
	externalUrl: 'https://example.com/integration',
	evidenceFiles: [new File([tinyPng], `bukti-${suffix}.png`, { type: 'image/png' })]
});
await verifier.send(`/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST' });
await verifier.send(`/api/pfriends/activity-submissions/${submission.id}/review`, {
	method: 'POST',
	body: { decision: 'APPROVE', note: 'Bukti integrasi sesuai.' }
});

const gamification = await applicant.send('/api/pfriends/gamification/me');
ok(gamification.profile.totalPoints === 8, 'Total poin server tidak berasal dari ledger terverifikasi.');
ok(gamification.profile.tier === 'NEWCOMER', 'Tier server tidak sesuai ambang poin.');
ok(gamification.profile.currentStreakWeeks === 1, 'Streak mingguan server tidak dihitung.');
ok(gamification.ledger.some((item) => item.submission === submission.id && item.status === 'AWARDED'), 'Ledger server tidak memuat bukti yang disetujui.');
ok(gamification.badges.some((item) => item.code === 'BDG_LANGKAH_AWAL' && item.unlocked), 'Badge Langkah Awal tidak diberikan server.');

const leaderboard = await applicant.send('/api/pfriends/gamification/leaderboard?scope=global&period=all&limit=100');
ok(leaderboard.entries.some((item) => item.awardeeId === auth.record.awardeeId && item.points === 8), 'Leaderboard server tidak memuat Awardee yang baru memperoleh poin.');
const dashboard = await verifier.send('/api/pfriends/verifier/dashboard');
ok(dashboard.totalPoints >= gamification.profile.totalPoints && dashboard.registeredAwardees > 0, 'Dasbor Verifikator tidak membaca agregat gamifikasi backend.');

console.log(`Awardee registration integration: ${passed} asersi lulus.`);
