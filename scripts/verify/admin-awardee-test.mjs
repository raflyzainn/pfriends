import PocketBase from 'pocketbase';
import { buildSeed } from '../../src/lib/infrastructure/seed/seed-data.js';
import { SANDI_DEMO } from '../../src/lib/infrastructure/seed/accounts.js';
import { loadLocalEnv } from '../pocketbase/local-env.mjs';

await loadLocalEnv();
const url = process.env.VITE_PB_URL || 'http://127.0.0.1:8090';
const maintenance = new PocketBase(url);
await maintenance.collection('_superusers').authWithPassword(process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD);
const accounts = buildSeed().accounts;
const adminAccount = accounts.find((item) => item.role === 'ADMIN' && item.status === 'AKTIF');
const verifierAccount = accounts.find((item) => item.role === 'VERIFIER' && item.status === 'AKTIF');
const login = async (account) => { const pb = new PocketBase(url); await pb.collection('users').authWithPassword(account.email, SANDI_DEMO); return pb; };
const admin = await login(adminAccount);
const verifier = await login(verifierAccount);
let checks = 0;
const expect = (value, message) => { if (!value) throw new Error(message); checks++; };
const startedAt = new Date(Date.now() - 1000).toISOString();

const list = await admin.send('/api/pfriends/admin/awardees?perPage=10');
expect(list.items.length > 0, 'Admin dapat memuat Awardee');
expect(list.items.every((item) => item.userId && item.accountStatus && item.membershipStatus), 'DTO Awardee memuat status akun dan keanggotaan');
expect(list.stats.total >= list.items.length, 'Statistik Awardee tersedia');
const target = list.items.find((item) => item.accountStatus === 'AKTIF') || list.items[0];

let forbidden = false;
try { await verifier.send('/api/pfriends/admin/awardees'); } catch (error) { forbidden = error.status === 403; }
expect(forbidden, 'Verifikator ditolak dari endpoint Admin');

let shortReasonRejected = false;
try { await admin.send(`/api/pfriends/admin/awardees/${target.id}/account-status`, { method: 'POST', body: { status: 'TERKUNCI', reason: 'Singkat' } }); } catch (error) { shortReasonRejected = error.status === 400; }
expect(shortReasonRejected, 'Alasan perubahan status wajib memadai');

const impersonation = await admin.send(`/api/pfriends/admin/awardees/${target.id}/impersonate`, { method: 'POST' });
expect(impersonation.token && impersonation.record.role === 'AWARDEE', 'Admin memperoleh token Awardee');
const payload = JSON.parse(Buffer.from(impersonation.token.split('.')[1], 'base64url').toString('utf8'));
expect(payload.exp * 1000 - Date.now() > 29 * 60 * 1000 && payload.exp * 1000 - Date.now() <= 30 * 60 * 1000 + 5000, 'Token impersonasi dibatasi 30 menit');
const asAwardee = new PocketBase(url); asAwardee.authStore.save(impersonation.token, impersonation.record);
const ownRecord = (await asAwardee.send('/api/pfriends/session/me')).record;
expect(ownRecord.id === impersonation.record.id, 'Token impersonasi dapat membaca akun sendiri');
await asAwardee.send(`/api/pfriends/admin/impersonations/${impersonation.impersonation.id}/end`, { method: 'POST' });

const membershipTarget = target.membershipStatus === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
await admin.send(`/api/pfriends/admin/awardees/${target.id}/membership-status`, { method: 'POST', body: { status: membershipTarget, reason: 'Pengujian perubahan status keanggotaan.' } });
const afterMembership = await admin.send(`/api/pfriends/admin/awardees/${target.id}/history`);
expect(afterMembership.awardee.membershipStatus === membershipTarget, 'Status keanggotaan berubah');
await admin.send(`/api/pfriends/admin/awardees/${target.id}/membership-status`, { method: 'POST', body: { status: target.membershipStatus, reason: 'Mengembalikan status setelah pengujian.' } });

await admin.send(`/api/pfriends/admin/awardees/${target.id}/account-status`, { method: 'POST', body: { status: 'TERKUNCI', reason: 'Pengujian penguncian akses akun Awardee.' } });
const locked = await admin.send(`/api/pfriends/admin/awardees/${target.id}/history`);
expect(locked.awardee.accountStatus === 'TERKUNCI', 'Status akun berubah menjadi terkunci');
let oldTokenRejected = false;
try { await asAwardee.send('/api/pfriends/session/me'); } catch (error) { oldTokenRejected = error.status === 401 || error.status === 403; }
expect(oldTokenRejected, 'Token lama Awardee dicabut saat akun dikunci');
await admin.send(`/api/pfriends/admin/awardees/${target.id}/account-status`, { method: 'POST', body: { status: 'AKTIF', reason: 'Mengembalikan akun setelah pengujian.' } });

const history = await admin.send(`/api/pfriends/admin/awardees/${target.id}/history`);
expect(history.items.some((item) => item.action === 'IMPERSONATION_STARTED' && item.endedAt), 'Awal dan akhir impersonasi tercatat');
expect(history.items.some((item) => item.action === 'ACCOUNT_STATUS_CHANGED'), 'Perubahan akun tercatat');
expect(history.items.some((item) => item.action === 'MEMBERSHIP_STATUS_CHANGED'), 'Perubahan keanggotaan tercatat');

for (const row of await maintenance.collection('admin_awardee_actions').getFullList({ filter: maintenance.filter('awardee = {:awardee} && occurredAt >= {:started}', { awardee: target.id, started: startedAt }) })) await maintenance.collection('admin_awardee_actions').delete(row.id);
console.log(`Admin Awardee PocketBase: ${checks} pemeriksaan lulus.`);
