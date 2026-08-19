/**
 * REPOSITORY — Awardee Pfriends.
 *
 * Tanggung jawab: akses data penerima manfaat untuk direktori alumni, papan
 * peringkat, konsol admin, dan zona awardee ter-login.
 *
 * Perhatikan batas yang dijaga berkas ini: tabel `awardees` memuat PENERIMA MANFAAT
 * saja. Identitas login — surel, kata sandi, peran — hidup di tabel `accounts` lewat
 * `AccountRepository`. Menaruh staf Pertamina Foundation sebagai baris awardee akan
 * merusak tiga perhitungan sekaligus: penyebut cakupan KPI, penyaring papan
 * peringkat, dan distribusi tier.
 *
 * @see src/lib/domain/entities/Awardee.js — entity yang dipetakan
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.11 kontrak export AwardeeRepository
 */

import { Awardee } from '$lib/domain/entities/Awardee.js';
import { AWARDEE_STATUS } from '$lib/domain/constants/community.js';
import { TABLE } from '../db.js';
import { getPocketBase } from '../pocketbase/client.js';
import { DexieRepository } from './DexieRepository.js';

function fromPocketBase(record) {
	const womenpreneur = record.community === 'WOMENPRENEUR';
	return new Awardee({
		id: record.legacyId,
		fullName: record.fullName,
		email: record.email,
		whatsapp: record.whatsapp ?? '',
		community: record.community,
		chapterId: record.chapterId,
		status: record.status,
		points: 0,
		coins: 0,
		seasonPoints: 0,
		university: record.university ?? '',
		city: record.city ?? '',
		graduationYear: record.graduationYear || null,
		occupation: record.occupation || '',
		bio: record.bio || '',
		skills: Array.isArray(record.skills) ? record.skills : [],
		openToMentoring: Boolean(record.openToMentoring),
		businessProfile: womenpreneur
			? {
					businessName: record.businessName || '-',
					sector: record.businessSector || '-',
					city: record.businessCity || record.city || '-',
					employees: record.businessEmployees || 0,
					growthPercent: record.businessGrowthPercent || 0
				}
			: null,
		joinedAt: record.joinedAt,
		lastActiveAt: record.joinedAt,
		consentActive: true
	});
}

export class AwardeeRepository extends DexieRepository {
	constructor() {
		super({
			tableName: TABLE.AWARDEES,
			entity: Awardee,
			indexedFields: ['community', 'chapterId', 'status', 'points']
		});
	}

	async getById(id) {
		const pb = getPocketBase();
		if (pb?.authStore?.isValid && id) try {
			const record = await pb.collection('awardees').getFirstListItem(
				pb.filter('legacyId = {:id}', { id })
			);
			return fromPocketBase(record);
		} catch (error) {
			if (error?.status !== 404 && error?.status !== 403) throw error;
		}
		const local = await super.getById(id);
		if (local) return local;
		return null;
	}

	async getAll() {
		const local = await super.getAll();
		const pb = getPocketBase();
		if (!pb?.authStore?.isValid) return local;
		try {
			const remote = (await pb.collection('awardees').getFullList()).map(fromPocketBase);
			const byId = new Map(local.map((awardee) => [awardee.id, awardee]));
			for (const awardee of remote) byId.set(awardee.id, awardee);
			return [...byId.values()];
		} catch (error) {
			if (error?.status === 404) return local;
			throw error;
		}
	}

	/**
	 * Awardee berstatus aktif saja.
	 * @returns {Promise<Awardee[]>}
	 */
	async getActive() {
		return this.query({ status: AWARDEE_STATUS.AKTIF });
	}

	/**
	 * Awardee sebuah komunitas.
	 * @param {string} community Salah satu CommunityType.
	 * @returns {Promise<Awardee[]>}
	 */
	async byCommunity(community) {
		return this.query({ community });
	}

	/**
	 * Awardee sebuah chapter.
	 * @param {string} chapterId mis. 'PF11'.
	 * @returns {Promise<Awardee[]>}
	 */
	async byChapter(chapterId) {
		return this.query({ chapterId });
	}

	/**
	 * Peringkat teratas berdasarkan Poin Kontribusi.
	 *
	 * Awardee yang tidak layak tampil (ditangguhkan, dorman, belum terverifikasi)
	 * disaring di sini, bukan di komponen. Papan peringkat yang menampilkan akun
	 * ditangguhkan justru memberi panggung pada perilaku yang sedang ditindak.
	 *
	 * @param {number} [limit] Jumlah baris; 0 berarti seluruhnya.
	 * @returns {Promise<Awardee[]>}
	 */
	async topByPoints(limit = 10) {
		const awardees = (await this.getAll()).filter((awardee) => awardee.visibleOnLeaderboard);
		awardees.sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName, 'id'));
		return limit > 0 ? awardees.slice(0, limit) : awardees;
	}

	/**
	 * Pencarian bebas untuk direktori alumni: nama, kota, kampus, pekerjaan,
	 * keahlian, dan nama usaha.
	 * @param {string} keyword
	 * @returns {Promise<Awardee[]>}
	 */
	async search(keyword) {
		const kata = keyword.trim().toLowerCase();
		if (kata === '') return this.getAll();
		const awardees = await this.getAll();
		return awardees.filter((awardee) =>
			[
				awardee.fullName,
				awardee.city,
				awardee.university,
				awardee.occupation,
				awardee.businessProfile?.businessName ?? '',
				awardee.skills.join(' ')
			]
				.join(' ')
				.toLowerCase()
				.includes(kata)
		);
	}

	/**
	 * Awardee yang bersedia menjadi mentor lintas komunitas.
	 * @returns {Promise<Awardee[]>}
	 */
	async mentors() {
		const awardees = await this.getAll();
		return awardees.filter((awardee) => awardee.openToMentoring && awardee.isActive);
	}

	/**
	 * Id chapter yang punya minimal satu awardee AKTIF.
	 *
	 * Dipakai `ProgramImpactService.publicSnapshot()` sebagai pembilang "chapter
	 * aktif". Dihitung di repository, bukan di komponen, supaya definisi "aktif"
	 * hanya hidup di satu tempat: chapter tanpa satu pun awardee aktif adalah
	 * chapter yang terdaftar tetapi belum berjalan, dan menghitungnya sebagai
	 * capaian program akan melebih-lebihkan jangkauan.
	 *
	 * @returns {Promise<string[]>} Id chapter unik, terurut menaik.
	 */
	async activeChapterIds() {
		const aktif = await this.getActive();
		const chapterIds = new Set(
			aktif.map((awardee) => awardee.chapterId).filter((id) => id !== '')
		);
		return [...chapterIds].sort();
	}
}

/** Instans tunggal yang dipakai seluruh aplikasi. */
export const awardeeRepository = new AwardeeRepository();
