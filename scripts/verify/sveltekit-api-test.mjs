import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const executable = resolve(root, 'pocketbase/pocketbase.exe');
const migrations = resolve(root, 'pocketbase/pb_migrations');
const noHooks = resolve(root, 'pocketbase/pb_no_hooks');
const vite = resolve(root, 'node_modules/vite/bin/vite.js');
const superuserEmail = 'sveltekit-api-test@example.invalid';
const superuserPassword = 'LocalOnly-SvelteKit-API-2026!';
const dataDir = await mkdtemp(resolve(tmpdir(), 'pfriends-sveltekit-api-'));
const processes = [];
let passed = 0;

function ok(condition, message) {
	if (!condition) throw new Error(message);
	passed++;
}

async function freePort() {
	return new Promise((resolvePort, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => resolvePort(address.port));
		});
	});
}

function run(command, args, env = process.env) {
	return new Promise((resolveRun, reject) => {
		const child = spawn(command, args, { cwd: root, env, windowsHide: true });
		let output = '';
		child.stdout.on('data', (chunk) => { output += chunk; });
		child.stderr.on('data', (chunk) => { output += chunk; });
		child.once('error', reject);
		child.once('exit', (code) => code === 0 ? resolveRun(output) : reject(new Error(`${basename(command)} gagal (${code}).\n${output.slice(-5000)}`)));
	});
}

function start(command, args, env) {
	const child = spawn(command, args, { cwd: root, env, windowsHide: true });
	const logs = [];
	for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => {
		logs.push(String(chunk));
		if (logs.length > 80) logs.shift();
	});
	child.logs = logs;
	processes.push(child);
	return child;
}

async function waitFor(url, process, label) {
	for (let attempt = 0; attempt < 160; attempt++) {
		if (process.exitCode !== null) throw new Error(`${label} berhenti sebelum siap.\n${process.logs.join('').slice(-5000)}`);
		try { if ((await fetch(url)).ok) return; } catch {}
		await new Promise((resolveWait) => setTimeout(resolveWait, 125));
	}
	throw new Error(`${label} tidak siap.\n${process.logs.join('').slice(-5000)}`);
}

async function request(base, path, options = {}, expected = 200) {
	const headers = new Headers(options.headers || {});
	if (options.token) headers.set('authorization', `Bearer ${options.token}`);
	let body = options.body;
	if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(body);
	}
	let response;
	for (let attempt = 0; attempt < 20; attempt++) {
		try { response = await fetch(`${base}${path}`, { ...options, headers, body }); break; }
		catch (error) {
			if (attempt === 19) throw error;
			await new Promise((resolveWait) => setTimeout(resolveWait, 200));
		}
	}
	const text = await response.text();
	let data = null;
	try { data = text ? JSON.parse(text) : null; } catch { data = text; }
	if (response.status !== expected) throw new Error(`${options.method || 'GET'} ${path}: diharapkan ${expected}, diterima ${response.status}. ${text.slice(0, 1000)}`);
	passed++;
	return data;
}

function form(values, fileField, fileName, mime = 'application/pdf') {
	const data = new FormData();
	for (const [key, value] of Object.entries(values)) data.set(key, String(value));
	if (fileField) data.append(fileField, testFile(fileName, mime));
	return data;
}

function testFile(name, mime = 'image/png') {
	const content = mime === 'application/pdf'
		? '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'
		: Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
	return new File([content], name, { type: mime });
}

function storyForm(suffix, title = `Cerita Integrasi ${suffix}`) {
	const body = Array.from({ length: 315 }, (_, index) => `kata${index + 1}`).join(' ');
	const data = form({ title, summary: 'Ringkasan cerita integrasi lokal yang lengkap.', body, location: 'Jakarta', activityDate: new Date().toISOString(), participantCount: 12, esgTags: JSON.stringify([{ pillar: 'S', sdgGoal: 4 }]), outcome: JSON.stringify({ note: 'Kegiatan menghasilkan dampak yang terukur dan terdokumentasi dengan baik.' }) });
	data.append('evidenceFiles', testFile(`bukti-cerita-${suffix}.png`));
	data.append('coverCandidate', testFile(`sampul-cerita-${suffix}.png`));
	return data;
}

function future(days, hour = 9) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + days);
	date.setUTCHours(hour, 0, 0, 0);
	return date.toISOString();
}

function movementReportForm(suffix, note = 'Laporan menghasilkan dampak terukur bagi peserta dan lingkungan komunitas setempat.') {
	return form({ activityDate: new Date().toISOString(), location: 'Jakarta', participantCount: 12, outcomeNote: note }, 'evidenceFiles', `bukti-gerakan-${suffix}.png`, 'image/png');
}

function sensitiveKeys(value, result = []) {
	if (Array.isArray(value)) for (const item of value) sensitiveKeys(item, result);
	else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
		if (['email', 'whatsapp', 'password', 'token'].includes(key)) result.push(key);
		sensitiveKeys(item, result);
	}
	return result;
}

const pbPort = await freePort(), appPort = await freePort();
const pbBase = `http://127.0.0.1:${pbPort}`, appBase = `http://127.0.0.1:${appPort}`;
const testEnv = {
	...process.env,
	PB_URL: pbBase,
	VITE_PB_URL: pbBase,
	PB_SUPERUSER_EMAIL: superuserEmail,
	PB_SUPERUSER_PASSWORD: superuserPassword,
	PB_REQUIRE_STAFF_SSO: '0',
	VITE_ENABLE_DEMO_LOGIN: '1',
	ALLOW_DEMO_SEED: '1',
	APP_ENV: 'test'
};

try {
	await run(executable, ['migrate', 'up', `--dir=${dataDir}`, `--migrationsDir=${migrations}`, `--hooksDir=${noHooks}`], testEnv);
	await run(executable, ['superuser', 'create', superuserEmail, superuserPassword, `--dir=${dataDir}`, `--migrationsDir=${migrations}`, `--hooksDir=${noHooks}`], testEnv);
	const pocketbase = start(executable, ['serve', `--http=127.0.0.1:${pbPort}`, `--dir=${dataDir}`, `--migrationsDir=${migrations}`, `--hooksDir=${noHooks}`], testEnv);
	await waitFor(`${pbBase}/api/health`, pocketbase, 'PocketBase sementara');
	const oldHook = await fetch(`${pbBase}/api/pfriends/public/impact`);
	ok(oldHook.status === 404, 'PocketBase sementara masih memuat custom pb_hooks.');
	const settingsClient = new PocketBase(pbBase);
	await settingsClient.collection('_superusers').authWithPassword(superuserEmail, superuserPassword);
	await settingsClient.settings.update({ batch: { enabled: true, maxRequests: 50, timeout: 15, maxBodySize: 64 * 1024 * 1024 } });
	await run(process.execPath, [resolve(root, 'scripts/pocketbase/seed-demo.mjs')], testEnv);

	const sveltekit = start(process.execPath, [vite, 'dev', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], testEnv);
	await waitFor(`${appBase}/masuk`, sveltekit, 'SvelteKit');

	await request(appBase, '/api/pfriends/auth/login', { method: 'POST', body: { email: 'nobody@example.invalid', password: 'wrong-password' } }, 401);
	const seed = buildSeed(), awardeeById = new Map(seed.awardees.map((row) => [row.id, row]));
	const activeAwardees = seed.accounts.filter((row) => row.role === 'AWARDEE' && row.status === 'AKTIF');
	activeAwardees.sort((a, b) => Number(awardeeById.get(b.awardeeId)?.points || 0) - Number(awardeeById.get(a.awardeeId)?.points || 0));
	const awardeeAccount = activeAwardees[0], womenAccount = activeAwardees.find((row) => awardeeById.get(row.awardeeId)?.community === 'WOMENPRENEUR'), participantAccount = activeAwardees.find((row) => row.id !== awardeeAccount.id && awardeeById.get(row.awardeeId)?.community === awardeeById.get(awardeeAccount.awardeeId)?.community), verifierAccount = seed.accounts.find((row) => row.role === 'VERIFIER' && row.status === 'AKTIF'), adminAccount = seed.accounts.find((row) => row.role === 'ADMIN' && row.status === 'AKTIF');
	ok(Boolean(awardeeAccount && womenAccount && participantAccount && verifierAccount && adminAccount), 'Aktor demo lokal tidak lengkap.');

	const login = (account) => request(appBase, '/api/pfriends/auth/login', { method: 'POST', body: { email: account.email, password: SANDI_DEMO } });
	const awardee = await login(awardeeAccount), women = await login(womenAccount), participant = await login(participantAccount), verifier = await login(verifierAccount), admin = await login(adminAccount);
	ok(awardee.record.role === 'AWARDEE' && verifier.record.role === 'VERIFIER' && admin.record.role === 'ADMIN', 'Peran hasil login demo tidak sesuai.');
	await request(appBase, '/api/pfriends/session/me', { token: awardee.token });
	await request(appBase, '/api/pfriends/admin/dashboard', { token: awardee.token }, 403);

	for (const path of ['/api/pfriends/public/stories', '/api/pfriends/public/leaderboard', '/api/pfriends/public/communities', '/api/pfriends/public/movements', '/api/pfriends/public/impact']) {
		const data = await request(appBase, path);
		ok(sensitiveKeys(data).length === 0, `${path} membocorkan field sensitif.`);
	}

	const awardeeReads = [
		'/api/pfriends/directory', '/api/pfriends/profile/me', '/api/pfriends/events', '/api/pfriends/point-actions',
		'/api/pfriends/broadcasts', '/api/pfriends/achievements', '/api/pfriends/gamification/me',
		'/api/pfriends/gamification/leaderboard', '/api/pfriends/stories/mine', '/api/pfriends/forum/channels',
		'/api/pfriends/forum/presence', '/api/pfriends/movements', '/api/pfriends/activity-submissions?mine=true',
		'/api/pfriends/point-activities', `/api/pfriends/awardees/${encodeURIComponent(awardee.record.awardeeId)}`
	];
	await Promise.all(awardeeReads.map((path) => request(appBase, path, { token: awardee.token })));

	const verifierReads = [
		'/api/pfriends/verifier/dashboard', '/api/pfriends/verifier/broadcasts', '/api/pfriends/verifier/stories',
		'/api/pfriends/movements', '/api/pfriends/activity-submissions', '/api/pfriends/activity-submissions/reviews',
		'/api/pfriends/registrations', '/api/pfriends/awardees'
	];
	await Promise.all(verifierReads.map((path) => request(appBase, path, { token: verifier.token })));
	const adminReads = [
		'/api/pfriends/admin/dashboard', '/api/pfriends/admin/awardees', '/api/pfriends/admin/broadcasts',
		'/api/pfriends/admin/redemptions', '/api/pfriends/staff/rewards', '/api/pfriends/admin/gamification/rules',
		'/api/pfriends/admin/gamification/tiers/audit', '/api/pfriends/admin/stories', '/api/pfriends/awardees',
		'/api/pfriends/registrations'
	];
	await Promise.all(adminReads.map((path) => request(appBase, path, { token: admin.token })));

	const suffix = Date.now().toString(36), applicantEmail = `sveltekit-${suffix}@example.invalid`, applicantPassword = 'ApplicantLocal2026!';
	const registrationValues = { fullName: 'Applicant SvelteKit Lokal', email: applicantEmail, whatsapp: `081${String(Date.now()).slice(-9)}`, community: 'SOBI', programPillar: 'PFprestasi', batch: 'PF10', region: 'Jakarta', university: 'Universitas Indonesia', graduationYear: '2025', consent: 'true', password: applicantPassword, passwordConfirm: applicantPassword };
	const registration = await request(appBase, '/api/pfriends/registrations', {
		method: 'POST',
		body: form(registrationValues, 'proofs', 'bukti.pdf')
	}, 201);
	ok(registration.status === 'PENDING', 'Registrasi SvelteKit tidak berstatus PENDING.');
	const applicant = await request(appBase, '/api/pfriends/auth/login', { method: 'POST', body: { email: applicantEmail, password: applicantPassword } });
	const mine = await request(appBase, '/api/pfriends/registrations/me', { token: applicant.token });
	ok(mine.registration?.id === registration.id, 'Applicant tidak dapat membaca status registrasinya.');
	const initialRegistrationReviews = await request(appBase, `/api/pfriends/registrations/${registration.id}/reviews`, { token: applicant.token });
	ok(initialRegistrationReviews.items.length === 0, 'Registrasi baru seharusnya belum memiliki keputusan Verifikator.');
	await request(appBase, `/api/pfriends/registrations/${registration.id}/reviews`, { token: awardee.token }, 403);
	await request(appBase, '/api/pfriends/profile/me', { token: applicant.token }, 403);
	await request(appBase, `/api/pfriends/registrations/${registration.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'REQUEST_CLARIFICATION', note: 'Mohon lengkapi konteks wilayah pendaftaran.' } });
	await request(appBase, '/api/pfriends/registrations/me', { method: 'PATCH', token: applicant.token, body: form({ ...registrationValues, region: 'Kota Jakarta' }) });
	const registrationReviews = await request(appBase, `/api/pfriends/registrations/${registration.id}/reviews`, { token: verifier.token });
	ok(registrationReviews.items.some((row) => row.decision === 'RESUBMIT'), 'Audit kirim ulang registrasi tidak tersedia.');
	const internalPolicies = await settingsClient.collection('consent_policies').getFullList({ filter: settingsClient.filter('consentType = {:type} && status = {:status}', { type: 'PENGOLAHAN_DATA_INTERNAL', status: 'ACTIVE' }) });
	for (const policy of internalPolicies) await settingsClient.collection('consent_policies').delete(policy.id);
	await request(appBase, `/api/pfriends/registrations/${registration.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: '' } });
	const registrationConsent = await settingsClient.collection('profile_consents').getFirstListItem(settingsClient.filter('owner = {:owner} && consentType = {:type}', { owner: applicant.record.id, type: 'PENGOLAHAN_DATA_INTERNAL' }));
	ok(registrationConsent.policyVersion === 'awardee-registration-v1' && registrationConsent.statementText.includes('verifikasi dan pengelolaan keanggotaan'), 'Approval tanpa reference policy tidak menyimpan snapshot persetujuan registrasi.');
	const member = await request(appBase, '/api/pfriends/auth/login', { method: 'POST', body: { email: applicantEmail, password: applicantPassword } });
	ok(member.record.status === 'AKTIF' && member.record.onboardingStatus === 'APPROVED', 'Applicant yang disetujui belum menjadi Awardee aktif.');
	const updatedProfile = await request(appBase, '/api/pfriends/profile/me', { method: 'PATCH', token: member.token, body: { whatsapp: registrationValues.whatsapp, city: 'Jakarta', occupation: 'Koordinator Program', bio: 'Profil yang diperbarui melalui SvelteKit API.', skills: ['Fasilitasi', 'Pelaporan'], openToMentoring: true, profileVisibility: 'DIRECTORY' } });
	ok(updatedProfile.profile?.city === 'Jakarta', 'Perubahan profil Awardee tidak tersimpan.');
	await request(appBase, '/api/pfriends/profile/consents/PUBLIKASI_NAMA/grant', { method: 'POST', token: member.token }, 201);
	await request(appBase, '/api/pfriends/profile/consents/PUBLIKASI_NAMA/revoke', { method: 'POST', token: member.token });
	await request(appBase, '/api/pfriends/profile/consents/PUBLIKASI_CERITA/grant', { method: 'POST', token: member.token }, 201);

	const product = await request(appBase, '/api/pfriends/profile/products', {
		method: 'POST', token: women.token,
		body: form({ name: `Produk ${suffix}`, category: 'Kerajinan', description: 'Produk uji integrasi lokal untuk etalase Womenpreneur.' }, 'image', `produk-${suffix}.png`, 'image/png')
	}, 201);
	const updatedProduct = await request(appBase, `/api/pfriends/profile/products/${product.id}`, { method: 'PATCH', token: women.token, body: { name: `Produk ${suffix} revisi`, category: 'Kerajinan', description: 'Deskripsi produk sudah diperbarui melalui SvelteKit API.' } });
	ok(updatedProduct.name.endsWith('revisi'), 'Perubahan produk Womenpreneur tidak tersimpan.');
	const deletedProduct = await request(appBase, `/api/pfriends/profile/products/${product.id}`, { method: 'DELETE', token: women.token });
	ok(deletedProduct.deleted === true, 'Produk Womenpreneur tidak terhapus.');

	const actions = await request(appBase, '/api/pfriends/point-actions', { token: awardee.token });
	const action = actions.actions.find((row) => row.workflow === 'EVIDENCE' && !['SESSION_ATTEND', 'SHARE_PRIVATE', 'SHARE_PUBLIC'].includes(row.code));
	ok(Boolean(action), 'Aksi berbukti umum tidak tersedia untuk pengujian.');
	const submission = await request(appBase, '/api/pfriends/activity-submissions', {
		method: 'POST', token: awardee.token,
		body: form({ actionCode: action.code, activityType: action.code, activityDate: new Date().toISOString(), title: `Bukti SvelteKit ${suffix}`, description: 'Bukti integrasi lokal untuk memvalidasi workflow SvelteKit API tanpa custom PocketBase hook.', externalUrl: 'https://example.com/sveltekit-api-test' }, 'evidenceFiles', 'bukti.png', 'image/png')
	}, 201);
	ok(submission.status === 'SUBMITTED', 'Bukti SvelteKit tidak berstatus SUBMITTED.');
	await request(appBase, `/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST', token: verifier.token });
	await request(appBase, `/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', token: verifier.token, body: { decision: 'REQUEST_REVISION', note: 'Tambahkan konteks pelaksanaan.' } });
	const revisedSubmission = await request(appBase, `/api/pfriends/activity-submissions/${submission.id}`, { method: 'PATCH', token: awardee.token, body: form({ activityDate: new Date().toISOString(), title: `Bukti SvelteKit ${suffix} revisi`, description: 'Bukti integrasi lokal yang sudah dilengkapi konteks pelaksanaan dan hasil kegiatan.', externalUrl: 'https://example.com/sveltekit-api-test-revised' }) });
	ok(revisedSubmission.status === 'SUBMITTED', 'Kirim ulang Bukti Keaktifan tidak kembali ke SUBMITTED.');
	await request(appBase, `/api/pfriends/activity-submissions/${submission.id}/start-review`, { method: 'POST', token: verifier.token });
	const reviewed = await request(appBase, `/api/pfriends/activity-submissions/${submission.id}/review`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: 'Bukti integrasi lokal sesuai.' } });
	ok(reviewed.status === 'APPROVED', 'Approval Bukti Keaktifan tidak tersimpan.');
	const gamification = await request(appBase, '/api/pfriends/gamification/me', { token: awardee.token });
	ok(gamification.ledger.some((row) => row.submission === submission.id), 'Ledger tidak mencatat bukti yang disetujui.');
	ok(gamification.profile.currentStreakDays === 1 && gamification.profile.activeToday === true && Boolean(gamification.profile.lastPointAwardedAt), 'Streak harian tidak mengikuti tanggal poin sah masuk pada WIB.');
	const submissionDetail = await request(appBase, `/api/pfriends/activity-submissions/${submission.id}`, { token: awardee.token });
	ok(submissionDetail.events.some((row) => row.eventType === 'RESUBMITTED'), 'Timeline Bukti Keaktifan tidak memuat kirim ulang.');

	const channels = await request(appBase, '/api/pfriends/forum/channels', { token: awardee.token });
	const channel = channels.items.find((row) => row.canPost);
	ok(Boolean(channel), 'Kanal Forum yang dapat ditulis tidak tersedia.');
	const realtimeStream = await fetch(`${pbBase}/api/realtime`),realtimeReader=realtimeStream.body.getReader(),realtimeDecoder=new TextDecoder();let realtimeBuffer='',realtimeClientId='';
	while(!realtimeClientId){const chunk=await realtimeReader.read();if(chunk.done)break;realtimeBuffer+=realtimeDecoder.decode(chunk.value,{stream:true});const match=realtimeBuffer.match(/id:\s*([^\r\n]+)/);if(match)realtimeClientId=match[1].trim()}
	ok(Boolean(realtimeClientId),'Koneksi SSE collection tidak menghasilkan clientId.');
	const realtimeSubscription=await fetch(`${pbBase}/api/realtime`,{method:'POST',headers:{Authorization:participant.token,'Content-Type':'application/json'},body:JSON.stringify({clientId:realtimeClientId,subscriptions:['forum_messages/*']})});
	ok(realtimeSubscription.status===204,'Subscription collection Forum ditolak oleh rules.');
	const message = await request(appBase, `/api/pfriends/forum/channels/${encodeURIComponent(channel.slug)}/messages`, { method: 'POST', token: awardee.token, body: { content: `Pesan integrasi lokal ${suffix}`, requestKey: `sveltekit-api-${suffix}` } }, 201);
	const realtimeRead=(async()=>{while(true){const chunk=await realtimeReader.read();if(chunk.done)return false;realtimeBuffer+=realtimeDecoder.decode(chunk.value,{stream:true});if(realtimeBuffer.includes(message.id))return true}})();
	const realtimeReceived=await Promise.race([realtimeRead,new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);await realtimeReader.cancel();
	ok(realtimeReceived,'Subscription collection tidak menerima pesan Forum dari SvelteKit API.');
	const forumPage = await request(appBase, `/api/pfriends/forum/channels/${encodeURIComponent(channel.slug)}/messages`, { token: awardee.token });
	ok(forumPage.items.some((row) => row.id === message.id), 'Pesan Forum baru tidak muncul pada daftar kanal.');
	const context = await request(appBase, `/api/pfriends/forum/messages/${message.id}/context`, { token: awardee.token });
	ok(context.items.some((row) => row.id === message.id), 'Konteks pesan Forum tidak memuat pesan target.');
	const emojiSource = await readFile(resolve(root, 'pocketbase/pb_hooks/forum-emoji-allowlist.js'), 'utf8');
	const emoji = JSON.parse(emojiSource.slice(emojiSource.indexOf('['), emojiSource.lastIndexOf(']') + 1))[0];
	const reaction = await request(appBase, `/api/pfriends/forum/messages/${message.id}/reaction`, { method: 'POST', token: awardee.token, body: { emoji, selected: true } });
	ok(reaction.reactions.some((row) => row.emoji === emoji && row.selected), 'Reaksi Forum tidak tersimpan.');
	await request(appBase, '/api/pfriends/forum/presence/heartbeat', { method: 'POST', token: awardee.token, body: { channel: channel.slug } }, 204);
	const forumPresence = await request(appBase, '/api/pfriends/forum/presence', { token: awardee.token });
	ok(forumPresence.items.some((row) => row.id === awardee.record.id && row.state === 'aktif'), 'Heartbeat Forum tidak muncul sebagai presence aktif.');
	await request(appBase, `/api/pfriends/forum/messages/${message.id}`, { method: 'DELETE', token: awardee.token }, 204);

	const broadcastValues = { title: `Kabar Integrasi ${suffix}`, summary: 'Ringkasan kabar integrasi lokal.', body: 'Isi kabar integrasi lokal cukup panjang untuk memvalidasi seluruh alur publikasi.', channel: 'MICROSITE', contentSource: 'PFriends', lightCta: 'Berikan tanggapan', ctaLink: 'https://example.com/kabar', audience: 'SEMUA' };
	const broadcast = await request(appBase, '/api/pfriends/admin/broadcasts', { method: 'POST', token: admin.token, body: broadcastValues }, 201);
	await request(appBase, `/api/pfriends/admin/broadcasts/${broadcast.id}`, { method: 'PATCH', token: admin.token, body: { ...broadcastValues, summary: 'Ringkasan kabar integrasi lokal yang diperbarui.' } });
	const publishedBroadcast = await request(appBase, `/api/pfriends/admin/broadcasts/${broadcast.id}/publish`, { method: 'POST', token: admin.token });
	ok(publishedBroadcast.status === 'TERKIRIM', 'Publikasi Kabar tidak mengubah status menjadi TERKIRIM.');
	await request(appBase, `/api/pfriends/broadcasts/${broadcast.id}/start`, { method: 'POST', token: awardee.token });
	const viewEngagement = await settingsClient.collection('broadcast_engagements').getFirstListItem(settingsClient.filter('broadcast = {:broadcast} && owner = {:owner} && type = "BROADCAST_VIEW"', { broadcast: broadcast.id, owner: awardee.record.id }));
	await settingsClient.collection('broadcast_engagements').update(viewEngagement.id, { startedAt: new Date(Date.now() - 16000).toISOString() });
	await request(appBase, `/api/pfriends/broadcasts/${broadcast.id}/engage`, { method: 'POST', token: awardee.token, body: { type: 'BROADCAST_VIEW', response: '', requestKey: `view-${suffix}` } });
	await request(appBase, `/api/pfriends/broadcasts/${broadcast.id}/engage`, { method: 'POST', token: awardee.token, body: { type: 'CTA_REACT', response: 'Tanggapan integrasi ini memenuhi batas karakter.', requestKey: `react-${suffix}` } });
	const disposableBroadcast = await request(appBase, '/api/pfriends/admin/broadcasts', { method: 'POST', token: admin.token, body: { ...broadcastValues, title: `Draf Hapus ${suffix}` } }, 201);
	await request(appBase, `/api/pfriends/admin/broadcasts/${disposableBroadcast.id}`, { method: 'DELETE', token: admin.token }, 204);

	const eventValues = { title: `Kegiatan Integrasi ${suffix}`, type: 'SHARING', description: 'Kegiatan integrasi lokal untuk memvalidasi usulan, persetujuan, pendaftaran, dan perubahan status.', location: 'Jakarta', isOnline: false, startsAt: future(5), endsAt: future(5, 12), quota: 25 };
	const event = await request(appBase, '/api/pfriends/events', { method: 'POST', token: member.token, body: eventValues }, 201);
	const approvedEvent = await request(appBase, `/api/pfriends/events/${event.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: '' } });
	ok(approvedEvent.status === 'TERJADWAL', 'Usulan kegiatan tidak menjadi TERJADWAL.');
	await request(appBase, `/api/pfriends/events/${event.id}`, { method: 'PATCH', token: verifier.token, body: { ...eventValues, title: `${eventValues.title} Revisi`, startsAt: future(6), endsAt: future(6, 12) } });
	await request(appBase, `/api/pfriends/events/${event.id}/register`, { method: 'POST', token: participant.token }, 201);
	await request(appBase, `/api/pfriends/events/${event.id}/transition`, { method: 'POST', token: verifier.token, body: { status: 'BERLANGSUNG', note: '' } });
	const completedEvent = await request(appBase, `/api/pfriends/events/${event.id}/transition`, { method: 'POST', token: verifier.token, body: { status: 'SELESAI', note: 'Kegiatan selesai diuji.' } });
	ok(completedEvent.status === 'SELESAI', 'Kegiatan tidak mencapai status SELESAI.');

	const rules = await request(appBase, '/api/pfriends/admin/gamification/rules', { token: admin.token });
	await request(appBase, '/api/pfriends/admin/gamification/tiers/preview', { method: 'POST', token: admin.token, body: { thresholds: rules.thresholds } });
	await request(appBase, '/api/pfriends/admin/gamification/tiers', { method: 'PUT', token: admin.token, body: { thresholds: rules.thresholds, expectedVersion: rules.version } });
	const tierAudit = await request(appBase, '/api/pfriends/admin/gamification/tiers/audit', { token: admin.token });
	ok(tierAudit.audits.length > 0, 'Audit perubahan tier tidak tersimpan.');

	const createdAction = await request(appBase, '/api/pfriends/staff/point-actions', { method: 'POST', token: admin.token, body: { label: `Aksi Lokal ${suffix}`, description: 'Aksi sementara untuk pengujian SvelteKit API.', actionClass: 'C', pillar: 'Sosial', points: 3, dailyCap: 1, status: 'ACTIVE' } }, 201);
	await request(appBase, `/api/pfriends/staff/point-actions/${createdAction.id}`, { method: 'PATCH', token: admin.token, body: { ...createdAction, description: 'Aksi sementara yang diperbarui melalui SvelteKit API.' } });
	const actionAudit = await request(appBase, `/api/pfriends/staff/point-actions/${createdAction.id}/audit`, { token: admin.token });
	ok(actionAudit.audits.some((row) => row.operation === 'UPDATE'), 'Audit perubahan aksi poin tidak tersedia.');
	const removedAction = await request(appBase, `/api/pfriends/staff/point-actions/${createdAction.id}`, { method: 'DELETE', token: admin.token });
	ok(removedAction.archived === false, 'Aksi pengujian yang belum dipakai seharusnya dihapus permanen.');

	const awardedLedger = gamification.ledger.find((row) => row.submission === submission.id && row.status === 'AWARDED');
	ok(Boolean(awardedLedger), 'Entri ledger untuk pencabutan tidak ditemukan.');
	const revoked = await request(appBase, `/api/pfriends/point-activities/${awardedLedger.id}/revoke`, { method: 'POST', token: admin.token, body: { reason: 'Pencabutan khusus pengujian integrasi lokal.' } });
	ok(revoked.status === 'REVOKED', 'Pencabutan poin tidak tersimpan.');

	const rewardValues = { name: `Hadiah Integrasi ${suffix}`, category: 'MERCHANDISE', description: 'Hadiah sementara untuk menguji penukaran secara atomik.', priceCoins: 1, minTierLevel: 'NEWCOMER', status: 'TERSEDIA', monthlyQuota: 10, requiresApproval: true, community: '', fulfillmentNote: 'Diproses hanya pada database pengujian lokal.' };
	const createdRewardResponse = await request(appBase, '/api/pfriends/staff/rewards', { method: 'POST', token: admin.token, body: rewardValues }, 201);
	const reward = createdRewardResponse.reward;
	const redemptionResponse = await request(appBase, '/api/pfriends/redemptions', { method: 'POST', token: awardee.token, body: { rewardId: reward.id, requestKey: `redemption-${suffix}` } }, 201);
	let redemption = redemptionResponse.redemption;
	for (const status of ['DISETUJUI', 'DIKIRIM', 'SELESAI']) {
		const transitioned = await request(appBase, `/api/pfriends/admin/redemptions/${redemption.id}/transition`, { method: 'POST', token: verifier.token, body: { status, note: `Transisi ${status} untuk integrasi lokal.` } });
		redemption = transitioned.redemption;
	}
	ok(redemption.status === 'SELESAI', 'Penukaran hadiah tidak mencapai status SELESAI.');
	const archivedReward = await request(appBase, `/api/pfriends/staff/rewards/${reward.id}`, { method: 'DELETE', token: admin.token });
	ok(archivedReward.archived === true, 'Hadiah yang pernah dipakai seharusnya diarsipkan.');
	const disposableRewardResponse = await request(appBase, '/api/pfriends/staff/rewards', { method: 'POST', token: admin.token, body: { ...rewardValues, name: `Hadiah Hapus ${suffix}` } }, 201);
	const disposableReward = disposableRewardResponse.reward;
	await request(appBase, `/api/pfriends/staff/rewards/${disposableReward.id}`, { method: 'PATCH', token: admin.token, body: { ...rewardValues, name: `Hadiah Hapus ${suffix} revisi` } });
	const deletedReward = await request(appBase, `/api/pfriends/staff/rewards/${disposableReward.id}`, { method: 'DELETE', token: admin.token });
	ok(deletedReward.deleted === true, 'Hadiah yang belum dipakai seharusnya dihapus permanen.');

	const story = await request(appBase, '/api/pfriends/stories/drafts', { method: 'POST', token: member.token, body: storyForm(suffix) }, 201);
	const editedStory = await request(appBase, `/api/pfriends/stories/${story.id}/draft`, { method: 'PATCH', token: member.token, body: storyForm(suffix, `Cerita Integrasi ${suffix} Revisi`) });
	ok(editedStory.status === 'DRAFT', 'Perubahan draf Cerita tidak tersimpan.');
	const submittedStory = await request(appBase, `/api/pfriends/stories/${story.id}/submit`, { method: 'POST', token: member.token });
	await request(appBase, `/api/pfriends/verifier/stories/${story.id}`, { token: verifier.token });
	await request(appBase, `/api/pfriends/verifier/stories/${story.id}/start-review`, { method: 'POST', token: verifier.token });
	await request(appBase, `/api/pfriends/verifier/stories/${story.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: '', sensitivityChecks: Array.from({ length: 21 }, (_, index) => index + 1) } });
	const publishedStory = await request(appBase, `/api/pfriends/verifier/stories/${story.id}/publish`, { method: 'POST', token: verifier.token });
	ok(publishedStory.status === 'TERPUBLIKASI', 'Cerita tidak mencapai status TERPUBLIKASI.');
	const publicStory = await request(appBase, `/api/pfriends/public/stories/${encodeURIComponent(submittedStory.slug)}`);
	ok(publicStory.id === submittedStory.legacyId && sensitiveKeys(publicStory).length === 0, 'Detail Cerita publik tidak sesuai atau membocorkan field sensitif.');
	await request(appBase, `/api/pfriends/admin/stories/${story.id}`, { token: admin.token });
	const revokedStoryConsent = await request(appBase, '/api/pfriends/stories/consent/revoke', { method: 'POST', token: member.token });
	ok(revokedStoryConsent.withdrawn >= 1, 'Pencabutan consent Cerita tidak mengarsipkan publikasi aktif.');

	await request(appBase, '/api/pfriends/profile/consents/PUBLIKASI_CERITA/grant', { method: 'POST', token: member.token }, 201);
	const archiveStory = await request(appBase, '/api/pfriends/stories/drafts', { method: 'POST', token: member.token, body: storyForm(`${suffix}-archive`, `Cerita Arsip ${suffix}`) }, 201);
	await request(appBase, `/api/pfriends/stories/${archiveStory.id}/submit`, { method: 'POST', token: member.token });
	await request(appBase, `/api/pfriends/verifier/stories/${archiveStory.id}/start-review`, { method: 'POST', token: verifier.token });
	const archivedStory = await request(appBase, `/api/pfriends/verifier/stories/${archiveStory.id}/archive`, { method: 'POST', token: verifier.token, body: { reason: 'DITOLAK' } });
	ok(archivedStory.status === 'DIARSIPKAN', 'Pengarsipan Cerita oleh Verifikator gagal.');

	const movementValues = { title: `Gerakan Integrasi ${suffix}`, category: 'EDUKASI', objective: 'Meningkatkan kapasitas peserta melalui pembelajaran kolaboratif.', description: 'Gerakan pengujian lokal ini memvalidasi alur usulan, revisi, partisipasi, laporan, dan penyelesaian.', region: 'Jakarta', startsAt: future(2), endsAt: future(10), targetParticipants: 20 };
	const movement = await request(appBase, '/api/pfriends/movements', { method: 'POST', token: member.token, body: movementValues }, 201);
	await request(appBase, `/api/pfriends/verifier/movements/${movement.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'REQUEST_REVISION', note: 'Perjelas sasaran wilayah gerakan.' } });
	await request(appBase, `/api/pfriends/movements/${movement.id}/resubmit`, { method: 'POST', token: member.token, body: { ...movementValues, region: 'Kota Jakarta' } });
	const approvedMovement = await request(appBase, `/api/pfriends/verifier/movements/${movement.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: '', esgTags: [{ pillar: 'S', sdgGoal: 4 }] } });
	ok(approvedMovement.status === 'BERJALAN', 'Gerakan tidak mencapai status BERJALAN.');
	await request(appBase, `/api/pfriends/movements/${movement.id}/join`, { method: 'POST', token: participant.token }, 201);
	const leaderReport = await request(appBase, `/api/pfriends/movements/${movement.id}/reports`, { method: 'POST', token: member.token, body: movementReportForm(suffix) }, 201);
	await request(appBase, `/api/pfriends/verifier/movement-reports/${leaderReport.id}/start-review`, { method: 'POST', token: verifier.token });
	await request(appBase, `/api/pfriends/verifier/movement-reports/${leaderReport.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'REQUEST_REVISION', note: 'Lengkapi catatan dampak kegiatan.' } });
	await request(appBase, `/api/pfriends/movement-reports/${leaderReport.id}/resubmit`, { method: 'POST', token: member.token, body: movementReportForm(`${suffix}-revisi`, 'Laporan revisi menjelaskan dampak yang terukur bagi peserta dan lingkungan komunitas secara lengkap.') });
	await request(appBase, `/api/pfriends/verifier/movement-reports/${leaderReport.id}/start-review`, { method: 'POST', token: verifier.token });
	const approvedReport = await request(appBase, `/api/pfriends/verifier/movement-reports/${leaderReport.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'APPROVE', note: '' } });
	ok(approvedReport.status === 'APPROVED', 'Laporan pemimpin Gerakan tidak disetujui.');
	const participantReport = await request(appBase, `/api/pfriends/movements/${movement.id}/action-reports`, { method: 'POST', token: participant.token, body: movementReportForm(`${suffix}-participant`) }, 201);
	await request(appBase, `/api/pfriends/verifier/movement-reports/${participantReport.id}/start-review`, { method: 'POST', token: verifier.token });
	await request(appBase, `/api/pfriends/verifier/movement-reports/${participantReport.id}/decision`, { method: 'POST', token: verifier.token, body: { decision: 'REJECT', note: 'Bukti peserta belum memenuhi kriteria.' } });
	const completedMovement = await request(appBase, `/api/pfriends/verifier/movements/${movement.id}/complete`, { method: 'POST', token: verifier.token });
	ok(completedMovement.status === 'SELESAI', 'Gerakan tidak mencapai status SELESAI.');

	const awardeeAdminList = await request(appBase, `/api/pfriends/admin/awardees?q=${encodeURIComponent(applicantEmail)}`, { token: admin.token });
	const managedAwardee = awardeeAdminList.items.find((row) => row.email === applicantEmail);
	ok(Boolean(managedAwardee), 'Awardee baru tidak muncul pada daftar Admin.');
	const impersonated = await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/impersonate`, { method: 'POST', token: admin.token });
	const impersonatedSession = await request(appBase, '/api/pfriends/session/me', { token: impersonated.token });
	ok(impersonatedSession.record.id === member.record.id, 'Token impersonasi tidak mewakili Awardee target.');
	await request(appBase, `/api/pfriends/admin/impersonations/${impersonated.impersonation.id}/end`, { method: 'POST', token: admin.token });
	await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/membership-status`, { method: 'POST', token: admin.token, body: { status: 'NONAKTIF', reason: 'Pengujian perubahan status keanggotaan lokal.' } });
	await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/membership-status`, { method: 'POST', token: admin.token, body: { status: 'AKTIF', reason: 'Pengujian pemulihan status keanggotaan lokal.' } });
	await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/account-status`, { method: 'POST', token: admin.token, body: { status: 'TERKUNCI', reason: 'Pengujian penguncian akun pada database lokal.' } });
	await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/account-status`, { method: 'POST', token: admin.token, body: { status: 'AKTIF', reason: 'Pengujian aktivasi ulang akun pada database lokal.' } });
	const awardeeHistory = await request(appBase, `/api/pfriends/admin/awardees/${managedAwardee.id}/history`, { token: admin.token });
	ok(awardeeHistory.items.some((row) => row.action === 'IMPERSONATION_STARTED') && awardeeHistory.items.some((row) => row.action === 'ACCOUNT_STATUS_CHANGED'), 'Riwayat administrasi Awardee tidak lengkap.');

	await request(appBase, '/api/pfriends/admin/jobs/publish-broadcasts', { method: 'POST', token: admin.token });
	await request(appBase, '/api/pfriends/admin/jobs/expire-profile-consents', { method: 'POST', token: admin.token });
	console.log(`SvelteKit API tanpa pb_hooks: ${passed} asersi lulus.`);
} catch (error) {
	for (const child of processes) {
		if (child.logs?.length) console.error(child.logs.join('').slice(-8000));
	}
	throw error;
} finally {
	for (const child of processes.reverse()) if (child.exitCode === null) child.kill();
	await new Promise((resolveWait) => setTimeout(resolveWait, 250));
	const safeRoot = resolve(tmpdir()), resolvedData = resolve(dataDir), relativeData = relative(safeRoot, resolvedData);
	if (!relativeData || relativeData.startsWith('..') || isAbsolute(relativeData) || !basename(resolvedData).startsWith('pfriends-sveltekit-api-')) throw new Error(`Direktori test tidak aman untuk dibersihkan: ${resolvedData}`);
	await rm(resolvedData, { recursive: true, force: true });
}
