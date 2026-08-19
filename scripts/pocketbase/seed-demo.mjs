import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';

const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const email = process.env.PB_SUPERUSER_EMAIL;
const password = process.env.PB_SUPERUSER_PASSWORD;
if (!email || !password) throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');
const pb = new PocketBase(url);
await pb.collection('_superusers').authWithPassword(email, password);
const { accounts } = buildSeed();
let created = 0;
for (const account of accounts) {
	let existing = null;
	try { existing = await pb.collection('users').getFirstListItem(pb.filter('legacyAccountId = {:id}', { id: account.id })); } catch (error) { if (error?.status !== 404) throw error; }
	const data = { email: account.email, emailVisibility: false, password: SANDI_DEMO, passwordConfirm: SANDI_DEMO, legacyAccountId: account.id, awardeeId: account.awardeeId || '', role: account.role, displayName: account.displayName, unit: account.unit || '', status: account.status };
	if (existing) await pb.collection('users').update(existing.id, data);
	else { await pb.collection('users').create(data); created++; }
}
console.log(`Seed PocketBase selesai: ${created} dibuat, ${accounts.length - created} diperbarui.`);
