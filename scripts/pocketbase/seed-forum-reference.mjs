import PocketBase from 'pocketbase';
import { loadLocalEnv } from './local-env.mjs';

export const FORUM_CHANNELS = Object.freeze([
	Object.freeze({ slug: 'pengumuman', name: 'pengumuman', topic: 'Kabar resmi dari tim Corporate Secretary Pertamina Foundation.', note: 'Kanal searah: balasan dibuka di #tanya-jawab supaya pengumuman tetap mudah dicari.', community: '', staffOnlyWrite: true, position: 1 }),
	Object.freeze({ slug: 'sobi-alumni', name: 'sobi-alumni', topic: 'Ruang santai alumni Beasiswa Sobat Bumi lintas angkatan dan kampus.', note: 'Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.', community: 'SOBI', staffOnlyWrite: false, position: 2 }),
	Object.freeze({ slug: 'pfpreneur', name: 'pfpreneur', topic: 'Obrolan pelaku UMKM binaan PFpreneur: pemasaran, produksi, dan permodalan.', note: 'Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.', community: 'WOMENPRENEUR', staffOnlyWrite: false, position: 3 }),
	Object.freeze({ slug: 'mangrove', name: 'mangrove', topic: 'Koordinasi aksi tanam dan perawatan mangrove tiap chapter.', note: 'Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.', community: '', staffOnlyWrite: false, position: 4 }),
	Object.freeze({ slug: 'tanya-jawab', name: 'tanya-jawab', topic: 'Tempat bertanya apa saja. Tidak ada pertanyaan yang terlalu mendasar di sini.', note: 'Sapa dulu, sisanya mengalir. Tidak ada pertanyaan yang terlalu kecil.', community: '', staffOnlyWrite: false, position: 5 })
]);

function welcomeContent(channel) {
	return `Selamat datang di #${channel.name}. Ruang ini sudah aktif dan seluruh percakapan tersimpan di PFriends.`;
}

async function optionalFirst(pb, collection, filter) {
	try { return await pb.collection(collection).getFirstListItem(filter); }
	catch (error) { if (error?.status === 404) return null; throw error; }
}

export async function seedForumReference(pb, { apply = false } = {}) {
	const result = { apply, channelsCreated: 0, channelsUpdated: 0, welcomesCreated: 0, unchanged: 0 };
	for (const definition of FORUM_CHANNELS) {
		const data = { ...definition, active: true };
		let channel = await optionalFirst(pb, 'forum_channels', pb.filter('slug = {:slug}', { slug: definition.slug }));
		if (!channel) {
			result.channelsCreated++;
			if (apply) channel = await pb.collection('forum_channels').create(data);
		} else {
			const changed = Object.entries(data).some(([key, value]) => channel[key] !== value);
			if (changed) {
				result.channelsUpdated++;
				if (apply) channel = await pb.collection('forum_channels').update(channel.id, data);
			} else result.unchanged++;
		}

		if (!channel && !apply) {
			result.welcomesCreated++;
			continue;
		}
		const content = welcomeContent(definition);
		const welcome = await optionalFirst(pb, 'forum_messages', pb.filter('channel = {:channel} && authorKind = {:kind} && content = {:content}', { channel: channel.id, kind: 'SYSTEM', content }));
		if (!welcome) {
			result.welcomesCreated++;
			if (apply) await pb.collection('forum_messages').create({ channel: channel.id, authorKind: 'SYSTEM', authorName: 'Tim PFriends', authorLabel: 'Pertamina Foundation', content, requestKey: `forum-reference:${definition.slug}:welcome-v1`, sentAt: new Date().toISOString() });
		} else result.unchanged++;
	}
	return result;
}

async function main() {
	await loadLocalEnv();
	const apply = process.argv.includes('--apply');
	const unknown = process.argv.slice(2).filter((argument) => argument !== '--apply' && argument !== '--dry-run');
	if (unknown.length) throw new Error(`Argumen tidak dikenal: ${unknown.join(', ')}`);
	const url = String(process.env.PB_URL || process.env.VITE_PB_URL || '').trim().replace(/\/$/, '');
	if (!url) throw new Error('PB_URL wajib diisi.');
	const email = process.env.PB_SUPERUSER_EMAIL;
	const password = process.env.PB_SUPERUSER_PASSWORD;
	if (!email || !password) throw new Error('PB_SUPERUSER_EMAIL dan PB_SUPERUSER_PASSWORD wajib diisi.');
	const pb = new PocketBase(url);
	pb.autoCancellation(false);
	await pb.collection('_superusers').authWithPassword(email, password);
	const result = await seedForumReference(pb, { apply });
	console.log(JSON.stringify({ target: new URL(url).origin, mode: apply ? 'APPLY' : 'DRY_RUN', ...result }, null, 2));
	if (!apply) console.log('Tidak ada data yang diubah. Jalankan kembali dengan --apply setelah target dan ringkasan diperiksa.');
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
	await main();
}
