import { readdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const hooksDir = resolve(root, 'pocketbase/pb_hooks');
const output = resolve(root, 'docs/38-MATRIKS-MIGRASI-SVELTEKIT-API.md');
const files = (await readdir(hooksDir)).filter((name) => name.endsWith('.pb.js')).sort();
const rows = [];

const completedRoutes = new Set([
	'GET /api/pfriends/public/stories',
	'GET /api/pfriends/public/stories/{slug}',
	'GET /api/pfriends/public/leaderboard',
	'GET /api/pfriends/public/communities',
	'GET /api/pfriends/public/movements',
	'GET /api/pfriends/public/impact',
	'POST /api/pfriends/registrations',
	'PATCH /api/pfriends/registrations/me',
	'POST /api/pfriends/registrations/{id}/decision',
	'GET /api/pfriends/point-actions',
	'POST /api/pfriends/staff/point-actions',
	'PATCH /api/pfriends/staff/point-actions/{id}',
	'DELETE /api/pfriends/staff/point-actions/{id}',
	'GET /api/pfriends/staff/point-actions/{id}/audit',
	'GET /api/pfriends/broadcasts',
	'POST /api/pfriends/broadcasts/{id}/start',
	'POST /api/pfriends/broadcasts/{id}/engage',
	'GET /api/pfriends/admin/broadcasts',
	'GET /api/pfriends/verifier/broadcasts',
	'POST /api/pfriends/admin/broadcasts',
	'PATCH /api/pfriends/admin/broadcasts/{id}',
	'POST /api/pfriends/admin/broadcasts/{id}/publish',
	'DELETE /api/pfriends/admin/broadcasts/{id}',
	'GET /api/pfriends/session/me'
	,'GET /api/pfriends/directory'
	,'GET /api/pfriends/profile/me'
	,'PATCH /api/pfriends/profile/me'
	,'POST /api/pfriends/profile/consents/{type}/grant'
	,'POST /api/pfriends/profile/consents/{type}/revoke'
	,'POST /api/pfriends/profile/products'
	,'PATCH /api/pfriends/profile/products/{id}'
	,'DELETE /api/pfriends/profile/products/{id}'
	,'GET /api/pfriends/events'
	,'POST /api/pfriends/events'
	,'POST /api/pfriends/events/{id}/decision'
	,'PATCH /api/pfriends/events/{id}'
	,'POST /api/pfriends/events/{id}/transition'
	,'POST /api/pfriends/events/{id}/register'
	,'GET /api/pfriends/admin/gamification/rules'
	,'POST /api/pfriends/admin/gamification/tiers/preview'
	,'PUT /api/pfriends/admin/gamification/tiers'
	,'GET /api/pfriends/admin/gamification/tiers/audit'
	,'GET /api/pfriends/achievements'
	,'POST /api/pfriends/redemptions'
	,'GET /api/pfriends/admin/redemptions'
	,'POST /api/pfriends/admin/redemptions/{id}/transition'
	,'GET /api/pfriends/staff/rewards'
	,'POST /api/pfriends/staff/rewards'
	,'PATCH /api/pfriends/staff/rewards/{id}'
	,'DELETE /api/pfriends/staff/rewards/{id}'
	,'GET /api/pfriends/gamification/me'
	,'GET /api/pfriends/gamification/leaderboard'
	,'POST /api/pfriends/point-activities/{id}/revoke'
	,'POST /api/pfriends/activity-submissions/{id}/start-review'
	,'POST /api/pfriends/activity-submissions/{id}/review'
	,'GET /api/pfriends/admin/awardees'
	,'GET /api/pfriends/admin/awardees/{id}/history'
	,'POST /api/pfriends/admin/awardees/{id}/account-status'
	,'POST /api/pfriends/admin/awardees/{id}/membership-status'
	,'POST /api/pfriends/admin/awardees/{id}/impersonate'
	,'POST /api/pfriends/admin/impersonations/{id}/end'
	,'GET /api/pfriends/admin/dashboard'
	,'GET /api/pfriends/stories/mine'
	,'POST /api/pfriends/stories/drafts'
	,'PATCH /api/pfriends/stories/{id}/draft'
	,'POST /api/pfriends/stories/{id}/submit'
	,'GET /api/pfriends/verifier/stories'
	,'GET /api/pfriends/verifier/stories/{id}'
	,'POST /api/pfriends/verifier/stories/{id}/start-review'
	,'POST /api/pfriends/verifier/stories/{id}/decision'
	,'POST /api/pfriends/verifier/stories/{id}/publish'
	,'POST /api/pfriends/verifier/stories/{id}/archive'
	,'POST /api/pfriends/stories/consent/revoke'
	,'GET /api/pfriends/admin/stories'
	,'GET /api/pfriends/admin/stories/{id}'
	,'GET /api/pfriends/forum/channels'
	,'GET /api/pfriends/forum/channels/{slug}/messages'
	,'GET /api/pfriends/forum/messages/{id}/context'
	,'POST /api/pfriends/forum/channels/{slug}/messages'
	,'POST /api/pfriends/forum/messages/{id}/reaction'
	,'DELETE /api/pfriends/forum/messages/{id}'
	,'POST /api/pfriends/forum/presence/heartbeat'
	,'GET /api/pfriends/forum/presence'
	,'GET /api/pfriends/movements'
	,'POST /api/pfriends/movements'
	,'POST /api/pfriends/movements/{id}/join'
	,'POST /api/pfriends/movements/{id}/resubmit'
	,'POST /api/pfriends/movements/{id}/reports'
	,'POST /api/pfriends/movements/{id}/action-reports'
	,'POST /api/pfriends/movement-reports/{id}/resubmit'
	,'POST /api/pfriends/verifier/movements/{id}/decision'
	,'POST /api/pfriends/verifier/movement-reports/{id}/start-review'
	,'POST /api/pfriends/verifier/movement-reports/{id}/decision'
	,'POST /api/pfriends/verifier/movements/{id}/complete'
	,'GET /api/pfriends/verifier/dashboard'
]);

const completedEvents = new Set([
	'activity-evidence.pb.js|onRecordCreateRequest',
	'activity-evidence.pb.js|onRecordUpdateRequest',
	'activity-evidence.pb.js|onRecordAfterCreateSuccess',
	'activity-evidence.pb.js|onRecordAfterUpdateSuccess',
	'admin-awardees.pb.js|onRecordAuthRequest',
	'awardee-registration.pb.js|onRecordAuthWithPasswordRequest',
	'forum.pb.js|onRealtimeSubscribeRequest',
	'server-gamification.pb.js|onRecordAfterCreateSuccess',
	'stories.pb.js|onRecordViewRequest'
]);

async function sourceFiles(directory) {
	const result = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) result.push(...await sourceFiles(path));
		else if (/\.(?:js|svelte)$/.test(entry.name)) result.push(path);
	}
	return result;
}

const featureSources = await Promise.all((await sourceFiles(resolve(root, 'src/lib/server/features'))).map((path) => readFile(path, 'utf8')));
const implementedRoutes = new Set([
	...featureSources.flatMap((source) => [...source.matchAll(/apiRoute\(\s*['"](GET|POST|PATCH|PUT|DELETE)['"]\s*,\s*['"]([^'"]+)['"]/g)].map((match) => `${match[1]} /api/pfriends${match[2]}`)),
	'GET /api/pfriends/public/stories',
	'GET /api/pfriends/public/stories/{slug}',
	'GET /api/pfriends/public/leaderboard',
	'GET /api/pfriends/public/communities',
	'GET /api/pfriends/public/movements',
	'GET /api/pfriends/public/impact',
	'POST /api/pfriends/registrations',
	'PATCH /api/pfriends/registrations/me',
	'POST /api/pfriends/registrations/{id}/decision',
	'GET /api/pfriends/session/me'
]);
const missingImplementations = [...completedRoutes].filter((route) => !implementedRoutes.has(route));
if (missingImplementations.length) throw new Error(`Route berstatus selesai tetapi implementasinya tidak ditemukan:\n${missingImplementations.join('\n')}`);

const inside = (parent, path) => { const value = relative(parent, path); return value && !value.startsWith('..') && !isAbsolute(value); };
const serverRoot = resolve(root, 'src/lib/server'), apiRoot = resolve(root, 'src/routes/api');
const browserFiles = (await sourceFiles(resolve(root, 'src'))).filter((path) => !inside(serverRoot, path) && !inside(apiRoot, path));
const browserSources = await Promise.all(browserFiles.map(async (path) => ({ path, source: await readFile(path, 'utf8') })));
const directHookCalls = browserSources.filter(({ source }) => /(?:\bpb|client\(\)|getPocketBase\(\))\.send\(\s*[`'"]\/?api\/pfriends/.test(source));
if (directHookCalls.length) throw new Error(`Frontend masih memanggil custom hook langsung:\n${directHookCalls.map(({ path }) => path).join('\n')}`);
const directCollections = browserSources.flatMap(({ path, source }) => [...source.matchAll(/\.collection\(\s*['"]([^'"]+)['"]\s*\)\.([a-zA-Z]+)/g)].map((match) => ({ path, collection: match[1], operation: match[2] })));
const allowedRealtime = new Set(['forum_messages|subscribe', 'forum_reactions|subscribe', 'forum_presences|subscribe']);
const disallowedCollections = directCollections.filter((item) => !allowedRealtime.has(`${item.collection}|${item.operation}`));
if (disallowedCollections.length) throw new Error(`Frontend masih mengakses collection langsung:\n${disallowedCollections.map((item) => `${item.path}: ${item.collection}.${item.operation}`).join('\n')}`);
const serveSource = await readFile(resolve(root, 'scripts/pocketbase/serve.mjs'), 'utf8');
if (serveSource.includes('--hooksDir=pocketbase/pb_hooks')) throw new Error('pb:serve masih mengaktifkan custom pb_hooks.');
if (completedRoutes.size !== 95) throw new Error(`Daftar endpoint selesai berubah: diharapkan 95, ditemukan ${completedRoutes.size}.`);

for (const file of files) {
	const source = await readFile(resolve(hooksDir, file), 'utf8');
	for (const match of source.matchAll(/routerAdd\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)) {
		const key = `${match[1]} ${match[2]}`;
		const status = completedRoutes.has(key) ? 'SELESAI_LOKAL' : 'BELUM';
		const risk = match[1] === 'GET' ? 'Rendah atau sedang' : source.includes('runInTransaction(') ? 'Kritis, batch wajib' : 'Sedang';
		rows.push({ file, kind: 'Endpoint', method: match[1], path: match[2], status, risk });
	}
	for (const match of source.matchAll(/(on(?:Record|Realtime)[A-Za-z]+)\s*\(/g)) {
		const key = `${file}|${match[1]}`;
		rows.push({
			file,
			kind: match[1].startsWith('onRealtime') ? 'Realtime' : 'Lifecycle',
			method: match[1],
			path: '-',
			status: completedEvents.has(key) ? 'SELESAI_LOKAL' : 'BELUM',
			risk: 'Tinggi, jalur write atau subscription langsung harus ditutup'
		});
	}
	for (const match of source.matchAll(/cronAdd\(\s*['"]([^'"]+)['"]/g)) {
		rows.push({ file, kind: 'Cron', method: 'CRON', path: match[1], status: 'BLOCKED_AUTOMATION', risk: 'Tidak ada scheduler sesuai keputusan saat ini' });
	}
}

const counts = rows.reduce((all, row) => ((all[row.status] = (all[row.status] || 0) + 1), all), {});
const lines = [
	'# Matriks Migrasi SvelteKit API',
	'',
	'Dokumen ini dibuat dari registrasi hook aktual. Status hanya boleh dinaikkan setelah endpoint, pemanggil frontend, dan verifikasi terkait selesai.',
	'',
	'## Ringkasan',
	'',
	`- Total item: ${rows.length}`,
	...Object.entries(counts).sort().map(([status, count]) => `- ${status}: ${count}`),
	'',
	'## Arti status',
	'',
	'- `BELUM`: masih bergantung pada `pb_hooks`.',
	'- `DALAM_PROSES`: fondasi atau sebagian jalur sudah dipindahkan, tetapi parity belum lengkap.',
	'- `SELESAI_LOKAL`: endpoint dan pemanggil sudah dipindahkan serta build lokal lulus.',
	'- `SELESAI_REMOTE`: local suite dan E2E remote lulus.',
	'- `BLOCKED_AUTOMATION`: membutuhkan runtime scheduler yang belum dipilih.',
	'',
	'## Daftar',
	'',
	'| No | Hook lama | Jenis | Method atau event | Path atau job | Risiko | Status |',
	'| ---: | --- | --- | --- | --- | --- | --- |',
	...rows.map((row, index) => `| ${index + 1} | \`${row.file}\` | ${row.kind} | \`${row.method}\` | \`${row.path}\` | ${row.risk} | **${row.status}** |`),
	'',
	'## Blocker aktif',
	'',
	'- Dua cron job belum otomatis karena Cloudflare Worker dan GitLab Schedule tidak dipilih.',
	'- Operasi kritis wajib membuktikan PocketBase Batch API aktif sebelum status dapat dinaikkan.',
	'- Realtime Forum memakai subscription collection PocketBase dengan API rule berbasis sesi aktif dan komunitas.',
	'- Tidak ada item yang berstatus `SELESAI_REMOTE` karena production belum diuji dari implementasi ini.',
	''
];

if (rows.length !== 106) throw new Error(`Inventaris hook berubah: diharapkan 106, ditemukan ${rows.length}.`);
await writeFile(output, lines.join('\n'), 'utf8');
console.log(`Matriks SvelteKit API: ${rows.length} item, ${counts.SELESAI_LOKAL || 0} selesai lokal.`);
