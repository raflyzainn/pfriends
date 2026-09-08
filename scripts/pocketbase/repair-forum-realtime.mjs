import PocketBase from 'pocketbase';
import { loadLocalEnv } from './local-env.mjs';

const RULES = Object.freeze({
	forum_channels: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || community = "" || community = @request.auth.community)',
	forum_messages: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || channel.community = "" || channel.community = @request.auth.community)',
	forum_reactions: '@request.auth.id != "" && @request.auth.status = "AKTIF" && (@request.auth.role != "AWARDEE" || message.channel.community = "" || message.channel.community = @request.auth.community)',
	forum_presences: '@request.auth.id != "" && @request.auth.status = "AKTIF"'
});

async function main() {
	await loadLocalEnv();
	const apply = process.argv.includes('--apply');
	const confirmation = process.argv.find((value) => value.startsWith('--confirm='))?.slice(10) || '';
	const unknown = process.argv.slice(2).filter((value) => value !== '--apply' && value !== '--dry-run' && !value.startsWith('--confirm='));
	if (unknown.length) throw new Error(`Argumen tidak dikenal: ${unknown.join(', ')}`);
	const url = String(process.env.PB_URL || process.env.VITE_PB_URL || '').trim().replace(/\/$/, '');
	if (!url) throw new Error('PB_URL wajib diisi.');
	const target = new URL(url), email = process.env.PB_SUPERUSER_EMAIL, password = process.env.PB_SUPERUSER_PASSWORD;
	if (!email || !password) throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');
	if (apply && confirmation !== target.hostname) throw new Error(`Mode apply memerlukan --confirm=${target.hostname}.`);

	const pb = new PocketBase(url);pb.autoCancellation(false);
	await pb.collection('_superusers').authWithPassword(email, password);
	const users = await pb.collections.getOne('users'), communityField = users.fields.find((field) => field.name === 'community');
	const collections = Object.fromEntries(await Promise.all(Object.keys(RULES).map(async (name) => [name, await pb.collections.getOne(name)])));
	const awardees = await pb.collection('awardees').getFullList({ fields: 'user,community' });
	const linkedUsers = await pb.collection('users').getFullList({ fields: 'id,community' }), userById = new Map(linkedUsers.map((row) => [row.id, row]));
	const backfills = awardees.filter((row) => row.user && userById.get(row.user)?.community !== row.community);
	const ruleChanges = Object.entries(RULES).filter(([name, rule]) => collections[name].listRule !== rule || collections[name].viewRule !== rule).map(([name]) => name);
	const report = { target: target.origin, mode: apply ? 'APPLY' : 'DRY_RUN', communityFieldMissing: !communityField, usersToBackfill: backfills.length, ruleChanges };
	console.log(JSON.stringify(report, null, 2));
	if (!apply) { console.log(`Tidak ada data yang diubah. Jalankan kembali dengan --apply --confirm=${target.hostname} setelah target diperiksa.`); return; }

	if (!communityField) await pb.collections.update(users.id, { fields: [...users.fields, { name: 'community', type: 'select', maxSelect: 1, values: ['SOBI', 'WOMENPRENEUR'] }] });
	for (const row of backfills) await pb.collection('users').update(row.user, { community: row.community });
	for (const [name, rule] of Object.entries(RULES)) await pb.collections.update(collections[name].id, { listRule: rule, viewRule: rule });
	console.log(JSON.stringify({ ...report, applied: true }, null, 2));
}

await main();
