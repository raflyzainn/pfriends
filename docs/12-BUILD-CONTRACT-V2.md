# 12: BUILD CONTRACT V2 (Kontrak Build Revisi): Pfriends

> **Dokumen ini MENGIKAT dan MENGGANTIKAN `docs/09-BUILD-CONTRACT.md`** pada setiap titik yang bertentangan.
> Urutan kemenangan bila terjadi konflik:
> `00-SOURCE-BRIEF.md` (angka kanonik) → **dokumen ini** → `11-VISUAL-DIRECTION.md` → `10-REVISION-SPEC.md`
> → `09-BUILD-CONTRACT.md` → dokumen desain 01–08.
>
> **Dua batas keras atas dokumen 10 & 11: baca sebelum apa pun:**
> 1. **Penomoran paket kerja `WP-1…WP-8` pada `docs/10` §11.1 dan `docs/11` (§8, §11, §12) adalah penomoran
>    LAMA dan DICABUT.** Satu-satunya penomoran yang berlaku adalah `WP-01…WP-09` §3 dokumen ini. "WP-5" di
>    doc 11 berarti **WP-03** di sini; "WP-6" di doc 11 berarti **WP-04** di sini.
> 2. **Seluruh pernyataan kepemilikan berkas di doc 10 & doc 11 BATAL.** §1.2 dan §3 dokumen ini adalah
>    satu-satunya sumber kepemilikan berkas. Doc 11 normatif untuk **rupa, foto, tipografi, dan kontras**;
>    doc 10 normatif untuk **kebutuhan, alur, dan matriks kewenangan**: keduanya **bukan** untuk kepemilikan,
>    penamaan modul, maupun signature export. Untuk itu, §2 dokumen ini yang menang (lihat §8).
>
> Pembaca dokumen ini adalah **agen implementasi yang bekerja paralel pada satu filesystem TANPA git**.
> Tidak ada worktree, tidak ada branch, tidak ada merge. Karena itu: **kepemilikan file adalah hukum**.
> Menyentuh file milik paket lain = menghancurkan pekerjaan agen lain tanpa jejak dan tanpa pemulihan.
>
> Tanggal pengesahan: 22 Juli 2026 · Basis: 5 laporan survei (domain, infrastruktur, presentasi, delta kebutuhan, adopsi referensi, audit visual).

---

## 0. Tujuh keputusan pemilik produk (final: dilarang digugat)

| # | Keputusan | Diwujudkan oleh |
|---|---|---|
| PO-1 | Landing publik memuat: (a) dampak agregat level program, (b) blog/cerita terpublikasi, (c) kalender komunitas + daftar event, (d) gerakan bersama + profil SOBI & Womenpreneur | WP-04, WP-08, `ProgramImpactService` |
| PO-2 | **Poin, tabel skor, tier, leaderboard, badge DILARANG di zona publik.** Semua pindah ke area Awardee ter-login. Admin hanya melihat agregat | `AccessPolicy.canSeeScoring`, WP-04, `scripts/verify/public-purity.mjs` |
| PO-3 | Tiga peran AWARDEE/VERIFIER/ADMIN; rename penuh `member → awardee`; route `/awardee` `/verifikator` `/admin`; login email+kata sandi (mock) + route guard per peran | WP-01, WP-02, WP-06 |
| PO-4 | Alur konten: Awardee menulis → Verifikator meninjau → publish. Event boleh digalakkan Awardee maupun Verifikator. Panel daftar event ada di sisi halaman blog | `content-workflow.js`, `ContentReviewService`, `EventListPanel` |
| PO-5 | Dasbor statistik halaman ADMIN memakai Apache ECharts | WP-07 |
| PO-6 | Foto asli berlisensi bebas di `static/img/` + redesign editorial (grid asimetris, tipografi berkarakter, kurangi kartu seragam & gradient blur) | WP-03, WP-04 |
| PO-7 | SDLC terdokumentasi, Clean Code, OOP, JSDoc bermutu, penamaan konsisten, semua perubahan TERINTEGRASI (bukan halaman tempelan) | §5, WP-09 |

---

## 1. Prinsip kepemilikan file

### 1.1 Lima aturan yang tidak boleh dilanggar

| # | Aturan | Konsekuensi bila dilanggar |
|---|---|---|
| **KP-1** | **Satu file = satu pemilik per gelombang.** File yang tercantum di paket kerjamu adalah milikmu; file yang tidak tercantum bukan milikmu. | Dua agen menimpa file yang sama; tanpa git, versi yang kalah hilang permanen. |
| **KP-2** | **Kepemilikan bersifat ekshaustif.** File yang **tidak tercantum di paket mana pun** berstatus **BEKU**: dilarang diubah siapa pun. | Perubahan diam-diam pada file bersama merusak paket lain di tengah gelombang. |
| **KP-3** | **Butuh sesuatu dari paket lain? Impor sesuai kontrak §2 apa adanya.** Dilarang membuat versi tandingan, dilarang menyalin isinya, dilarang "sementara pakai punya sendiri dulu". | Dua sumber kebenaran; yang satu diperbaiki, yang lain tetap salah. |
| **KP-4** | **Kontrak §2 final.** Bila kontrak keliru menurutmu, **tetap ikuti** dan laporkan di ringkasan akhirmu. | Kontrak yang boleh ditawar bukan kontrak. |
| **KP-5** | **Butuh komponen baru yang hanya dipakai zonamu? Buat di `_components/` di dalam folder route milikmu** (mis. `src/routes/verifikator/_components/SlaBadge.svelte`). SvelteKit mengabaikan berkas non-`+page`/`+layout` untuk routing: pola ini sudah terbukti pada `(public)/_view-model.js`. | Perebutan `src/lib/components/index.js`. |

### 1.2 File BEKU: dilarang diubah siapa pun, sepanjang V2

| File | Alasan pembekuan |
|---|---|
| `src/routes/+layout.svelte` · `src/routes/+layout.js` | Kontrak SPA (`ssr=false`, `prerender=false`). Seluruh asumsi IndexedDB runtuh bila diubah. |
| `package.json` blok `dependencies` & `devDependencies` | **Dilarang menambah dependensi npm.** Yang tersedia: `svelte`, `@sveltejs/kit`, `tailwindcss`, `dexie`, `echarts`. Blok `scripts` hanya boleh disentuh WP-09. |
| `package-lock.json` · `.npmrc` · `jsconfig.json` · `vite.config.js` · `svelte.config.js` | Konfigurasi build sudah terbukti menghasilkan `build/` yang jalan. |
| `src/lib/domain/constants/scoring-table.js` | 9 angka poin kanonik Hal 11. Satu-satunya sumber nilai poin. |
| `src/lib/domain/constants/tier-table.js` | 4 ambang tier (25/50/100/150) + `AMBANG_FITUR_PUBLIK` Hal 12. |
| `src/lib/domain/constants/kpi-targets.js` | 5 KPI + `REACH_PARAMETERS` (koefisien jangkauan organik). |
| `src/lib/domain/constants/esg-taxonomy.js` | Taksonomi ESG/SDG + gerbang bukti. |
| `src/lib/domain/value-objects/Points.js` · `Tier.js` · `EsgTag.js` | Invarian nilai; nol rujukan `member`. |
| `src/lib/domain/policies/AntiGamingPolicy.js` | Nol rujukan identitas peran (diverifikasi). |
| `src/lib/domain/services/EsgEvidenceService.js` | Nol rujukan `member` (diverifikasi). |
| `src/lib/utils/format.js` · `src/lib/utils/date.js` | Dipakai seluruh paket; perubahan di sini berdampak ke semua halaman sekaligus. |
| `src/lib/infrastructure/seed/rng.js` | Benih determinisme `SEED = 20260529`. Menyentuhnya mengubah 60 profil + 639 aktivitas. |
| `src/lib/infrastructure/seed/names.js` | Data nama; nol rujukan peran. |
| `docs/00-SOURCE-BRIEF.md` … `docs/09-BUILD-CONTRACT.md` · `docs/10-REVISION-SPEC.md` · `docs/11-VISUAL-DIRECTION.md` · `docs/12-BUILD-CONTRACT-V2.md` | Rekaman keputusan. V2 **mengamandemen**, tidak menimpa. Dokumen baru mulai nomor 13. Doc 10 & 11 dibaca sebagai **rujukan rupa & kebutuhan**, tunduk pada §8. |
| `2026 Community Connect Initiative update as 29052026.pdf` · `docs/screenshots/**` | Bahan sumber & bukti visual sebelum-sesudah. |

**Catatan pembekuan khusus:** `src/app.css` dan `src/app.html` **DICABUT dari daftar beku `09-BUILD-CONTRACT.md:84-85`** karena PO-6 mustahil dipenuhi tanpanya. Keduanya dimiliki **WP-03 saja**, dengan daftar putih perubahan di §3.4. Di luar daftar putih itu, keduanya tetap beku.

---

## 2. Kontrak export modul BARU (FINAL: impor tanpa melihat implementasi)

> Semua signature di bawah **final**. Agen lain menulis `import { … }` terhadap nama-nama ini
> sebelum implementasinya ada. Nama salah = build merah di gerbang gelombang.

### 2.1 `src/lib/domain/constants/roles.js` [BARU · WP-01]

```js
/** Tiga peran Pfriends. Identifier Inggris (K-5); label Indonesia untuk antarmuka. */
export const UserRole = Object.freeze({ AWARDEE: 'AWARDEE', VERIFIER: 'VERIFIER', ADMIN: 'ADMIN' });

/** @typedef {{code:string, label:string, deskripsi:string, badgeColor:string, homePath:string}} UserRoleDef */
/** @type {Readonly<Record<string, UserRoleDef>>} */
export const USER_ROLE_META;   // AWARDEE→{label:'Awardee', badgeColor:'blue',  homePath:'/awardee'}
                               // VERIFIER→{label:'Verifikator', badgeColor:'amber', homePath:'/verifikator'}
                               // ADMIN→{label:'Admin PF', badgeColor:'navy',  homePath:'/admin'}

export const RolePermission = Object.freeze({
  WRITE_CONTENT:'WRITE_CONTENT', PROPOSE_EVENT:'PROPOSE_EVENT', REVIEW_CONTENT:'REVIEW_CONTENT',
  PUBLISH_CONTENT:'PUBLISH_CONTENT', VERIFY_EVIDENCE:'VERIFY_EVIDENCE', VIEW_SCORING:'VIEW_SCORING',
  VIEW_LEADERBOARD:'VIEW_LEADERBOARD', MANAGE_PROGRAM:'MANAGE_PROGRAM', EXPORT_DATA:'EXPORT_DATA'
});

/** @type {Readonly<Record<string, readonly string[]>>} */
export const ROLE_PERMISSIONS;

/** @param {string|null} role @returns {UserRoleDef|null} */
export function peranPengguna(role);
/** @param {string|null} role @param {string} permission @returns {boolean} */
export function bolehkan(role, permission);
```

Matriks kewenangan yang WAJIB dikodekan persis:

| Permission | AWARDEE | VERIFIER | ADMIN | Dasar |
|---|:--:|:--:|:--:|---|
| `WRITE_CONTENT` | ✅ | ❌ | ❌ | **Kepengarangan cerita hanya milik Awardee**: lihat catatan di bawah |
| `PROPOSE_EVENT` | ✅ | ✅ | ❌ | PO-4 (event boleh digalakkan keduanya) |
| `REVIEW_CONTENT` | ❌ | ✅ | ❌ | Larangan X-13 |
| `PUBLISH_CONTENT` | ❌ | ✅ | ❌ | US-R16 |
| `VERIFY_EVIDENCE` | ❌ | ✅ | ❌ | US-R24 |
| `VIEW_SCORING` | ✅ | ❌ | ✅ | PO-2 (Awardee lihat miliknya, Admin lihat agregat) |
| `VIEW_LEADERBOARD` | ✅ | ❌ | ❌ | US-R23 AC-3 |
| `MANAGE_PROGRAM` | ❌ | ❌ | ✅ | X-04…X-07 |
| `EXPORT_DATA` | ❌ | ❌ | ✅ | X-08 |

> **Mengapa `WRITE_CONTENT` dicabut dari VERIFIER (keputusan tercatat, mengamandemen `docs/10` C-10/C-11).**
> PO-4 memberi kewenangan bersama hanya untuk **kegiatan** ("event boleh digalakkan Awardee maupun
> Verifikator"), bukan untuk cerita. Membiarkan `WRITE_CONTENT` pada VERIFIER menghasilkan kontrak yang
> **mustahil dipenuhi**: §2.4 mewajibkan `awardeeId === null` untuk peran selain AWARDEE, sedangkan
> `Story.authorId` menunjuk `Awardee`: sehingga verifikator tidak punya identitas kepengarangan yang sah,
> dan `AccessPolicy.isSelfReview(actor.awardeeId, story.authorId)` **tidak akan pernah** bernilai `true`.
> Kontrol governance yang tidak dapat menyala bukan kontrol. Dengan pencabutan ini:
> (a) rantai PO-4 tetap utuh: Awardee menulis, Verifikator meninjau;
> (b) konflik kepentingan berpindah ke jalur yang benar-benar dapat terjadi, yaitu **kegiatan**:
> verifikator yang mengusulkan kegiatan **tidak boleh** menyetujui usulannya sendiri
> (`isSelfReview(actor.id, event.proposedBy)`), dan itulah alasan seed mewajibkan **dua** akun verifikator;
> (c) `E-04` `docs/10` §5.4 (verifikator menerbitkan kegiatannya sendiri) **DICABUT**: lihat §8.

### 2.2 `src/lib/domain/constants/content-workflow.js` [BARU · WP-01]

```js
/** @typedef {{to:string, by:readonly string[]}} Transition */
/** @type {Readonly<Record<string, readonly Transition[]>>} */
export const STORY_TRANSITIONS;
/** @type {Readonly<Record<string, readonly Transition[]>>} */
export const EVENT_TRANSITIONS;

/** SLA dalam hari kerja. Satu-satunya sumber angka SLA: dilarang literal di komponen. */
export const SLA_HARI_KERJA = Object.freeze({
  STORY_DIAJUKAN: 2, STORY_REVIEW: 3, STORY_DISETUJUI: 5, EVENT_DIUSULKAN: 2
});

export function allowedStoryTransitions(from, role);   // -> string[]
export function allowedEventTransitions(from, role);   // -> string[]
export function canTransitionStory(from, to, role);    // -> boolean
export function canTransitionEvent(from, to, role);    // -> boolean
export function isStoryTerminal(status);               // -> boolean
export function isEventTerminal(status);               // -> boolean
```

Peta transisi yang WAJIB dikodekan persis:

| Dari | Ke | Oleh | Catatan |
|---|---|---|---|
| `DRAFT` | `DIAJUKAN` | AWARDEE | gerbang `story.isSubmittable` |
| `DIAJUKAN` | `REVIEW` | VERIFIER | verifikator mengambil antrean |
| `REVIEW` | `DISETUJUI` | VERIFIER | wajib `sensitivityConfirmed` |
| `REVIEW` | `PERLU_REVISI` | VERIFIER | wajib catatan |
| `PERLU_REVISI` | `DIAJUKAN` | AWARDEE | `revisionCount += 1` |
| `DISETUJUI` | `TERPUBLIKASI` | VERIFIER | gerbang `story.isPublishable` diperiksa ULANG |
| `TERPUBLIKASI` | `DIARSIPKAN` | VERIFIER, ADMIN | takedown; wajib `archiveReason` |
| `REVIEW`, `DISETUJUI` | `DIARSIPKAN` | VERIFIER | tolak permanen |
| **Event** `DRAFT` | `DIUSULKAN` | AWARDEE, VERIFIER | PO-4 |
| **Event** `DIUSULKAN` | `TERJADWAL` | VERIFIER | = terbit ke kalender publik; **wajib** `!isSelfReview(actor.id, event.proposedBy)` |
| **Event** `DIUSULKAN` | `DITOLAK` | VERIFIER | wajib `reviewNote`; wajib bukan pengusul sendiri |
| **Event** `TERJADWAL` | `BERLANGSUNG`, `DIBATALKAN` | VERIFIER, ADMIN | `DIBATALKAN` wajib alasan (`ContentReviewService.cancelEvent`) |
| **Event** `BERLANGSUNG` | `SELESAI` | VERIFIER, ADMIN |: |

> **Model status kegiatan: SATU sumbu, `EventStatus`.** `docs/10` §5.4/§5.8 mengusulkan dua sumbu ortogonal
> (`EventReviewStatus` + `EventStatus`) berikut field `reviewStatus`, `createdById`, `createdByRole`,
> konstanta `EVENT_REVIEW_STATUS_META`, dan helper dua-argumen `kegiatanTampilPublik(reviewStatus, status)`.
> **Seluruhnya DICABUT** (§8). Yang berlaku: `EventStatus` diperluas dengan `DIUSULKAN` dan `DITOLAK`,
> keduanya **wajib** didaftarkan di `EVENT_STATUS_META` (`CommunityEvent.js:72`): konstruktor `:168`
> **melempar** untuk status yang tidak terdaftar. Gerbang publik tunggal tetap `event.isPubliclyVisible`.
> Alasan pencabutan: dua sumbu memerlukan indeks Dexie kedua, dua peta META, dan dua helper yang harus
> dijaga sinkron oleh lima paket paralel: biaya yang tidak sebanding dengan satu kasus tepi
> ("selesai tetapi pernah ditolak") yang tidak muncul di seed maupun di PO-1…PO-7.

**Konsekuensi wajib atas `isUpcoming()`.** `CommunityEvent.js:366-368` hanya mengecualikan yang dibatalkan;
dengan satu sumbu, kegiatan `DIUSULKAN` bertanggal masa depan akan **lolos** `isUpcoming()`. Karena itu
`catalog.upcomingEvents()` **wajib** diturunkan dari `catalog.publishedEvents` (yang sudah disaring
`isPubliclyVisible`), **bukan** dari daftar mentah. `isUpcoming()` sendiri **tidak diubah**: ia tetap dipakai
zona Awardee untuk menampilkan usulan miliknya sendiri pada tab "Usulan saya".

### 2.3 `src/lib/domain/value-objects/PasswordHash.js` [BARU · WP-01]

```js
/**
 * Hash kata sandi MOCK: FNV-1a 32-bit, sinkron, murni, deterministik.
 *
 * BUKAN batas keamanan. Dipakai karena `buildSeed()` sinkron dan wajib berjalan di
 * `node` polos (`npm run verify`), sedangkan `crypto.subtle` asinkron dan browser-only.
 * Ganti dengan Argon2id di sisi server pada penerapan nyata.
 */
export const HASH_PREFIX = 'fnv1a';

export class PasswordHash {
  /** @param {string} plain @param {string} [salt] Umumnya id akun. */
  static of(plain, salt = '');            // -> PasswordHash
  /** @param {string} stored Format 'fnv1a:<salt>:<hex8>'. Melempar TypeError bila salah. */
  static fromStored(stored);              // -> PasswordHash
  get value();                            // -> string 'fnv1a:<salt>:<hex8>'
  get salt();                             // -> string
  matches(plain);                         // -> boolean (sinkron)
  equals(other);                          // -> boolean
  toString(); toJSON();                   // -> this.value
}
```

### 2.4 `src/lib/domain/entities/UserAccount.js` [BARU · WP-01]

```js
export const AccountStatus = Object.freeze({ AKTIF:'AKTIF', TERKUNCI:'TERKUNCI', NONAKTIF:'NONAKTIF' });
/** @type {Readonly<Record<string,{code:string,label:string,badgeColor:string,deskripsi:string}>>} */
export const ACCOUNT_STATUS_META;

/**
 * @typedef {object} UserAccountInput
 * @property {string} id                 'USR-014' | 'PF-CORSEC-01' | 'PF-CORSEC'
 * @property {string} email              unik, disimpan lowercase-trim
 * @property {string|PasswordHash} passwordHash
 * @property {string} role               UserRole
 * @property {string|null} [awardeeId]   WAJIB terisi bila AWARDEE, WAJIB null selain itu
 * @property {string} displayName
 * @property {string} [unit]             diisi untuk VERIFIER/ADMIN
 * @property {string} [status]           AccountStatus, baku AKTIF
 * @property {Date|string} createdAt
 * @property {Date|string|null} [lastLoginAt]
 */
export class UserAccount {
  constructor(/** @type {UserAccountInput} */ input);
  get id(); get email(); get passwordHash(); get role(); get awardeeId();
  get displayName(); get unit(); get status(); get createdAt(); get lastLoginAt();
  get isAwardee(); get isVerifier(); get isAdmin(); get isActive();
  get initials(); get roleMeta(); get roleLabel(); get homePath();
  /** @param {string} permission */ can(permission);       // -> boolean
  /** @param {string} plain */      matchesPassword(plain); // -> boolean
  withChanges(changes);                                     // -> UserAccount BARU (immutable)
  toJSON();                                                 // -> baris Dexie (passwordHash sebagai string)
  static from(row);                                         // -> UserAccount
}
```

**Invarian yang WAJIB dilempar `TypeError` bila dilanggar:** `role` di luar `UserRole`; `email` kosong atau tanpa `@`; `awardeeId` kosong saat `role === AWARDEE`; `awardeeId` terisi saat `role !== AWARDEE`; `createdAt` bukan tanggal sah.

### 2.5 `src/lib/domain/entities/Awardee.js` [RENAME dari `Member.js` · WP-01]

```js
export const MAKS_TOKEN_JEDA_AMAN;        // tetap
export class Awardee { … }                // seluruh API Member dipertahankan
```

**Yang DIHAPUS dari entity:** `MemberRole` (nol importir eksternal: diverifikasi), field `role`, getter `isAdmin`, dan `role` dari `toJSON()`. Identitas login pindah seluruhnya ke `UserAccount`. **Alasan yang wajib ditulis di JSDoc berkas:** `Awardee` adalah penerima manfaat, bukan akun; menaruh staf sebagai baris `Awardee` merusak tiga perhitungan sekaligus (`KpiCalculator.#coverage`, `LeaderboardService.#visibleAwardees`, `TierResolver.distribution`).

### 2.6 `src/lib/domain/policies/AccessPolicy.js` [BARU · WP-02]

```js
export const Zone = Object.freeze({ PUBLIC:'PUBLIC', AWARDEE:'AWARDEE', VERIFIER:'VERIFIER', ADMIN:'ADMIN' });
/** Prefix jalur → zona. Pencocokan: sama persis ATAU diawali `${prefix}/`. */
export const ZONE_PREFIX = Object.freeze({ '/awardee':Zone.AWARDEE, '/verifikator':Zone.VERIFIER, '/admin':Zone.ADMIN });
/** Zona → peran yang berhak. Array kosong = terbuka untuk semua, termasuk tamu. */
export const ZONE_ROLES;

export class AccessPolicy {
  static zoneOf(pathname);                    // -> Zone
  static canEnter(role, zone);                // -> boolean  (role boleh null)
  static canAccess(role, pathname);           // -> boolean
  static homePathFor(role);                   // -> string   ('/' bila null)
  static safeNext(next, role);                // -> string   (tutup open-redirect + gelang login)
  static canSeeScoring(role);                 // -> boolean  canSeeScoring(null) === false  ← jangkar PO-2
  static canSeeLeaderboard(role);             // -> boolean
  static canReviewContent(role);              // -> boolean
  static canPublishContent(role);             // -> boolean
  static canProposeEvent(role);               // -> boolean
  static isSelfReview(actorId, authorId);     // -> boolean  (konflik kepentingan X-01)
}
```

### 2.7 `src/lib/domain/validation/Validator.js` [BARU · WP-02]

```js
/** Konvensi: HANYA `required` menolak nilai kosong. Rule lain LOLOS bila nilainya kosong. */
export class Rule {
  constructor(name, message, test);         // Object.freeze(this)
  static required(msg?); static minLength(n, msg?); static maxLength(n, msg?);
  static email(msg?); static phone(msg?); static date(msg?);
  static min(n, msg?); static max(n, msg?); static pattern(re, msg?);
  static custom(name, msg, test);
  check(value);                             // -> boolean
}
export class Validator {
  constructor(/** @type {Record<string, readonly Rule[]>} */ schema);
  validate(values);                         // -> { valid:boolean, errors:Record<string,string> }
  validateField(field, value);              // -> string ('' bila lolos)
}
export function mergeResults(...results);   // -> { valid, errors }
```

### 2.8 `src/lib/domain/services/AuthService.js` [BARU · WP-02]

```js
export const AuthFailure = Object.freeze({
  KREDENSIAL_SALAH:'KREDENSIAL_SALAH', AKUN_NONAKTIF:'AKUN_NONAKTIF', AWARDEE_HILANG:'AWARDEE_HILANG'
});
/** Pesan Bahasa Indonesia; SATU pesan untuk email & sandi salah: jangan bocorkan email terdaftar. */
export const AUTH_FAILURE_MESSAGE = Object.freeze({
  KREDENSIAL_SALAH: 'Email atau kata sandi tidak cocok.',
  AKUN_NONAKTIF:    'Akun ini sedang dinonaktifkan. Hubungi Corporate Secretary.',
  AWARDEE_HILANG:   'Data awardee untuk akun ini tidak ditemukan.'
});

export class AuthService {
  /** Repository WAJIB disuntik; TANPA nilai bawaan: default akan menyeret Dexie ke domain. */
  constructor({ accountRepo, awardeeRepo, clock = () => new Date() });
  /** @returns {Promise<{ok:boolean, account:UserAccount|null, awardee:Awardee|null, reason:string}>} */
  async login(email, password);
  async accountByEmail(email);              // -> UserAccount|null
  async awardeeOf(account);                 // -> Awardee|null
  async touchLastLogin(account);            // -> UserAccount (tersimpan)
}
```

### 2.9 `src/lib/domain/services/ContentReviewService.js` [BARU · WP-02]

```js
export const ReviewFailure = Object.freeze({
  TRANSISI_TERLARANG:'TRANSISI_TERLARANG', PERAN_TIDAK_BERWENANG:'PERAN_TIDAK_BERWENANG',
  KONFLIK_KEPENTINGAN:'KONFLIK_KEPENTINGAN', BELUM_LAYAK_KIRIM:'BELUM_LAYAK_KIRIM',
  BELUM_LAYAK_TERBIT:'BELUM_LAYAK_TERBIT', CATATAN_WAJIB:'CATATAN_WAJIB', SENSITIVITAS_BELUM_DICEK:'SENSITIVITAS_BELUM_DICEK'
});
export const REVIEW_FAILURE_MESSAGE;    // peta pesan Bahasa Indonesia

/** @typedef {{ok:boolean, entity:object|null, reason:string}} ReviewResult */
export class ContentReviewService {
  constructor({ storyRepo, eventRepo, clock = () => new Date() });

  async submitStory(story, actor);                                       // -> ReviewResult
  async startReview(story, actor);                                       // -> ReviewResult
  async approveStory(story, actor, { sensitivityConfirmed, note = '' }); // -> ReviewResult
  async requestRevision(story, actor, note);                             // -> ReviewResult
  async publishStory(story, actor);        // WAJIB memeriksa ULANG story.isPublishable
  async archiveStory(story, actor, reason);
  async proposeEvent(event, actor);
  async approveEvent(event, actor);        // DIUSULKAN → TERJADWAL + publishedAt
  async rejectEvent(event, actor, note);
  async cancelEvent(event, actor, reason); // TERJADWAL|BERLANGSUNG → DIBATALKAN; reason WAJIB
  async storyQueue();                      // -> Story[]  DIAJUKAN ∪ REVIEW, tertua dulu
  async eventQueue();                      // -> CommunityEvent[]  DIUSULKAN, tertua dulu
  /** @param {Date} pada @returns {{overdue:boolean, days:number, limit:number}} */
  static slaOf(entity, pada);
  /** Ringkasan corong & kepatuhan SLA: pemasok C-19 & C-20 (§3.5 WP-07). */
  async pipeline();                        // -> [{ stage, count, conversionFromPrev }]
  async slaCompliance();                   // -> [{ queue, withinSla, breachedSla, medianDays }]
}
```
`actor` = instans `UserAccount`. Setiap method **wajib** memeriksa berurutan: (1) `canTransition*`, (2) `AccessPolicy.isSelfReview`, (3) gerbang entity (`isSubmittable` / `isPublishable`), (4) argumen wajib (catatan/alasan). Kegagalan mengembalikan `{ok:false, entity:null, reason}`: **dilarang melempar** untuk kegagalan aturan bisnis.

**Urutan argumen dikunci: `(entity, actor, …argumenLain)` untuk SELURUH method: tanpa pengecualian.**
`docs/10` §5.9 menulis `archiveStory(story, reason, actor)` dan konstruktor ber-`idGenerator`; **keduanya
DIGANTI** oleh blok di atas (§8). Alasan penguncian: menukar dua argumen yang sama-sama "objek atau string"
**tidak melempar**: `archiveStory(story, 'takedown', account)` akan menyimpan `archiveReason` berisi
`UserAccount` dan memeriksa `isSelfReview` terhadap sebuah string. Arsip cerita rusak diam-diam, dan tidak
ada gerbang §6 yang menangkapnya.

**`pipeline()` dan `slaCompliance()` hidup di sini, bukan di service baru.** `docs/10` §7.2 mengusulkan
`EditorialMetricsService` terpisah untuk memasok C-19/C-20. Service itu **tidak dibangun**: agregasinya
sudah bertumpu pada `storyRepo`/`eventRepo` yang sudah disuntik ke kelas ini, dan menambah kelas keempat
hanya untuk dua method melanggar KP-3 (dua sumber kebenaran atas antrean yang sama). CH-8 `docs/10` §7.2
tetap terpenuhi: perhitungannya ada di lapisan domain, **bukan** di komponen Svelte.

### 2.10 `src/lib/domain/services/ProgramImpactService.js` [BARU · WP-02]

```js
/**
 * @typedef {object} PublicImpactSnapshot
 * @property {Date}   capturedAt
 * @property {number} registeredAwardees   Awardee AKTIF ber-consent aktif
 * @property {number} activeChapters       chapter dengan ≥1 awardee aktif
 * @property {number} totalChapters
 * @property {number} publishedStories
 * @property {number} completedEvents      countsForEngagementKpi === true saja
 * @property {number} upcomingEvents
 * @property {number} runningMovements
 * @property {number} recordedActions      cacah PointActivity: TANPA nilai poinnya
 * @property {number} amplifiersThisMonth
 * @property {{min:number, max:number, basis:number}} organicReach  kelas B: WAJIB rentang
 * @property {{value:number|null, source:string}} beneficiaryRegistry
 *           Penyebut populasi untuk `context` ImpactFigure/DataBand. `value` HANYA boleh berasal
 *           dari `kpi-targets.js` atau injeksi `#registrySize` (`KpiCalculator.js:186`).
 *           Bila `null`, komponen WAJIB memakai periode ("per 22 Juli 2026") sebagai konteks :
 *           DILARANG mengarang penyebut. Lihat §5.3 A-2.
 */
export class ProgramImpactService {
  constructor({ awardeeRepo, activityRepo, movementRepo, storyRepo, eventRepo, clock = () => new Date() });
  async publicSnapshot();   // -> PublicImpactSnapshot
}
```
**Kontrak keras:** tipe kembalian **tidak boleh** memuat satu pun field poin/tier/peringkat/rupiah. Zona publik karenanya tidak dapat membocorkannya secara struktural, bukan karena kesepakatan.

### 2.11 Infrastruktur [WP-01]

```js
// src/lib/infrastructure/db.js  [UBAH]
export const DB_NAME = 'PfriendsDB';
export const DB_VERSION = 2;                       // NAIK: nama tabel berubah
export const TABLE = Object.freeze({
  AWARDEES:'awardees',  ACCOUNTS:'accounts',       // AWARDEES eks 'members'; ACCOUNTS baru
  ACTIVITIES:'activities', STORIES:'stories', EVENTS:'events', MOVEMENTS:'movements',
  BROADCASTS:'broadcasts', REWARDS:'rewards', BADGES:'badges', CONSENTS:'consents',
  REDEMPTIONS:'redemptions', META:'meta'
});
export async function getDb();          // WAJIB `await instance.open()` DI DALAM try: lihat R-03
export async function getMeta(key); export async function setMeta(key, value);
export async function clearAllTables();
```

**Bentuk `getDb()` yang WAJIB** (kode hari ini `db.js:93-102` **tidak** memanggil `open()`, sehingga Dexie
membuka basis data secara malas pada operasi tabel pertama: di luar `try` mana pun, dan mitigasi R-03
menjadi inert):

```js
pending = (async () => {
  const Dexie = (await import('dexie')).default;
  let instance = bangunInstans(Dexie);            // new Dexie + .version(1)/.version(2)
  try {
    await instance.open();                        // ← tanpa baris ini, catch di bawah tidak pernah menyala
  } catch (e) {
    if (!/VersionError|UpgradeError|DatabaseClosedError/.test(e?.name ?? '')) throw e;
    await Dexie.delete(DB_NAME);                  // data 100% demo; dapat dibangkitkan ulang
    instance = bangunInstans(Dexie);
    await instance.open();
  }
  db = instance;
  return instance;
})().finally(() => { pending = null; });          // R-04: JANGAN hanya di jalur sukses
```

`SCHEMA_V1` **tidak boleh disunting**: di dalamnya `[TABLE.MEMBERS]` diganti literal `'members'` disertai komentar bahwa v1 adalah rekaman sejarah. **Empat string indeks di dalam `SCHEMA_V1` tetap memuat `memberId`** (`db.js:60, :62, :68, :69`); keduanya dilindungi R-02 dan **dikecualikan** dari gerbang §3.1(d) butir 2. Tambahkan **append**:

```js
const SCHEMA_V2 = Object.freeze({
  awardees:    'id, community, chapterId, status, points, joinedAt',
  accounts:    'id, &email, role, awardeeId, status',      // &email = indeks unik
  activities:  'id, awardeeId, activityType, status, occurredAt, idempotencyKey',
  stories:     'id, slug, authorId, reviewerId, status, community, publishedAt',
  events:      'id, slug, type, status, chapterId, startsAt, proposedBy',
  consents:    'id, awardeeId, consentType, status',
  redemptions: 'id, awardeeId, rewardId, status, requestedAt',
  members:     null                                        // hapus tabel lama
});
instance.version(1).stores(SCHEMA_V1);
instance.version(2).stores(SCHEMA_V2);
```

```js
// src/lib/infrastructure/repositories/AwardeeRepository.js  [RENAME dari MemberRepository.js]
export class AwardeeRepository extends DexieRepository {
  async getActive(); async byCommunity(c); async byChapter(id);
  async topByPoints(limit = 10); async search(q); async mentors();
  async activeChapterIds();      // BARU: dipakai ProgramImpactService
}
export const awardeeRepository = new AwardeeRepository();

// src/lib/infrastructure/repositories/AccountRepository.js  [BARU]
export class AccountRepository extends DexieRepository {
  async byEmail(email);          // -> UserAccount|null (email di-normalisasi lowercase-trim)
  async byAwardeeId(awardeeId);  // -> UserAccount|null
  async byRole(role);            // -> UserAccount[]
  /** Kredensial demo untuk panel bantuan /masuk: TANPA hash, TANPA kata sandi. */
  async demoAccounts();          // -> {email:string, roleLabel:string, displayName:string, hint:string}[]
}
export const accountRepository = new AccountRepository();

// src/lib/infrastructure/repositories/index.js  [UBAH]: tambah dua baris:
export { AwardeeRepository, awardeeRepository } from './AwardeeRepository.js';
export { AccountRepository, accountRepository } from './AccountRepository.js';

// src/lib/infrastructure/seed/accounts.js  [BARU]
export const SANDI_DEMO = 'pfriends2026';         // konstanta literal, bukan hasil rng
export const ID_VERIFIKATOR_UTAMA = 'PF-CORSEC-01';   // sama dengan validatorId di 14 cerita seed
export const ID_ADMIN = 'PF-CORSEC';
/** Pemetaan MURNI dari awardee → baris akun. NOL pemanggilan rng. Dipanggil PALING AKHIR. */
export function bangkitkanAkun(awardees);         // -> AccountRow[]  (63 baris: 60+2+1)
export function akunSorotan(awardees);            // -> {email, awardeeId} deterministik untuk panel demo

// src/lib/infrastructure/seed/bootstrap.js  [UBAH]
export const SEED_VERSION = 2;                    // NAIK SERENTAK dengan DB_VERSION
```

`SeedBundle` bertambah kunci `accounts`; `PEMETAAN` bertambah `{ table: TABLE.ACCOUNTS, key: 'accounts' }` dan `MEMBERS` menjadi `AWARDEES`; `seedStats` bertambah `accounts`.

### 2.12 Store [WP-02]

```js
// src/lib/stores/session.svelte.js  [TULIS ULANG]
export const session;
//  state   : role, account, awardee, user, ready, loading, error
//  derived : isAuthenticated, isAwardee, isVerifier, isAdmin, displayName, roleLabel
//  getter  : awardeeId, accountId
export async function …  // metode instans:
//  await session.login(email, password)   -> { success:boolean, error:string }   (set ready=true)
//    WAJIB `await bootstrapDatabase()` sebagai LANGKAH PERTAMA, sebelum menyentuh AuthService.
//    Perakitan ada di store, bukan di AuthService (D-1/D-3: domain dilarang mengimpor bootstrap.js).
//    Tanpa ini, peramban ber-IndexedDB kosong yang membuka /masuk langsung akan menemukan tabel
//    `accounts` kosong -> KREDENSIAL_SALAH untuk kredensial demo yang benar. Satu-satunya pemicu
//    bootstrap di zona publik hari ini adalah $effect di (public)/+layout.svelte:47-49: itu
//    BALAPAN, bukan jaminan.
//  session.logout()                       -> void   (ready TETAP true)
//  session.homePath()                     -> string
//  session.canAccess(pathname)            -> boolean (DELEGASI ke AccessPolicy: dilarang menyalin logika)
//  session.nextAfterLogin(next)           -> string
//  await session.hydrate()                -> idempoten; dipanggil ZoneGuard
//  await session.refresh()                -> memuat ulang entity Awardee
```
**DIHAPUS (breaking):** `SessionRole`, `PROFIL_ADMIN`, `loginAsMember`, `loginAsAdmin`, `isMember`, `session.member`. Pengganti: `UserRole` dari domain, `session.awardee`, `session.account`.

**`session.hydrated` TIDAK ADA.** `docs/10` §3.6 mengusulkan dua flag (`ready` dari localStorage +
`hydrated` dari Dexie). **Ditolak** (§8): satu flag `ready` + `loading` sudah cukup, dan flag kedua yang
tidak pernah didefinisikan akan membuat `{#if session.hydrated}` selalu `undefined` → falsy → halaman
Awardee/Verifikator **tidak pernah merender isinya, tanpa satu pun error**: lolos `verify:compile` dan
`npm run build` sekaligus. Halaman yang membutuhkan entity memakai `session.awardee !== null`.

```js
// src/lib/stores/catalog.svelte.js  [UBAH]
catalog.awardees                 // eks catalog.members
catalog.publishedStories         // tetap
catalog.publishedEvents          // BARU: derived, saring event.isPubliclyVisible
catalog.upcomingEvents(pada = new Date(), limit = 0)   // BARU: urut menaik; limit 0 = semua
                                 // WAJIB diturunkan dari catalog.publishedEvents, BUKAN dari daftar
                                 // mentah: isUpcoming() tidak mengecualikan DIUSULKAN (R-09).
catalog.storiesByAwardee(id)     // eks storiesByMember
catalog.awardeesByCommunity(c)   // eks membersByCommunity

// src/lib/stores/editorial.svelte.js  [BARU]
export const editorial;
//  state   : storyQueue, eventQueue, myStories, myEvents, loading, working, error
//  derived : reviewQueueCount, storyOverdueCount, eventOverdueCount, pipeline
//  metode  : await load(), await refresh(),
//            await submitStory(story), await startReview(story), await approve(story, opsi),
//            await requestRevision(story, note), await publish(story), await archive(story, reason),
//            await proposeEvent(input), await approveEvent(event), await rejectEvent(event, note)
//  Setiap metode mengembalikan { ok, reason } dan memicu toast; store TIDAK memutuskan legalitas transisi.

// src/lib/stores/impact.svelte.js  [BARU]
export const impact;
//  state   : snapshot (PublicImpactSnapshot|null), loading, loaded, error
//  metode  : await load(), await refresh()
//  Satu-satunya jalan zona publik memperoleh angka. Zona publik DILARANG mengimpor repository.
```

### 2.13 Presentasi [WP-02 & WP-03]

```js
// src/lib/data/navigation.js  [BARU · WP-02]
/** @typedef {{id:string,label:string,href:string,iconPath:string,primary?:boolean,badgeKey?:string}} NavItem */
export const NAV_BY_ZONE;                    // Readonly<Record<Zone, readonly NavItem[]>>
export function navForZone(zone);            // -> NavItem[] (salinan baru)
export function primaryNavForZone(zone);     // -> NavItem[] maksimum 5 (BottomNav)
export function withBadges(items, counts);   // -> NavItem[] dengan field `badge:number`
export function isNavActive(href, pathname, { exact = false });  // -> boolean
```
Berkas ini berisi **DATA, bukan keputusan**: ia tidak tahu siapa yang masuk. Penjagaan akses tetap di `AccessPolicy` + `ZoneGuard`.

```svelte
<!-- src/lib/components/ZoneGuard.svelte  [BARU · WP-02] -->
props: { zone: string, label?: string, children: Snippet }
```
Tiga keadaan, tiga perlakuan: (1) `!session.ready` → splash, **tidak** mengalihkan, **tidak** merender children; (2) tamu → `goto('/masuk?next=…', {replaceState:true})`; (3) masuk tapi zona keliru → **panel penjelasan**, bukan pengalihan senyap.

**Dua atribut data WAJIB**: dipakai `e2e-routes.mjs` sebagai satu-satunya detektor "terlempar keluar"
(§6.2). Atribut, bukan teks, supaya deteksi tidak ikut basi ketika copy berubah:
`data-zone-splash` pada elemen akar splash (keadaan 1) · `data-zone-denied` pada elemen akar panel
penolakan (keadaan 3).

#### Tipe lintas paket (typedef FINAL: WP-03 mengimplementasikan, WP-04/05/06/08 mengonsumsi)

Tanpa definisi ini, empat paket harus menebak bentuk objek yang sama dan akan menulis dua pemeta yang
berbeda: pelanggaran KP-3 oleh kontrak itu sendiri. Pemetanya berkas **milik WP-03**:

```js
// src/lib/components/editorial/view-model.js  [BARU · WP-03]
/**
 * @typedef {object} EventCardVM
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {Date}   startsAt
 * @property {Date|null} endsAt
 * @property {string} typeLabel      label EVENT_TYPE_META
 * @property {string} typeCode       EventType: dipakai warna penanda kalender
 * @property {string} chapterLabel
 * @property {string} modeLabel      'Daring' | 'Luring'
 * @property {string} timeLabel      sudah terformat WIB lewat utils/date.js
 * @property {string} href           '/kalender/<slug>'
 * @property {import('$lib/data/photos.js').Photo|null} foto
 */
/**
 * @typedef {object} StoryVM
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} excerpt
 * @property {string} pillarCode     ESG pillar: dipakai fallback tipografis
 * @property {string} pillarLabel
 * @property {string} authorName
 * @property {Date|null} publishedAt
 * @property {number} readMinutes
 * @property {string} href           '/cerita/<slug>'
 * @property {import('$lib/data/photos.js').Photo|null} foto   null = fallback TIPOGRAFIS
 */
export function eventCardVM(event);   // CommunityEvent -> EventCardVM
export function storyVM(story);       // Story          -> StoryVM
```
**Nol field poin/tier/peringkat/lencana pada kedua VM**: PO-2 ditegakkan pada bentuk data, bukan pada
disiplin pemanggil.

```svelte
<!-- src/lib/components/EventListPanel.svelte  [BARU · WP-03] -->
props: { events: EventCardVM[], limit?: number = 5, title?: string = 'Kalender Komunitas',
         href?: string = '/kalender', variant?: 'panel'|'rail'|'strip' = 'panel',
         thumbnailAt?: number = 0,
         emptyMessage?: string = 'Belum ada kegiatan terjadwal. Kegiatan baru diumumkan tiap awal bulan.' }
```
`panel` = lebar penuh (E4 beranda) · `rail` = `<aside>` sempit satu kolom · `strip` = baris horizontal yang
dapat digulir, 768–1023 px (`docs/11` §7.1). Nilai **`'list'`** (`docs/10` §6.5, `docs/11` §8.5) adalah alias
lama dan **DILARANG dipakai**. `thumbnailAt` = indeks 1-basis baris ber-thumbnail, `0` = tidak ada;
penyimpangan P-3 ditentukan **pemanggil per lokasi**, bukan oleh nilai bawaan komponen.

Satu komponen dipakai **lima** tempat: `/cerita`, `/cerita/[slug]`, `/` (E4), `/awardee`, `/verifikator`.
Dilarang membuat kembarannya.

```svelte
<!-- src/lib/components/editorial/  [BARU · WP-03] -->
EditorialHero  { image, imageMobile, alt, altMobile?, kicker, title, standfirst,
                 primary:{label,href}, secondary?:{label,href}, byline?, caption }
                 // `alt` WAJIB non-kosong. Overlay dan tinggi adalah KONSTANTA INTERNAL komponen
                 // (docs/11 §8.8 & §10.3): opasitas tidak pernah < 0.82 dan tidak dapat dioper props.
                 // Kredit dibaca komponen lewat foto(key).credit: BUKAN prop.
DataBand       { lead:{value,label,context,sparkline?}, items:[{value,label,context}],
                 asOf, methodHref = '/metode-pengukuran' }                     // maks 3 item
                 // `context` & `asOf` WAJIB non-kosong (P-2). Kosong -> console.warn di dev
                 // + render label periode; DILARANG melempar (satu kartu tidak boleh
                 // merobohkan halaman). Penyebut HANYA dari snapshot.beneficiaryRegistry.
PhotoFigure    { src, alt, width, height, ratio:'4:5'|'3:2'|'16:9'|'21:9'|'1:1',
                 caption?, keyline:'red'|'navy'|'green'|'none', keylinePos:'top'|'left',
                 priority = false, srcMobile? }
                 // alt/width/height WAJIB: tanpa ketiganya §3.3(d) butir 1 mustahil dipenuhi.
                 // priority=true -> fetchpriority="high" tanpa lazy; HANYA untuk LCP.
                 // Kredit dibaca lewat foto(key).credit: komponen DILARANG membaca
                 // photo-credits.json sendiri (KP-3: itu masukan bagi photos.js).
StorySpread    { lead:StoryVM, secondary:StoryVM[], briefs:StoryVM[] }
SectionRule    { label?, tone?:'ink'|'red'|'navy',
                 scale?:'display'|'section'|'quiet' = 'section',
                 rhythm?:'loose'|'base'|'snug'|'tight'|'flush' = 'base' }
                 // scale+rhythm adalah penegak D-03/D-04/D-10: komponen WAJIB console.warn di dev
                 // bila dua SectionRule bersebelahan memakai kombinasi scale+rhythm identik.
ImpactFigure   { value, label, context, size?:'primary'|'secondary' = 'secondary',
                 kind?:'counted'|'estimated' = 'counted', sparkline?, surface?:'navy'|'canvas',
                 methodology? }        // dipakai DataBand secara internal + E2, /tentang
PullQuote      { quote, attribution?, keyline?:'navy'|'red'|'green', variant?:'inline'|'pulled' }
MonthCalendar  { month:Date, events:EventCardVM[], selected?:Date, min?:Date, max?:Date,
                 compact = false, onselect?, onstep? }
                 // `events` (EventCardVM[]), BUKAN `markers`. Aksesibilitas docs/11 §8.6 berlaku.
// barrel: src/lib/components/editorial/index.js  (+ view-model.js)
```

**Peta nama LAMA → FINAL** (`docs/11` §8 memakai nama lama; nama di bawah yang menang: §8):

| `docs/11` §8 / `docs/10` §6.5 | §2.13 dokumen ini | Catatan |
|---|---|---|
| `EventRail` | **`EventListPanel`** | `variant:'list'` → `'panel'`; `showPoints` **dihapus** (dilarang publik) |
| `MiniCalendar` | **`MonthCalendar`** | `markers:{date,type,color}[]` → `events:EventCardVM[]` (beda **bentuk data**, bukan hanya nama) |
| `ImpactBand` | **`DataBand`** | `primary`/`secondary[3]` → `lead`/`items` |
| `EditorialSection` | **`SectionRule`** | props `scale`/`rhythm` ikut pindah: penegak ritme tidak hilang |
| `ImpactFigure`, `PullQuote`, `PhotoFigure`, `EditorialHero` | **nama sama** | props mengikuti blok di atas |

```svelte
<!-- Komponen bersama yang BERUBAH kontraknya -->
AwardeeCard  { awardee, showScoring = false, onclick, variant, showActions, href }   // eks MemberCard
EventCard    { event, showPoints = false, onAttend, onRegister, variant, isRegistered, href }
StoryCard    { story, foto = null, href, variant, showStatus }
             // `foto` adalah objek Photo|null dari fotoCerita(slug): BUKAN string URL.
             // foto === null -> fallback TIPOGRAFIS (kicker pilar besar + keying rule), bukan gradien,
             // bukan satu foto default bersama. Wajib meneruskan alt/width/height/loading="lazy".
Header       { onMenuToggle, user, notificationCount, homeHref = '/', actions,
               profileHref = '/awardee/profil', notificationHref = '/awardee/kabar', roleLabel = '' }
             // Tiga prop terakhir BARU: `Header.svelte:84` & `:101` hari ini hard-code jalur
             // /member/*. Tanpa props ini, verifikator yang login melihat avatar & lonceng
             // menuju zona Awardee dan ditolak ZoneGuard-nya sendiri.
```

```js
// src/lib/data/photos.js  [BARU · WP-03]
/** @typedef {{src:string, alt:string, caption:string, credit:string, w:number, h:number}} Photo */
export const PHOTOS;                 // Readonly<Record<string, Photo>>
export function foto(key);           // -> Photo|null   null = komponen WAJIB fallback tipografis
export function fotoCerita(slug);    // -> Photo|null
```

```js
// src/lib/charts/_echarts.js  [BARU · WP-07]
export default echarts;              // build tree-shaken: Bar, Line, Pie, Radar, Gauge, Funnel,
                                     // Grid, Tooltip, Legend, Title, Radar, LabelLayout, CanvasRenderer
```

```js
// src/lib/utils/ics.js  [BARU · WP-08]
export function buatIcs(event);      // -> string  (VCALENDAR tunggal, zona Asia/Jakarta)
export function unduhIcs(event);     // -> void    (Blob + anchor; guard `browser`)
```

### 2.14 Route final V2 (36 route)

| Zona | Route | Pemilik |
|---|---|---|
| Publik (11) | `/` · `/tentang` · `/komunitas` · `/cerita` · `/cerita/[slug]` · `/gerakan` · `/metode-pengukuran` | WP-04 |
| | `/kalender` · `/kalender/[id]` | WP-08 |
| | `/masuk` · `/daftar` | WP-02 |
| Awardee (12) | `/awardee` · `/awardee/kabar` · `/awardee/kabar/[id]` · `/awardee/aksi` · `/awardee/kalender` · `/awardee/gerakan` · `/awardee/cerita` · `/awardee/cerita/tulis` · `/awardee/papan-peringkat` · `/awardee/penghargaan` · `/awardee/direktori` · `/awardee/profil` | WP-05 (layout: WP-02) |
| Verifikator (6) | `/verifikator` · `/verifikator/cerita` · `/verifikator/cerita/[id]` · `/verifikator/kegiatan` · `/verifikator/bukti` · `/verifikator/profil` | WP-06 |
| Admin (7) | `/admin` · `/admin/awardee` · `/admin/broadcast` · `/admin/moderasi` · `/admin/gamifikasi` · `/admin/esg` · `/admin/laporan` | WP-07 (layout: WP-02) |

`/admin/anggota` **DIRENAME** menjadi `/admin/awardee` (WP-01). `/member/**` **HILANG** tanpa pengalihan; `src/routes/+error.svelte` [BARU · WP-02] menangani tautan lama dengan halaman "Halaman tidak ditemukan" Bahasa Indonesia.

---

## 3. Gelombang implementasi

```
G1  ── WP-01 ────────────────────────────────────────────────  (1 agen, sekuensial)
G2  ── WP-02 ────────────────────────────────────────────────  (1 agen, sekuensial)
G3-A ── WP-03 ───────────────────────────────────────────────  (1 agen; komponen & aset adalah
                                                                dependensi semua paket G3-B)
G3-B ── WP-04 ‖ WP-05 ‖ WP-06 ‖ WP-07 ‖ WP-08 ───────────────  (5 agen paralel)
G4  ── WP-09 ────────────────────────────────────────────────  (1 agen)
```

**Mengapa G3 dipecah dua ketukan:** WP-04…WP-08 seluruhnya mengimpor `EventListPanel`, komponen editorial, dan `static/img/`. Menjalankan WP-03 berbarengan berarti lima paket menulis `import` terhadap berkas yang belum ada, dan gerbang gelombang tidak akan pernah hijau. Ketergantungan menang atas paralelisme.

### 3.1 G1 · WP-01: Fondasi Peran, Akun, dan Rename Awardee

**(b) Tujuan.** Menegakkan kosakata baru sekali jalan: tiga peran, entity akun, tabel `accounts`, tabel `awardees`, dan penghapusan total kata `member` sebagai identitas peran. **Paket ini tidak boleh diparalelkan**: `memberId` muncul di 31 berkas dan `Member` diimpor 14 berkas; memecahnya menghasilkan repo yang tidak pernah dapat dikompilasi.

**(a) File yang DIMILIKI** (75 berkas):

| Kelompok | File | Aksi |
|---|---|---|
| Domain: konstanta | `src/lib/domain/constants/roles.js` · `content-workflow.js` | BARU |
| | `src/lib/domain/constants/community.js` | UBAH |
| Domain: VO | `src/lib/domain/value-objects/PasswordHash.js` | BARU |
| | `src/lib/domain/value-objects/ConsentRecord.js` | UBAH |
| Domain: entity | `src/lib/domain/entities/UserAccount.js` | BARU |
| | `src/lib/domain/entities/Member.js` → `Awardee.js` | RENAME |
| | `src/lib/domain/entities/{Story,CommunityEvent,Broadcast,Movement,PointActivity}.js` | UBAH |
| | `src/lib/domain/entities/{Badge,Reward}.js` | UBAH (**hanya** `@param {import('./Member.js').Member} member` → `Awardee`, dan nama parameter `member` → `awardee`; `Badge.js:250,:253-254` · `Reward.js:242,:245-259`) |
| Domain: service/policy/repo | `src/lib/domain/services/{GamificationEngine,KpiCalculator,LeaderboardService,TierResolver}.js` | UBAH |
| | `src/lib/domain/policies/FeatureEligibilityPolicy.js` · `src/lib/domain/repositories/Repository.js` | UBAH |
| Infrastruktur | `src/lib/infrastructure/db.js` · `repositories/DexieRepository.js` · `repositories/index.js` | UBAH |
| | `repositories/MemberRepository.js` → `AwardeeRepository.js` | RENAME |
| | `repositories/AccountRepository.js` | BARU |
| | `repositories/{Activity,Badge,Broadcast,Consent,Event,Movement,Reward,Story}Repository.js` | UBAH |
| | `seed/accounts.js` | BARU |
| | `seed/seed-data.js` · `seed/bootstrap.js` | UBAH |
| Store (rename mekanis) | `src/lib/stores/{session,catalog,gamification,leaderboard,admin}.svelte.js` | UBAH |
| Komponen (rename mekanis) | `src/lib/components/MemberCard.svelte` → `AwardeeCard.svelte` | RENAME |
| | `src/lib/components/{index.js,Header.svelte,BottomNav.svelte,Sidebar.svelte,Footer.svelte}` | UBAH (`Footer.svelte:6` docblock *"zona member/admin"*) |
| Route | `src/routes/member/**` → `src/routes/awardee/**` (12 berkas) | RENAME |
| | `src/routes/admin/anggota/+page.svelte` → `src/routes/admin/awardee/+page.svelte` | RENAME |
| | `src/routes/admin/{+layout.svelte,gamifikasi/+page.svelte,moderasi/+page.svelte}` | UBAH |
| | `src/routes/admin/laporan/+page.svelte` | UBAH (**rename mekanis saja**: `catalog.members` → `catalog.awardees`, `:363-374`) |
| | `src/routes/(public)/{_view-model.js,+page.svelte,masuk/+page.svelte,cerita/[slug]/+page.svelte}` | UBAH |
| | `src/routes/(public)/komunitas/+page.svelte` | UBAH (**rename mekanis saja**: `catalog.members`→`catalog.awardees`, `catalog.activeMembers`→`catalog.activeAwardees`, `:30-31`, `:36-42`) |
| | `src/routes/(public)/daftar/+page.svelte` | UBAH (**rename mekanis saja**: `MEMBER_STATUS*`→`AWARDEE_STATUS*`, `:27-28`, `:116`) |
| Skrip (rename mekanis) | `scripts/verify/{domain-test,seed-test,e2e-routes,e2e-gamification,screenshot}.mjs` | UBAH |

**(c) Boleh diimpor dari paket lain:** tidak ada: G1 adalah dasar. Hanya boleh membaca file BEKU §1.2.

> **Tiga berkas ditambahkan ke paketmu semata-mata agar G1 dapat ditutup**, bukan untuk diredesain:
> `(public)/daftar/+page.svelte` (mengimpor `MEMBER_STATUS`/`MEMBER_STATUS_META`: tanpa rename, Rollup
> menghentikan build dengan *"'MEMBER_STATUS' is not exported"*), `(public)/komunitas/+page.svelte` dan
> `admin/laporan/+page.svelte` (mengakses `catalog.members`/`catalog.activeMembers` sebagai **properti** :
> tidak tertangkap `verify:compile` maupun `npm run build`, dan akan melempar `TypeError` saat halaman
> dibuka, selama tiga gelombang, tanpa satu pun gerbang menyala). **Hanya rename mekanis.** Pembersihan
> PO-2 pada `/daftar` tetap milik WP-02 (§3.2 butir 6); redesign `/komunitas` tetap milik WP-04;
> `/admin/laporan` tetap milik WP-07.

**(d) Kriteria selesai:**
1. `grep -rniE '\bmember\b' src scripts` **nihil** kecuali: (a) kata Indonesia (`memberi`, `pemberitahuan`, `memberikan`); (b) catatan migrasi bertanda `@deprecated`; (c) **nama tier kanonik `Active Member` / `ACTIVE_MEMBER`** pada `tier-table.js:82`, `app.css:33`, dan komentar `TierProgress.svelte:25`: ketiganya berkas **BEKU §1.2** (nilai kanonik Hal 12) dan **dilarang diubah**. Mengganti label tier demi meloloskan grep akan membuat `TierBadge`, `TierProgress`, dan chart tier menampilkan label yang berbeda dari dokumen sumber.
2. `grep -rn "SessionRole\|PROFIL_ADMIN\|MemberRole\|loginAsMember\|loginAsAdmin\|memberId\|MemberCard\|/member" src scripts` **nihil**, kecuali **empat string indeks di dalam `SCHEMA_V1`** (`db.js:60, :62, :68, :69`) yang merupakan rekaman sejarah dan dilindungi R-02. `PROFIL_ADMIN.id` **diganti**, bukan dihapus: `admin.svelte.js:40` & `:335` (`session.user?.id ?? PROFIL_ADMIN.id`) memakai `ID_ADMIN` dari `seed/accounts.js` (§2.11) sebagai fallback aktor: tanpa pengganti, jejak moderasi tercatat ber-`undefined` dan build tetap hijau.
3. `npm run verify:compile` 0 gagal · `node scripts/verify/domain-test.mjs` hijau · `node scripts/verify/seed-test.mjs` hijau · `npm run build` sukses. **Panggil skripnya langsung**, jangan lewat `npm run verify`: blok `scripts` di `package.json` beku sampai WP-09 (§1.2, §6.2), jadi `verify:seed` belum ada.
4. `seedStats().accounts === 63` dan seluruh 63 baris dapat dikonstruksi menjadi `UserAccount` tanpa lemparan.
5. Determinisme utuh: `buildSeed()` dua kali menghasilkan JSON identik; distribusi tier tetap **22/16/12/7/3** dan `totalPoints === 3234`. Bila berubah, kamu menyisipkan draw `rng` di tempat yang salah.
6. Seed bertambah **4–6 kegiatan mendatang** (`day` 205–260, ≥1 luring) dan **2 kegiatan `DIUSULKAN`** ber-`proposedBy` awardee: ditambahkan sebagai naskah, **bukan** lewat pemanggilan rng baru sebelum generator yang sudah ada.
7. `DB_VERSION === 2` **dan** `SEED_VERSION === 2` naik bersama dalam satu langkah.
8. `npm run dev` → buka `/komunitas`, `/daftar`, `/admin/laporan`: **nol error konsol**. Ketiganya adalah berkas yang direname mekanis dan tidak terlindungi gerbang statis mana pun.

### 3.2 G2 · WP-02: Autentikasi, Sesi, Guard, Gerbang Aplikasi

**(b) Tujuan.** Mengganti pemilih peran demo dengan login email+kata sandi, memasang guard tiga zona, dan menyediakan tiga service domain + tiga store aplikasi yang akan dikonsumsi seluruh paket G3.

**(a) File yang DIMILIKI** (19 berkas):

| File | Aksi |
|---|---|
| `src/lib/domain/policies/AccessPolicy.js` | BARU |
| `src/lib/domain/validation/Validator.js` | BARU |
| `src/lib/domain/services/AuthService.js` | BARU |
| `src/lib/domain/services/ContentReviewService.js` | BARU |
| `src/lib/domain/services/ProgramImpactService.js` | BARU |
| `src/lib/stores/session.svelte.js` | TULIS ULANG |
| `src/lib/stores/catalog.svelte.js` | UBAH |
| `src/lib/stores/editorial.svelte.js` | BARU |
| `src/lib/stores/impact.svelte.js` | BARU |
| `src/lib/data/navigation.js` | BARU |
| `src/lib/components/ZoneGuard.svelte` | BARU |
| `src/lib/components/index.js` | UBAH (tambah `ZoneGuard`) |
| `src/lib/components/BottomNav.svelte` · `Sidebar.svelte` | UBAH (kosongkan fallback nav internal) |
| `src/routes/+error.svelte` | BARU |
| `src/routes/awardee/+layout.svelte` · `src/routes/admin/+layout.svelte` | UBAH |
| `src/routes/(public)/masuk/+page.svelte` | TULIS ULANG |
| `src/routes/(public)/daftar/+page.svelte` | UBAH (pembersihan PO-2; rename `AWARDEE_STATUS*` sudah dikerjakan WP-01 di G1) |

**(c) Boleh diimpor:** seluruh keluaran WP-01 (§2.1–2.11) + file BEKU.

> **`src/lib/data/icons.js` BUKAN milik WP-02** (milik WP-03, gelombang berikutnya). Kamu **tidak** perlu menyentuhnya: ke-17 kunci yang dibutuhkan `navigation.js` + `ZoneGuard` **sudah ada hari ini**: `home`, `info`, `users`, `book`, `calendar`, `flag`, `megaphone`, `bolt`, `trophy`, `gift`, `user`, `shield`, `camera`, `leaf`, `chart`, `document`, `lock` (diverifikasi: 61 kunci tersedia). Butuh ikon yang tidak ada? **Pakai kunci terdekat yang ada** dan laporkan di ringkasan akhir: jangan menambah kunci, jangan menulis path SVG di `navigation.js`.

**(d) Kriteria selesai:**
1. Matriks perilaku guard §6.4 lolos secara manual di `npm run dev` untuk kolom **`/awardee/aksi`, `/admin`, dan `/cerita`**, ditambah baris *"sudah masuk lalu membuka `/masuk`"*. Kolom **`/verifikator/cerita` dan `/kalender` diuji di gerbang G3-B, bukan di sini**: route-nya belum ada, dan kamu **DILARANG** membuatnya "supaya guard bisa diuji": `verifikator/**` seluruhnya milik WP-06 dan `/kalender` milik WP-08. Untuk memastikan `ZoneGuard` bekerja untuk zona yang belum berpenghuni, ujilah `AccessPolicy.canAccess(role, '/verifikator/cerita')` di `node` polos: itu murni dan sinkron, persis alasan policy ini ditaruh di domain.
2. `/masuk` **tanpa** pemilih peran; ada formulir email+sandi, pesan galat tunggal, dan panel kredensial demo bertanda **"autentikasi tiruan, bukan mekanisme keamanan"** yang membaca `accountRepository.demoAccounts()`: **dilarang** menuliskan kredensial kedua kalinya di komponen. Pengguna yang **sudah masuk** membuka `/masuk` dialihkan ke `session.homePath()`, bukan disuguhi formulir lagi.
3. Muat ulang halaman di `/awardee/aksi` **tidak** melempar pengguna sah keluar (uji `ready`).
3b. **Peramban dengan IndexedDB kosong:** buka langsung `/masuk` (tanpa mampir ke `/`), kirim kredensial demo dalam <1 detik → login **berhasil**. Ini menguji bahwa `session.login()` memanggil `bootstrapDatabase()` sebagai langkah pertama (§2.12) dan tidak bergantung pada `$effect` di `(public)/+layout.svelte:47-49`.
4. Sesi lama bentuk `{role:'member'}` di localStorage diperlakukan sebagai tamu, tanpa galat konsol.
5. `session.canAccess` **mendelegasikan** ke `AccessPolicy`: `grep -c "startsWith('/admin')" src/lib/stores/session.svelte.js` = 0.
6. **`/daftar` dibersihkan dari PO-2 oleh WP-02, bukan WP-04**: berkas ini milikmu, dan ia **beku selama G3-B**. Wajib: hapus blok **"Poin pertamamu"** (`daftar/+page.svelte:242-245`, teks *"…dan poin pertamamu langsung tercatat"*) dan ganti dengan manfaat naratif tanpa mekanik skor. **Dipertahankan apa adanya:** dua teks consent `:65` (*"Aksi, poin, dan tier disimpan…"*) dan `:70` (*"…catatan poin tetap tersimpan sebagai jejak audit…"*): keduanya **disclosure privasi**, bukan display skor, dan mencabutnya justru membuat consent tidak jujur. Inilah alasan `public-purity.mjs` mengecualikan `/daftar` (§6.2).
7. `npm run verify` hijau.

### 3.3 G3-A · WP-03: Aset Foto & Sistem Visual Editorial

**(b) Tujuan.** Menjawab kritik "webnya terlalu AI": foto asli, tipografi berkarakter, komponen editorial, dan pencabutan gradient blur: sebagai **sistem**, bukan tambalan per halaman.

**(a) File yang DIMILIKI** (62 berkas):

| Kelompok | File | Aksi |
|---|---|---|
| Aset | `static/favicon.svg` | BARU (sekaligus menutup 404 `app.html:5-6`) |
| | `static/img/*.jpg` (**28 berkas per manifes `docs/11` §5.1–§5.5**) · `static/img/CREDITS.md` | BARU |
| | `static/fonts/*.woff2` (3 berkas) · `static/fonts/OFL-*.txt` (3 berkas lisensi) | BARU: kewajiban SIL OFL, bukan kesopanan |
| | `scripts/assets/fetch-photos.mjs` | BARU |
| Data | `src/lib/data/photos.js` · `src/lib/data/photo-credits.json` | BARU |
| | `src/lib/data/icons.js` | UBAH (aditif) |
| Token | `src/app.css` · `src/app.html` | UBAH: **daftar putih §3.4** |
| Komponen editorial | `src/lib/components/editorial/{EditorialHero,DataBand,ImpactFigure,PhotoFigure,StorySpread,SectionRule,PullQuote,MonthCalendar}.svelte` + `index.js` + `view-model.js` | BARU |
| Komponen bersama | `src/lib/components/EventListPanel.svelte` | BARU |
| | `src/lib/components/{StoryCard,EventCard,AwardeeCard,Header,Footer,Avatar}.svelte` · `_visual.js` | UBAH |
| | `src/lib/components/{PageHeader,KpiCard}.svelte` | UBAH: **mitigasi wajib token `--font-display`**: pasang `font-sans` eksplisit pada heading. Tanpa ini keduanya yatim (KP-2) dan seluruh judul `/awardee`, `/verifikator`, `/admin` diam-diam menjadi serif |
| | `src/lib/components/index.js` | UBAH (ekspor komponen baru) |

**(c) Boleh diimpor:** keluaran WP-01 & WP-02 + file BEKU.

**(d) Kriteria selesai:**
1. **Gerbang keras foto: tidak dapat ditawar.** `static/img/` berisi **28 berkas** sesuai manifes `docs/11` §5, tiap berkas **>20 KB** (bukan berkas kosong/rusak); **dilarang hotlink** ke domain luar. Bila `UNSPLASH_ACCESS_KEY` tidak tersedia, tempuh **jalur manual `docs/11` §5.7**: jalur itu **wajib**, bukan opsional. PO-6 adalah setengah alasan revisi ini ada; paket yang selesai tanpa satu foto pun membiarkan cacat D-07 utuh.
2. Setiap foto punya `alt` Bahasa Indonesia (tidak diawali "Gambar/Foto/Ilustrasi"), `width`/`height` eksplisit, `max-width:100%`, dan `loading="lazy"` **kecuali** hero LCP yang memakai `fetchpriority="high"` (`PhotoFigure.priority = true`).
3. `static/img/CREDITS.md` mencantumkan fotografer + tautan profil + sumber + lisensi + id foto untuk setiap berkas.
4. **Ketahanan runtime** (bukan jalan keluar dari butir 1): bila satu berkas hilang saat runtime, `foto(key)` mengembalikan `null` dan komponen **jatuh ke blok tipografis**: bukan `<img>` rusak, bukan gradien, bukan satu foto default yang dipakai bersama seluruh kartu cerita.
5. `grep -rn "blur-3xl\|backdrop-blur" src/routes/\(public\) src/lib/components/editorial` **nihil**.
6. `du -sh static/img` ≤ **5 MB**; `find static/img -size +400k` kosong (anggaran `docs/11` §5, direvisi: lihat catatan di sana).
7. **Uji mode pesawat:** matikan jaringan, buka `build/` → tipografi tetap Fraunces + Plus Jakarta (dari `static/fonts/`), seluruh foto tampil.
8. `grep -rn "font-sans" src/lib/components/PageHeader.svelte src/lib/components/KpiCard.svelte` menemukan keduanya; buka `/admin` dan `/awardee` → judul **tetap** Plus Jakarta.
9. `npm run verify:compile` 0 gagal.

> **Avatar: tidak ada wajah stok yang ditempelkan ke nama orang.** `docs/11` §4.6 memutuskan `Avatar.svelte` tetap memakai inisial sebagai keputusan sadar. Karena itu manifes ini **tidak** memuat berkas `avatar-*.jpg`, dan gerbang lama *"avatar berfoto ditandai `isPlaceholderPhoto: true`"* **dicabut**: ia menuntut aset yang sengaja tidak dibuat. `docs/10` §9.3 baris "Avatar" dan US-R28 AC-6 ikut dicabut (§8).

### 3.4 Daftar putih perubahan `app.css` & `app.html` (hanya WP-03)

| Berkas | Perubahan yang DIIZINKAN | Yang tetap DILARANG |
|---|---|---|
| `src/app.css` | (1) Menambah blok `@font-face` (3 keluarga, sumber `/fonts/*.woff2`) **di atas** `@theme`; (2) menghapus `body { background-image: … }` aura radial (`:129-132`); (3) `--color-canvas` → `#F6F4F1`; (4) `--font-display` → `'Fraunces', 'Instrument Serif', Georgia, serif`; (5) menambah `--radius-photo: 2px` + token `--rhythm-*`; (6) menambah `@utility display-editorial`, `kicker`, `figure-number`, `keyline`; (7) **mengubah `@utility numeric` (`:219-224`) agar memakai `var(--font-sans)`**: mitigasi wajib, lihat catatan; (8) mempersempit selektor `h1…h4` (`:139-147`) agar `--font-display` tidak merambat ke zona ter-login | Mengubah token warna Pertamina (merah/navy/hijau), mengubah skala tier, menghapus kelas yang dipakai zona ter-login, **mengubah `label-micro` ke mono** |
| `src/app.html` | (1) **Menghapus** tiga `<link>` Google Fonts + `preconnect` (`:14-19`) setelah `@font-face` lokal aktif; (2) menambah `<link rel="preload" as="font" type="font/woff2" crossorigin>` untuk Fraunces + Plus Jakarta; (3) menambah meta Open Graph: `og:title`, `og:description`, `og:image` → `/img/og-pfriends.jpg`, `og:type`, `twitter:card` | Mengubah `%sveltekit.head%`, `%sveltekit.body%`, `lang="id"`, charset, viewport, `theme-color`, rujukan `%sveltekit.assets%/favicon.svg`, atau menambah skrip pihak ketiga |

**Tiga catatan yang membuat daftar putih ini dapat dieksekusi:**

1. **`--font-display` SUDAH ADA** (`app.css:103`): ini **penggantian nilai**, bukan penambahan token. Nilainya hari ini identik dengan `--font-sans`, yang justru cacat D-09.
2. **`@utility numeric` membaca token yang diganti.** `app.css:219-224` menetapkan `font-family: var(--font-display)`, dan `numeric` dipakai **167 kali di 47 berkas**: termasuk seluruh `routes/admin/**` dan `routes/awardee/**`. Klaim `docs/11` §3.4 *"dua utility, dua zona, nol tabrakan"* **salah** dan dicabut (§8): mengganti `--font-display` tanpa menyentuh `numeric` memindahkan seluruh angka dasbor ke serif. Karena itu butir (7) **wajib**, dan `figure-number` menjadi satu-satunya utility publik yang memakai `--font-display`.
3. **`label-micro` TIDAK di-mono-kan.** Ia dipakai **41 berkas**, mayoritas di zona ter-login (`docs/11` §3.4 melarangnya berubah). Zona publik memakai `@utility kicker` yang **baru**: dua utility, dua zona, kali ini benar-benar tanpa tabrakan.

### 3.5 G3-B · Lima paket paralel

#### WP-04: Redesign Zona Publik & Kepatuhan PO-2 (10 berkas)

**(b) Tujuan.** Mencabut seluruh mekanik gamifikasi dari zona publik dan menyusun ulang halaman menjadi terbitan editorial berbasis `impact` + `catalog`.

**(a) File:**

| File | Aksi |
|---|---|
| `src/routes/(public)/+layout.svelte` | UBAH (masthead dua baris, nav dari `navigation.js`) |
| `src/routes/(public)/+page.svelte` | TULIS ULANG mengikuti seksi **E0–E7 `docs/11` §6**: dengan **nama & props §2.13 dokumen ini yang menang** atas `docs/11` §8 |
| `src/routes/(public)/tentang/+page.svelte` · `komunitas/+page.svelte` · `gerakan/+page.svelte` | UBAH |
| `src/routes/(public)/cerita/+page.svelte` · `cerita/[slug]/+page.svelte` | UBAH (+ `EventListPanel` di `<aside>`) |
| `src/routes/(public)/metode-pengukuran/+page.svelte` | BARU |
| `src/routes/(public)/_view-model.js` | UBAH (hapus `totalPoin`) |
| `scripts/verify/public-purity.mjs` | BARU |

**(c) Boleh diimpor:** `impact`, `catalog` (WP-02); `EventListPanel`, `editorial/*` **termasuk `editorial/view-model.js`** (`eventCardVM`, `storyVM`), `photos.js`, `AwardeeCard`, `StoryCard`, `EventCard` (WP-03); `COMMUNITIES`, `CHAPTERS`, `ESG_PILLARS`, `REACH_PARAMETERS` (domain konstanta). **DILARANG:** `scoring-table.js`, `tier-table.js`, `TierBadge`, `PointsChip`, `TierProgress`, `LeaderboardRow`, `BadgeTile`, `leaderboard`, `gamification`, repository apa pun.

> **Dua tautan menuju halaman milik paket lain: jangan dibuat sendiri.** `(public)/+layout.svelte` merender `navForZone(Zone.PUBLIC)` yang **sudah** memuat butir `/kalender`, dan seksi E4 landing menautkan ke `/kalender`: keduanya halaman milik **WP-08**. Selama G3-B berjalan, tautan itu **boleh 404 sementara**; ia hijau di gerbang gelombang, bukan di gerbang paketmu. **Dilarang** membuat `(public)/kalender/+page.svelte` versimu sendiri "supaya tidak 404". Hal yang sama berlaku untuk `/metode-pengukuran` di arah sebaliknya: halaman itu **milikmu**, dan WP-08 menautkannya tanpa membuatnya.

**(d) Kriteria selesai:**
1. `node scripts/verify/public-purity.mjs` hijau. Skrip ini memindai `src/routes/(public)/**` dan **gagal** bila menemukan: impor `scoring-table.js`/`tier-table.js`, impor `TierBadge|PointsChip|TierProgress|LeaderboardRow|BadgeTile`, impor `$lib/infrastructure/`, atau kata `poin|tier|peringkat|lencana|badge` di dalam teks yang dirender (kecuali `/daftar` teks consent dan `/metode-pengukuran`).
2. **Delapan titik kebocoran `docs/11` §1 D-15 seluruhnya tercabut**, ditambah dua berkas yang tidak muncul di daftar itu. Enam impor kebocoran nyata di zona publik hari ini: diverifikasi ke kode: `(public)/+page.svelte:24, :343` (`PointsChip`) · `(public)/cerita/[slug]/+page.svelte:25, :156` (`TierBadge`) · `(public)/masuk/+page.svelte:25, :194` (`TierBadge`). Dua yang terakhir milik **WP-02** dan sudah bersih sejak G2; verifikasi ulang lewat butir 1, jangan menyuntingnya.
3. Landing memuat empat blok PO-1, masing-masing bertautan ke halaman pendalamannya.
4. Angka kelas B tampil sebagai **rentang** berlabel `Estimasi` dengan `ⓘ` menuju `/metode-pengukuran`; angka kelas C ditulis sebagai kalimat rujukan **tanpa** angka besar/gauge/progress bar; **tanpa** nilai rupiah.
5. Data kosong → keadaan kosong yang menjelaskan, **bukan** angka nol besar.
6. Minimal dua bagian memakai grid asimetris; tidak ada rentetan >3 kartu berukuran identik; tidak ada scroll horizontal di 375 px.
7. **Tiga gerbang anti-template `docs/11` §11.3: dipindahkan ke sini supaya D-03/D-04/D-10 punya penegak:** (a) tidak ada dua seksi bersebelahan dengan jumlah kolom yang sama; (b) judul empat seksi beranda **tidak** semuanya berukuran sama; (c) `padding-block` seksi memakai token `--rhythm-*`, **bukan** `py-12` berulang. `public-purity.mjs` memeriksa (c) secara statis: `py-12` yang berulang >2 kali dan pola `text-2xl … md:text-3xl` yang berulang >2 kali di `(public)/+page.svelte` = gagal.
8. Setiap `<img>` di bawah `src/routes/(public)/**` punya `alt` non-kosong: diperiksa `public-purity.mjs`.

#### WP-05: Zona Awardee (12 berkas)

**(b) Tujuan.** Menjadikan area Awardee satu-satunya rumah gamifikasi, dan menambahkan komposer cerita + pengusulan kegiatan.

**(a) File:** `src/routes/awardee/{+page.svelte, kabar/+page.svelte, kabar/[id]/+page.svelte, aksi/+page.svelte, kalender/+page.svelte, gerakan/+page.svelte, cerita/+page.svelte, papan-peringkat/+page.svelte, penghargaan/+page.svelte, direktori/+page.svelte, profil/+page.svelte}` [UBAH] · `src/routes/awardee/cerita/tulis/+page.svelte` [BARU].
Komponen lokal boleh dibuat di `src/routes/awardee/_components/`.

**(c) Boleh diimpor:** `session`, `editorial`, `catalog`, `gamification`, `leaderboard`, `toast`; `Validator`; `EventListPanel`, `editorial/view-model.js`, komponen gamifikasi (`TierBadge`, `PointsChip`, `TierProgress`, `BadgeTile`, `LeaderboardRow`, `RewardCard`); seluruh `domain/constants/`; **`consentRepository`, `awardeeRepository`, `rewardRepository`**: dua halaman yang kamu warisi sudah memakainya dan tulisannya belum punya store: `awardee/profil/+page.svelte:48, :82, :151, :155` dan `awardee/penghargaan/+page.svelte:49-52, :161, :248-249`. Zona Awardee adalah zona ter-login; larangan D-4 (repository) berlaku untuk `(public)/**`, **bukan** untuk zonamu. **DILARANG:** menyentuh `awardee/+layout.svelte` (milik WP-02) dan `navigation.js`.

**(d) Kriteria selesai:**
1. Komposer `/awardee/cerita/tulis` menegakkan `Story.isSubmittable` + consent; penolakan menyebut syarat mana yang belum terpenuhi.
2. Pengiriman cerita memberi poin lewat `poinUntuk(ActivityType.STORY_SUBMIT)`: **nol angka literal**.
3. Tab "Usulan saya" di `/awardee/kalender` menampilkan status + catatan verifikator.
4. Kartu naskah **tidak** menampilkan poin/tier/peringkat (US-R14 AC-4).
5. Setiap halaman punya keadaan kosong; tidak ada scroll horizontal di 375 px.

#### WP-06: Zona Verifikator (7 berkas, seluruhnya BARU)

**(b) Tujuan.** Membangun zona ketiga: antrean tinjauan, keputusan bergerbang, papan SLA.

**(a) File:** `src/routes/verifikator/{+layout.svelte, +page.svelte, cerita/+page.svelte, cerita/[id]/+page.svelte, kegiatan/+page.svelte, bukti/+page.svelte, profil/+page.svelte}`. Komponen lokal di `src/routes/verifikator/_components/`.

**(c) Boleh diimpor:** `ZoneGuard`, `Zone`, `navigation.js`, `session`, `editorial`, `catalog`, `toast`; `EventListPanel` + `editorial/view-model.js` (panel agenda terdekat di `/verifikator`, `docs/10` §6.5 pemakaian ke-5: **komponen yang sama**, dilarang membuat salinan); `content-workflow.js`, `AccessPolicy`, `FeatureEligibilityPolicy`, `EsgEvidenceService`, `AntiGamingPolicy`. **DILARANG:** `admin` store, `KpiCalculator`, `leaderboard`, chart apa pun (larangan X-02), ekspor data (X-08).

**(d) Kriteria selesai:**
1. `+layout.svelte` membungkus isi dengan `<ZoneGuard zone={Zone.VERIFIER} label="ruang kerja verifikator">` dan memakai `navForZone(Zone.VERIFIER)`: **tanpa** daftar nav tulis tangan.
2. Tombol keputusan dirender dari `allowedStoryTransitions(status, role)` / `allowedEventTransitions(...)`, **bukan** daftar tombol tulis tangan.
3. **Usulan kegiatan yang diajukan verifikator yang sedang masuk** → tombol "Setujui"/"Tolak" nonaktif + alasan tertulis (*"Anda pengusul kegiatan ini: persetujuan harus dilakukan verifikator lain"*), **dan** `ContentReviewService.approveEvent` tetap menolak bila permintaan dipaksakan lewat konsol (`isSelfReview(actor.id, event.proposedBy)`). Inilah alasan seed mewajibkan **dua** akun verifikator. Untuk cerita, konflik kepentingan tidak dapat terjadi: `WRITE_CONTENT` bukan milik VERIFIER (§2.1), sehingga `story.authorId` selalu menunjuk Awardee: guard pada jalur cerita tetap dipasang sebagai pertahanan berlapis dan diuji `domain-test.mjs` dengan aktor sintetis.
4. Antrean FIFO dengan usia hari kerja + penanda SLA dari `SLA_HARI_KERJA`: **nol angka literal**.
5. Tiga panel gerbang ditampilkan **terpisah** dan tidak digabung menjadi satu skor.
6. "Minta revisi"/"Tolak"/"Batalkan kegiatan" tanpa catatan/alasan → ditolak.
7. Kolom `/verifikator/cerita` pada matriks §6.4 lolos manual di sini (ditunda dari gerbang WP-02).

#### WP-07: Dasbor Admin ECharts (28 berkas)

**(b) Tujuan.** **Sebelas** chart wajib di empat tab, perbaikan cacat pembungkus `EChart`, dan penutupan kebocoran governance pada `/admin/moderasi`.

**(a) File:**

| Kelompok | File | Aksi |
|---|---|---|
| Pembungkus | `src/lib/components/EChart.svelte` | UBAH (pisahkan efek siklus hidup ↔ efek data) |
| | `src/lib/charts/_echarts.js` | BARU (tree-shaken) |
| | `src/lib/charts/_chartTheme.js` | UBAH (aditif: palet funnel/gauge) |
| Chart lama | `src/lib/charts/{TrendLineChart,TierDistributionChart,AmplificationBarChart,EsgRadarChart,CommunityPieChart,KpiGaugeChart}.svelte` | UBAH |
| Chart baru | `src/lib/charts/{CoverageGaugeChart,CoverageSegmentBar,DisseminationComboChart,AmplificationTrendLine,KpiRadarChart,PointSourceStackedBar,EngagementFunnelArea,EsgEvidenceGateBar,ReachEstimateBand,EditorialPipelineFunnel,VerifierSlaBar}.svelte` | BARU (11) |
| Store | `src/lib/stores/admin.svelte.js` | UBAH |
| Route | `src/routes/admin/{+page.svelte, awardee/+page.svelte, broadcast/+page.svelte, moderasi/+page.svelte, gamifikasi/+page.svelte, esg/+page.svelte, laporan/+page.svelte}` | UBAH |

**(c) Boleh diimpor:** seluruh domain service/konstanta, `admin` store, `catalog`, `editorial` (untuk corong pipeline, **baca saja**). **DILARANG:** menyentuh `admin/+layout.svelte` (WP-02) dan `navigation.js`.

**(d) Kriteria selesai:**
1. `import 'echarts'` **hanya** ada di `src/lib/charts/_echarts.js`; `grep -rn "from 'echarts'" src | grep -v _echarts.js` nihil.
2. Perubahan `option` **tidak** membongkar canvas: `EChart.svelte` punya efek terpisah untuk siklus hidup (bergantung `container`) dan data (`setOption(..., {notMerge:true})`).
3. **Sebelas chart** pada daftar "Chart baru" di atas (§3.5 WP-07) terpasang, terbagi ke tab Ringkasan / Amplifikasi / Komunitas / ESG & Dampak sesuai `docs/10` §7.3, bersama enam chart lama yang diperbaiki. `EditorialPipelineFunnel` (C-19) disuplai `editorial.pipeline`; `VerifierSlaBar` (C-20) disuplai `ContentReviewService.slaCompliance()` lewat store `editorial`: **bukan** dari service baru, dan **bukan** dihitung di komponen (CH-8).
4. Data kosong → `option === null` → pesan kosong eksplisit, **bukan** grafik nol.
5. Chart estimasi bergaris putus-putus + lencana "Estimasi".
6. Seluruh label/legenda/tooltip Bahasa Indonesia; tiap chart komponen tersendiri; metrik dihitung di service/store, **bukan** di komponen; nol angka poin/ambang literal.
7. Lebar 375 px: chart menggulir di dalam wadahnya sendiri, halaman tidak.
8. **`/admin/moderasi` menjadi READ-ONLY.** §2.1 memberi ADMIN ❌ pada `REVIEW_CONTENT` dan `PUBLISH_CONTENT`, tetapi `admin.svelte.js` hari ini menulis status cerita langsung ke repository tanpa melewati `ContentReviewService`: `:150` `approve(storyId, {note, sensitivityConfirmed})` → `:164` `status: STORY_STATUS.DISETUJUI`, dan `:201` `requestRevision(...)`. Jalur itu **tidak** memeriksa `canTransitionStory`, **tidak** memeriksa `AccessPolicy.isSelfReview` (R-16), dan membocorkan PO-4 lewat halaman yang rencana ini justru mempertahankan. Wajib: hapus `approve()` dan `requestRevision()` dari `admin.svelte.js`; halaman hanya menampilkan **agregat antrean + tautan ke `/verifikator`**. Gerbang: `grep -n "STORY_STATUS.DISETUJUI\|STORY_STATUS.TERPUBLIKASI\|STORY_STATUS.PERLU_REVISI" src/lib/stores/admin.svelte.js` **nihil**. Takedown Admin (C-17, `TERPUBLIKASI → DIARSIPKAN`) **tetap ada** dan wajib melewati `ContentReviewService.archiveStory(story, actor, reason)`.

#### WP-08: Kalender & Event Publik (4 berkas)

**(b) Tujuan.** Mewujudkan pilar 02 sebagai destinasi publik dengan batas visibilitas yang aman.

**(a) File:** `src/routes/(public)/kalender/+page.svelte` [BARU] · `src/routes/(public)/kalender/[id]/+page.svelte` [BARU] · `src/routes/(public)/_calendar-view-model.js` [BARU] · `src/lib/utils/ics.js` [BARU].

**(c) Boleh diimpor:** `catalog.publishedEvents` / `catalog.upcomingEvents`, `EventListPanel`, `MonthCalendar`, `editorial/view-model.js` (`eventCardVM`: **satu-satunya** pemeta entity→VM; dilarang menulis versimu sendiri, KP-3), `EVENT_TYPE_META`, `CHAPTERS`, `COMMUNITIES`, `utils/date.js`, `utils/format.js`. **DILARANG:** repository, `gamification`, komponen gamifikasi, `(public)/_view-model.js` (milik WP-04).

**(d) Kriteria selesai:**
1. `/kalender` tampil tanpa login; ≥768 px baku grid bulan, <768 px baku daftar.
2. Filter jenis (3 nilai `EventType`), chapter, komunitas, mode daring/luring berfungsi dan terlihat aktif.
3. **Tidak ada** nama pendaftar/peserta, kuota tersisa, kode kehadiran, atau nilai poin.
4. Event `DIUSULKAN`/`DITOLAK` **tidak pernah** tampil: penyaring tunggal `event.isPubliclyVisible`.
5. `/kalender/[id]` menyediakan unduh `.ics`; id tak dikenal → halaman "Kegiatan tidak ditemukan", bukan galat.
6. Bulan tanpa kegiatan → keadaan kosong yang menjelaskan.

### 3.6 G4 · WP-09: Dokumentasi SDLC & Verifikasi (9 berkas)

**(b) Tujuan.** Menutup PO-7: jejak SDLC, matriks ketertelusuran, dan gerbang verifikasi yang benar-benar menguji aturan baru.

**(a) File:** `README.md` [UBAH] · `docs/13-SDLC-DELTA.md` [BARU] · `docs/14-TRACEABILITY.md` [BARU] · `scripts/verify/{domain-test,seed-test,e2e-routes,screenshot,e2e-gamification}.mjs` [UBAH] · `package.json` **blok `scripts` saja** [UBAH].

**(c) Boleh diimpor:** apa pun (hanya membaca).

**(d) Kriteria selesai:** §6.3.

### 3.7 Tabel silang file → paket (bukti tanpa irisan)

Untuk G1, G2, G3-A, dan G4 pembuktian bersifat trivial: **satu gelombang, satu paket**. Tabel di bawah membuktikan G3-B: satu-satunya gelombang paralel.

| File / pola | WP-04 | WP-05 | WP-06 | WP-07 | WP-08 |
|---|:--:|:--:|:--:|:--:|:--:|
| `src/routes/(public)/+layout.svelte` | ● | | | | |
| `src/routes/(public)/+page.svelte` | ● | | | | |
| `src/routes/(public)/{tentang,komunitas,gerakan}/+page.svelte` | ● | | | | |
| `src/routes/(public)/cerita/+page.svelte` · `cerita/[slug]/+page.svelte` | ● | | | | |
| `src/routes/(public)/metode-pengukuran/+page.svelte` | ● | | | | |
| `src/routes/(public)/_view-model.js` | ● | | | | |
| `scripts/verify/public-purity.mjs` | ● | | | | |
| `src/routes/(public)/kalender/**` | | | | | ● |
| `src/routes/(public)/_calendar-view-model.js` | | | | | ● |
| `src/lib/utils/ics.js` | | | | | ● |
| `src/routes/awardee/**/+page.svelte` | | ● | | | |
| `src/routes/awardee/_components/**` | | ● | | | |
| `src/routes/verifikator/**` | | | ● | | |
| `src/routes/admin/**/+page.svelte` · `src/routes/admin/+page.svelte` | | | | ● | |
| `src/lib/charts/**` | | | | ● | |
| `src/lib/components/EChart.svelte` | | | | ● | |
| `src/lib/stores/admin.svelte.js` | | | | ● | |

**Nol sel ganda pada setiap baris.** File di luar tabel ini **beku selama G3-B**, termasuk: `src/routes/awardee/+layout.svelte`, `src/routes/admin/+layout.svelte`, `src/lib/data/navigation.js`, `src/lib/data/icons.js`, `src/lib/data/photos.js`, `src/lib/components/index.js`, seluruh `src/lib/components/editorial/**` (termasuk `view-model.js`), `src/lib/components/{Header,Footer,PageHeader,KpiCard,EventListPanel}.svelte`, `src/lib/stores/{session,catalog,editorial,impact}.svelte.js`, `src/app.css`, `src/app.html`, `static/**`, dan seluruh `src/lib/domain/**`.

> **Peringatan khusus WP-04: kamu TIDAK memiliki seluruh `(public)/**`.** Tiga berkas zona publik dimiliki paket lain dan **beku bagimu**: `(public)/masuk/+page.svelte` dan `(public)/daftar/+page.svelte` (**WP-02**, sudah selesai di G2: termasuk pembersihan PO-2 pada `/daftar`), serta `(public)/kalender/**` dan `(public)/_calendar-view-model.js` (**WP-08**, berjalan bersamaan denganmu). Yang kamu miliki adalah **sepuluh berkas yang tercantum di tabelmu, tidak lebih**.

**File yang dimiliki lintas gelombang** (sah, karena gelombang berurutan: dicatat agar tidak dikira bentrok):

| File | G1 | G2 | G3-A | G3-B | G4 |
|---|:--:|:--:|:--:|:--:|:--:|
| `src/lib/components/index.js` | rename mekanis | +`ZoneGuard` | +komponen editorial |: |: |
| `src/lib/components/{Header,BottomNav,Sidebar,Footer}.svelte` | rename jalur + docblock | kosongkan fallback nav | masthead & footer + props `profileHref`/`notificationHref`/`roleLabel` (Header) |: |: |
| `src/lib/components/{PageHeader,KpiCard}.svelte` |: |: | `font-sans` eksplisit (mitigasi `--font-display`) |: |: |
| `src/lib/stores/session.svelte.js` | rename mekanis | **TULIS ULANG** (WP-02) |: | **beku** |: |
| `src/lib/stores/catalog.svelte.js` | rename mekanis | +`publishedEvents`, `+upcomingEvents` |: |: |: |
| `src/lib/stores/admin.svelte.js` | rename mekanis (`ID_ADMIN`) |: |: | read-only moderasi + data chart (WP-07) |: |
| `src/lib/components/{AwardeeCard,EventCard,StoryCard}.svelte` | rename |: | kontrak visual baru |: |: |
| `(public)/{+page.svelte,_view-model.js,cerita/[slug]/+page.svelte}` | rename mekanis |: |: | redesign (WP-04) |: |
| `(public)/komunitas/+page.svelte` | rename mekanis (`catalog.awardees`) |: |: | redesign (WP-04) |: |
| `(public)/masuk/+page.svelte` | rename mekanis | tulis ulang jadi formulir |: | **beku** |: |
| `(public)/daftar/+page.svelte` | rename mekanis (`AWARDEE_STATUS*`) | bersihkan PO-2 |: | **beku** |: |
| `admin/laporan/+page.svelte` | rename mekanis (`catalog.awardees`) |: |: | chart & tata letak (WP-07) |: |
| `scripts/verify/*.mjs` | rename jalur |: |: | `public-purity.mjs` (WP-04) | asersi baru |

---

## 4. Rencana rename `/member` → `/awardee` (WP-01, atomik)

### 4.1 Sepuluh langkah, urutan wajib

| # | Langkah | Perintah/aksi konkret | Gerbang |
|---|---|---|---|
| L1 | Buat `roles.js` & `content-workflow.js` | berkas murni, nol impor luar domain | `node -e "import('./src/lib/domain/constants/roles.js')"` |
| L2 | `Member.js` → `Awardee.js` | pindah berkas; hapus `MemberRole`, field `role`, getter `isAdmin`; ganti kelas & typedef |: |
| L3 | Entity & konstanta pendukung | `community.js`: `MEMBER_STATUS`→`AWARDEE_STATUS`, `MEMBER_STATUS_META`→`AWARDEE_STATUS_META`; `STORY_STATUS_META[*]` **TAMBAH** `peranAktor:UserRole` **tanpa menghapus** `aktor` (lihat catatan L3-a). `CommunityEvent.js`: `EventStatus` + `DIUSULKAN`/`DITOLAK` **beserta entri padanannya di `EVENT_STATUS_META`** (lihat catatan L3-b), tambah flag `publik` pada `EVENT_STATUS_META` + helper `kegiatanTampilPublik(status)` **berargumen tunggal**, field `slug/proposedBy/proposedByRole/reviewedBy/reviewedAt/reviewNote/publishedAt`, getter `isProposal/isPubliclyVisible/monthKey/occursOn`, rename `registeredMemberIds`→`registeredAwardeeIds`, `attendeeMemberIds`→`attendeeAwardeeIds`. `Story.js`: `memberId`→`authorId`, tambah `reviewerId/reviewedAt/publishedById/revisionCount`. `Broadcast/Movement/PointActivity/ConsentRecord`: `memberId`→`awardeeId` | `verify:domain` |
| L4 | Service & policy | `KpiCalculator`, `LeaderboardService`, `TierResolver`, `GamificationEngine`, `FeatureEligibilityPolicy`, `Repository.js` (perluas catatan kriteria `query()`: `{email},{role},{authorId},{reviewerId},{status}`) | `verify:domain` |
| L5 | Infrastruktur | `db.js` v2 + `accounts`; `MemberRepository`→`AwardeeRepository`; `AccountRepository` baru; delapan repository lain `memberId`→`awardeeId`; `index.js` |: |
| L6 | Seed | `seed-data.js` rename + 4–6 event mendatang + 2 event `DIUSULKAN`; `accounts.js`; `bootstrap.js` `SEED_VERSION=2`, `PEMETAAN` + `accounts` | `node scripts/verify/seed-test.mjs` |
| L7 | Store | lima store: `member`→`awardee`, `memberId`→`awardeeId` | `verify:compile` |
| L8 | Komponen | `MemberCard.svelte`→`AwardeeCard.svelte`; `index.js`; `Header/BottomNav/Sidebar` jalur `/member/*`→`/awardee/*` | `verify:compile` |
| L9 | Route | pindah direktori `src/routes/member/` → `src/routes/awardee/`; `admin/anggota/` → `admin/awardee/`; perbaiki seluruh `href` & docblock | `npm run build` |
| L10 | Skrip verifikasi | lima berkas `scripts/verify/*.mjs` | `npm run verify` |

**Catatan L3-a: `aktor` DITAMBAHI, bukan diganti.** `STORY_STATUS_META[*].aktor` (`community.js:178, :186, :194, :202, :210, :218, :226`) adalah **label UI berbahasa Indonesia** dengan satu konsumen nyata: `awardee/cerita/+page.svelte:445`: `Bola ada di {cerita.statusMeta.aktor}.` Menghapusnya membuat halaman merender **"Bola ada di undefined."**: kompilasi lolos, `npm run build` lolos, `verify:domain` lolos, dan cacatnya baru terlihat saat peragaan. `peranAktor: UserRole` **ditambahkan** di sebelahnya karena guard dan tombol harus membaca enum, bukan prosa.

**Catatan L3-b: lokasi `EVENT_STATUS_META` dan konsekuensi lupa mendaftarkannya.** `EventStatus` (`:61`) dan `EVENT_STATUS_META` (`:72`) berada di **`src/lib/domain/entities/CommunityEvent.js`**, **bukan** di `community.js`. Konstruktor `CommunityEvent.js:168` melakukan `if (!Object.hasOwn(EVENT_STATUS_META, status)) throw`: menambahkan `DIUSULKAN`/`DITOLAK` hanya ke `EventStatus` tanpa mendaftarkannya di META akan **melempar dan menjatuhkan seluruh halaman** pada baris seed pertama yang memakainya.

**Jangan** menjalankan `sed` buta atas seluruh repo. Kata `member` muncul di dalam kata Indonesia (`memberi`, `pemberitahuan`, `memberikan`): 1 kejadian sudah terkonfirmasi di `src/lib/utils/format.js:183` (file BEKU). Pakai pencocokan batas kata dan periksa hasilnya.

### 4.2 Berkas yang DIPINDAH

| Dari | Ke |
|---|---|
| `src/routes/member/+layout.svelte` | `src/routes/awardee/+layout.svelte` |
| `src/routes/member/+page.svelte` | `src/routes/awardee/+page.svelte` |
| `src/routes/member/kabar/+page.svelte` · `kabar/[id]/+page.svelte` | `src/routes/awardee/kabar/…` |
| `src/routes/member/{aksi,kalender,gerakan,cerita,papan-peringkat,penghargaan,direktori,profil}/+page.svelte` | `src/routes/awardee/…` |
| `src/routes/admin/anggota/+page.svelte` | `src/routes/admin/awardee/+page.svelte` |
| `src/lib/domain/entities/Member.js` | `src/lib/domain/entities/Awardee.js` |
| `src/lib/infrastructure/repositories/MemberRepository.js` | `…/AwardeeRepository.js` |
| `src/lib/components/MemberCard.svelte` | `src/lib/components/AwardeeCard.svelte` |

### 4.3 Rujukan `path:baris` yang WAJIB ikut berubah

**Definisi sesi**: `src/lib/stores/session.svelte.js`: `:9` · `:24` · `:44-52` (`SessionRole` → hapus) · `:55-58` (`BERANDA`) · `:69-76` (`PROFIL_ADMIN` → hapus) · `:75` · `:82` · `:104` · `:121` · `:130` · `:148` (`isMember`) · `:150` (`isAdmin`) · `:194` (`loginAsMember`) · `:213-215` (`loginAsAdmin`) · `:247-249` (`homePath`) · `:265` · `:297` · `:310`.

**Importir `session`**: `stores/admin.svelte.js:40` & `:335` · `stores/gamification.svelte.js:37` · `stores/leaderboard.svelte.js:30` · `(public)/masuk/+page.svelte:31` · `admin/+layout.svelte:25` · `member/+layout.svelte:35` · `member/+page.svelte:43` · `member/cerita/+page.svelte:45` · `member/direktori/+page.svelte:43` · `member/gerakan/+page.svelte:46` · `member/kalender/+page.svelte:46` · `member/papan-peringkat/+page.svelte:49` · `member/penghargaan/+page.svelte:56` · `member/profil/+page.svelte:50`.

**Pemakaian API sesi lama**: `(public)/masuk/+page.svelte:7, :14, :78, :84, :96, :97, :239, :240` · `admin/+layout.svelte:75, :100, :118, :121, :122`.
**Perhatian:** `src/lib/domain/entities/Member.js:366` `get isAdmin()` adalah **konteks berbeda** (peran di komunitas): getter ini **dihapus**, bukan direname.

**Literal jalur `/member`**: `stores/session.svelte.js:56` · `components/Header.svelte:84, :101` · `components/BottomNav.svelte:30-34, :45` · `components/Footer.svelte:6` · `infrastructure/repositories/BroadcastRepository.js:26` · `member/+layout.svelte:47-61, :104, :111, :145` · `member/+page.svelte:125, :292, :375, :394` · `member/aksi/+page.svelte:93-98, :101, :266` · `member/kabar/+page.svelte:148` · `member/kabar/[id]/+page.svelte:224, :230` · `member/direktori/+page.svelte:307, :327, :555, :558` · `member/profil/+page.svelte:350, :387` · `admin/+layout.svelte:121`.
**Docblock header**: `member/direktori:3` · `member/papan-peringkat:3` · `member/kalender:3, :22` · `member/cerita:3, :22` · `member/kabar:20` · `member/gerakan:3, :21` · `member/penghargaan:3` · `member/+layout.svelte:25`.

**Skrip**: `scripts/verify/e2e-routes.mjs:34-43, :242` · `scripts/verify/e2e-gamification.mjs:153, :160, :162, :209` · `scripts/verify/screenshot.mjs:25-31`.

**Nav yang terduplikasi** (sumber ganda: wajib dipangkas ke `navigation.js` di WP-02): `member/+layout.svelte:46-62` (10 entri) vs `components/BottomNav.svelte:29-35` (5 entri) · `admin/+layout.svelte:39-58` (7 entri) vs `components/Sidebar.svelte:27-35` (7 entri).

---

## 5. Aturan menulis kode (berlaku untuk semua paket)

### 5.1 JSDoc & komentar

| # | Aturan |
|---|---|
| J-1 | Setiap berkas dibuka blok JSDoc: **tanggung jawab** berkas, **keputusan desain yang tidak terbaca dari kode**, dan `@see` ke halaman sumber/dokumen. |
| J-2 | Komentar **Bahasa Indonesia**, kalimat penuh. Jelaskan **mengapa**, bukan **apa**. Komentar yang mengulang kode = dihapus. |
| J-3 | Setiap export publik punya `@param` + `@returns` bertipe. Typedef untuk objek yang melintasi batas paket. |
| J-4 | Dilarang: `TODO`, `FIXME`, `Coming soon`, `Lorem ipsum`, `User 1`, komentar yang dibiarkan menggantung. |
| J-5 | Setiap keputusan yang tampak aneh **wajib** dibela di komentar (mis. alasan `PasswordHash` sinkron, alasan `ready` terpisah dari `isAuthenticated`). |

### 5.2 Penamaan

| # | Aturan |
|---|---|
| N-1 | **Identifier Inggris, teks UI Indonesia.** Pengecualian yang dipertahankan: helper domain yang sudah Indonesia (`aturanSkor`, `poinUntuk`, `tierUntukPoin`, `komunitas`, `chapter`). Fungsi domain **baru** ikut pola berkasnya. |
| N-2 | Kelas `PascalCase`; fungsi/variabel `camelCase`; konstanta modul `SCREAMING_SNAKE`; enum objek `Object.freeze` bernama `PascalCase`. |
| N-3 | Berkas store `*.svelte.js`; komponen `PascalCase.svelte`; modul internal paket diawali `_`. |
| N-4 | Kata `member` **dilarang** sebagai identitas peran. Kata `user` hanya untuk akun (`UserAccount`, `UserRole`), bukan untuk penerima manfaat. |
| N-5 | Nama boolean berawalan `is`/`has`/`can`/`should`. |

### 5.3 Larangan angka literal

| # | Aturan |
|---|---|
| A-1 | Nilai poin **hanya** dari `poinUntuk()`/`SCORING_TABLE`. Ambang tier **hanya** dari `TIER_TABLE`/`tierUntukPoin()`. Ambang fitur publik **hanya** `AMBANG_FITUR_PUBLIK`. |
| A-2 | Target KPI & koefisien jangkauan **hanya** dari `kpi-targets.js`. SLA **hanya** dari `SLA_HARI_KERJA`. Kuota anti-gaming **hanya** dari `SCORING_TABLE`. |
| A-3 | Heksadesimal warna **hanya** boleh di `src/lib/charts/_chartTheme.js` dan `src/app.css`. Komponen memakai token/kelas. |
| A-4 | Uji cepat: `grep -rnE "\b(25\|50\|100\|150)\s*(poin\|points)" src` di luar `domain/constants/` harus nihil. |

### 5.4 Arah ketergantungan

```
Presentation (routes, components, stores)  →  Application (services)  →  Domain  ←  Infrastructure
```

| # | Aturan |
|---|---|
| D-1 | `src/lib/domain/**` **dilarang** mengimpor `svelte`, `dexie`, `$app/*`, `$lib/stores`, `$lib/components`, `$lib/infrastructure`. Diverifikasi otomatis di §6.2. |
| D-2 | Service domain menerima repository **lewat konstruktor, tanpa nilai bawaan**. Nilai bawaan akan menyeret Dexie ke domain lewat pintu belakang. |
| D-3 | Perakitan terjadi di store (composition root): `new AuthService({ accountRepo: accountRepository, awardeeRepo: awardeeRepository })`. **Tidak ada `container.js`**: barrel repository sudah menjadi composition root, dan konstruktor berparameter sudah menjadi seam uji (K-1 tetap berlaku). |
| D-4 | `src/routes/(public)/**` **dilarang** mengimpor `$lib/infrastructure/**`. Angka publik hanya lewat store `impact`/`catalog`. |
| D-5 | Store **mendelegasikan** keputusan ke domain; dilarang menyalin logika kebijakan ke store. |
| D-6 | Komponen bersama (`Sidebar`, `BottomNav`, `ZoneGuard` pengecualian) **dilarang** mengimpor store; terima lewat props. |

### 5.5 Ukuran & bentuk

| # | Batas | Bila terlampaui |
|---|---|---|
| U-1 | Komponen `.svelte` bersama ≤ **400 baris** | Pecah menjadi subkomponen |
| U-2 | `+page.svelte` ≤ **700 baris** | Pindahkan logika ke `_view-model.js` / `_components/` |
| U-3 | Modul `.js` ≤ **600 baris** | Pecah per tanggung jawab |
| U-4 | Fungsi ≤ **50 baris**, kedalaman percabangan ≤ 3 | Ekstrak fungsi bernama |
| U-5 | Kelas Tailwind ditulis sebagai **string utuh**: `bg-${warna}-500` tidak pernah ter-generate (Tailwind 4 memindai kode sebagai teks) |: |

### 5.6 Determinisme seed (wajib, WP-01)

| # | Aturan |
|---|---|
| S-1 | **Dilarang** menyisipkan draw `rng()` baru **sebelum** generator yang sudah ada. Setiap draw tambahan menggeser 60 profil + 639 aktivitas + distribusi tier. |
| S-2 | `bangkitkanAkun()` **nol** pemanggilan rng: pemetaan murni dari daftar awardee, dipanggil **paling akhir** di `buildSeed()`. |
| S-3 | Kata sandi = konstanta literal `SANDI_DEMO`; hash = `PasswordHash.of(SANDI_DEMO, account.id)`: sinkron, deterministik. |
| S-4 | `createdAt` akun diturunkan dari `awardee.joinedAt`; **dilarang** `new Date()` di dalam seed. |
| S-5 | `Math.random()` dan `Date.now()` **dilarang** di seluruh jalur seed. `TODAY = 2026-07-20T00:00:00+07:00` tetap. |
| S-6 | Akun sorotan pada panel demo dipilih deterministik (poin tertinggi berstatus AKTIF, tie-break `id` menaik), bukan hasil rng. |
| S-7 | Setiap field baru **wajib** didaftarkan di konstruktor entity **dan** `toJSON()`. Entity melakukan destructuring tetap lalu `Object.freeze`; field yang tidak terdaftar **hilang diam-diam** pada penyimpanan pertama. |

---

## 6. Rencana verifikasi

### 6.1 Perintah

| Perintah | Cakupan | Kapan |
|---|---|---|
| `npm run verify:compile` | Kompilasi seluruh `.svelte` dengan compiler Svelte 5 | Setiap kali menyentuh `.svelte` |
| `npm run verify:domain` | Aturan domain vs angka kanonik Hal 11/12 | Setiap kali menyentuh `src/lib/domain/**` |
| `node scripts/verify/seed-test.mjs` | Setiap baris seed dikonstruksi jadi entity sungguhan | Setiap kali menyentuh seed/entity |
| `node scripts/verify/public-purity.mjs` | Kemurnian zona publik (PO-2) | Gerbang G3-B & G4 |
| `npm run build` | Build produksi `adapter-static` | Gerbang setiap paket |
| `npm run verify` | `verify:compile && verify:domain && build` | Gerbang setiap gelombang |
| `npm run dev` + `npm run verify:e2e` | Asap 36 route di peramban sungguhan | Gerbang G4 |
| `npm run screenshot` | Bukti visual sebelum/sesudah | Gerbang G4 |

### 6.2 Yang WAJIB ditambahkan ke skrip verifikasi

| Skrip | Tambahan | Pemilik |
|---|---|---|
| `domain-test.mjs` | (1) `PasswordHash.of(x, s)` dua kali → nilai identik; `matches` benar/salah. (2) Matriks `AccessPolicy.canAccess` 6 keadaan × 4 zona (§6.4). (3) `AccessPolicy.canSeeScoring(null) === false` dan `canSeeScoring(UserRole.VERIFIER) === false`. (4) `safeNext('//evil.com', role)` → `homePathFor(role)`. (5) Seluruh transisi §2.2 legal/ilegal per peran. (6) `UserAccount` melempar untuk `awardeeId` yang salah pasangan. (7) **Pemindai lapisan**: `src/lib/domain/**` tidak memuat impor `svelte`/`dexie`/`$app`/`$lib/stores`/`$lib/infrastructure`. | WP-09 |
| `seed-test.mjs` | `accounts.length === 63`; 60 `AWARDEE` + 2 `VERIFIER` + 1 `ADMIN`; email unik; setiap `awardeeId` menunjuk awardee yang ada; `PF-CORSEC-01` sama dengan `validatorId` di seed cerita; `SANDI_DEMO` cocok untuk seluruh akun; ≥6 event mendatang; ≥2 event `DIUSULKAN`; distribusi tier tetap 22/16/12/7/3. | WP-09 |
| `e2e-routes.mjs` | Empat daftar route: `RUTE_PUBLIK` (11), `RUTE_AWARDEE` (12), `RUTE_VERIFIKATOR` (6), `RUTE_ADMIN` (7). Login lewat formulir `/masuk` per peran sebelum menguji zonanya. Tambahan asersi: `/awardee` sebagai tamu **mendarat** di `/masuk?next=…`. **WAJIB: ganti detektor `terkunci` (`:171`).** Hari ini ia mencocokkan teks `/Pilih peran\|Masuk ke Pfriends\|Konsol khusus pengelola/`: ketiganya berasal dari pemilih peran `/masuk` (ditulis ulang WP-02) dan `admin/+layout.svelte:110` (diganti `ZoneGuard`). Setelah V2, `terkunci` tidak akan pernah `true`, `salahHalaman` (`:244`) mati, dan skrip melaporkan 36 route hijau **bahkan bila seluruh zona ter-login menampilkan panel "bukan peran Anda"**: G4 kehilangan satu-satunya asersi yang menguji PO-3. Pengganti: `terkunci = !!document.querySelector('[data-zone-denied],[data-zone-splash]')`. **Atribut, bukan teks**, supaya deteksi tidak ikut basi saat copy berubah. `ZoneGuard.svelte` (§2.13, milik WP-02) **wajib** memasang kedua atribut itu. Pola tombol lama `/Admin PF\|Anggota komunitas\|Masuk sebagai …/` (`:191`, `:201`) diganti pengiriman formulir. | WP-09 |
| `screenshot.mjs` | Ganti 7 entri `peran:'member'` → `awardee`; tambah `/kalender`, `/verifikator`, `/verifikator/cerita`, `/metode-pengukuran`. | WP-09 |
| `e2e-gamification.mjs` | Jalur `/member/*` → `/awardee/*`; login lewat formulir. | WP-09 |
| `public-purity.mjs` | **BARU.** Pemindai statis `src/routes/(public)/**`: gagal bila menemukan impor `scoring-table.js`/`tier-table.js`/`TierBadge`/`PointsChip`/`TierProgress`/`LeaderboardRow`/`BadgeTile`/`$lib/infrastructure`, atau string UI ber-kata `poin`/`tier`/`peringkat`/`lencana` di luar `/daftar` & `/metode-pengukuran`. **Tambahan:** `<img` tanpa `alt` non-kosong = gagal; `py-12` berulang >2 kali atau pola judul `text-2xl … md:text-3xl` berulang >2 kali di `(public)/+page.svelte` = gagal (D-10/D-04). Skrip ini adalah **satu-satunya** gerbang PO-2 yang mengikat; tiga `grep` manual di `docs/11` §11.1 hanya pemeriksaan cepat dan tunduk pada daftar pengecualian yang sama. | WP-04 (dibuat), WP-09 (diwire ke `npm run verify`) |
| `package.json` | Blok `scripts`: tambah `"verify:public": "node scripts/verify/public-purity.mjs"` dan `"verify:seed": "node scripts/verify/seed-test.mjs"`; `verify` menjadi `verify:compile && verify:domain && verify:seed && verify:public && build`. **Blok dependencies tetap beku.** | WP-09 |

### 6.3 Definisi "HIJAU"

Sebuah paket **selesai** hanya bila **seluruh** butir berikut benar:

| # | Butir |
|---|---|
| 1 | `npm run build` sukses, nol error. |
| 2 | `verify:compile` 0 gagal kompilasi; warning aksesibilitas tidak bertambah dari baseline. |
| 3 | `verify:domain` + `verify:seed` + `verify:public` seluruhnya lulus. |
| 4 | Nol impor menggantung; nol komponen/fungsi dirujuk tapi tidak ada. |
| 5 | Nol teks placeholder (`TODO`, `Lorem ipsum`, `Coming soon`, `User 1`). |
| 6 | Seluruh teks yang dilihat pengguna Bahasa Indonesia; seluruh identifier Inggris. |
| 7 | Nol angka poin/ambang tier/SLA literal di luar `domain/constants/`. |
| 8 | Setiap halaman punya keadaan kosong yang layak. |
| 9 | Lebar 375 px: nol scroll horizontal; grid asimetris runtuh menjadi satu kolom yang terbaca. |
| 10 | Nol file di luar kepemilikan paket yang berubah (`git` tidak ada: bandingkan daftar file yang kamu sentuh dengan §3). |
| 11 | Ringkasan akhir agen menyebut: file yang disentuh, kontrak §2 yang dipakai, dan penyimpangan (bila ada) beserta alasannya. |

### 6.4 Matriks perilaku guard (dipakai sebagai daftar uji)

| Keadaan | `/awardee/aksi` | `/verifikator/cerita` | `/admin` | `/cerita` · `/kalender` | `/masuk` |
|---|---|---|---|---|---|
| `session.ready === false` | splash | splash | splash | render (publik) | splash |
| Tamu | → `/masuk?next=/awardee/aksi` | → `/masuk?next=…` | → `/masuk?next=…` | render | render formulir |
| AWARDEE | render | panel "bukan peran Anda" | panel | render | → `/awardee` |
| VERIFIER | panel | render | panel | render | → `/verifikator` |
| ADMIN | panel | panel | render | render | → `/admin` |
| Baru `logout()` dari `/admin` |: |: | → `/masuk` seketika | render | render formulir |

**Kapan tiap kolom diuji.** Kolom `/awardee/aksi`, `/admin`, `/cerita`, dan `/masuk` diuji di gerbang **G2**
(WP-02). Kolom `/verifikator/cerita` diuji di **G3-B** oleh WP-06, dan `/kalender` di **G3-B** oleh WP-08 :
route-nya belum ada saat G2, dan WP-02 **dilarang** membuatnya. Baris `splash` diverifikasi lewat kehadiran
atribut `data-zone-splash`; baris `panel` lewat `data-zone-denied` (§2.13).

---

## 7. Risiko integrasi & mitigasi

| # | Risiko | Gejala saat terjadi | Mitigasi WAJIB | Pemilik |
|---|---|---|---|---|
| R-01 | **`DB_VERSION` naik, `SEED_VERSION` tidak.** `bootstrap.js:77-80` early-return saat versi cocok. | Tabel `accounts` **ada tapi kosong selamanya**; login mustahil; **tanpa pesan galat** karena `query()` hanya mengembalikan array kosong. | Naikkan **keduanya dalam satu langkah** (L5–L6). Gerbang WP-01 butir 7 memeriksanya. | WP-01 |
| R-02 | **`SCHEMA_V1` disunting di tempat** alih-alih `.version(2)` append. | Rantai warisan Dexie putus; tabel yang tidak disebut bisa terhapus beserta isinya. | `SCHEMA_V1` **hanya** boleh diubah pada penggantian `[TABLE.MEMBERS]` → literal `'members'`. `SCHEMA_V2` ditambahkan, bukan menimpa. | WP-01 |
| R-03 | **Versi mundur / `VersionError`.** Peramban pernah membuka v2 lalu menjalankan kode v1. | `db.js` tanpa try/catch → **seluruh aplikasi mati**, bukan satu halaman. | `getDb()` **wajib** `await instance.open()` **di dalam** `try`: tanpa itu Dexie membuka basis data secara malas pada operasi tabel pertama (`getMeta()` `db.js:113`, `DexieRepository.table()` `:78-80`), di luar `try` mana pun, dan mitigasi ini **inert**. `catch (e)` yang cocok `VersionError\|UpgradeError\|DatabaseClosedError` → `await Dexie.delete(DB_NAME)` lalu bangun & buka ulang. Bentuk lengkap di §2.11. | WP-01 |
| R-04 | **Bug laten `db.js:93-102`:** `pending = null` hanya di jalur sukses. | Sekali impor Dexie gagal, **setiap** `getDb()` berikutnya mengembalikan promise ditolak yang sama selamanya. | Tambahkan `finally { pending = null }`. | WP-01 |
| R-05 | **Sesi lama di localStorage** berbentuk `{role:'member'}`. | Pengguna lama masuk dengan peran yang tidak dikenal; guard bingung. | `bacaSesiTersimpan()` memvalidasi terhadap `UserRole`; nilai tak dikenal → **tamu**, tanpa galat. Uji manual wajib di gerbang WP-02. | WP-02 |
| R-06 | **Route lama `/member/*` di-bookmark.** | 404 SPA tanpa penjelasan. | `src/routes/+error.svelte` [BARU] menjelaskan Bahasa Indonesia + tautan `/` dan `/masuk`. **Tidak** ada pengalihan legacy: mockup tidak menanggung utang kompatibilitas. | WP-02 |
| R-07 | **Field baru hilang diam-diam.** Entity destructuring tetap + `Object.freeze`; `toRow()` menyimpan `toJSON()`. | `proposedBy` tersimpan `undefined`; antrean verifikator kosong tanpa sebab. | Aturan S-7: setiap field baru didaftarkan di konstruktor **dan** `toJSON()`. `seed-test.mjs` mengonstruksi ulang setiap baris. | WP-01 |
| R-08 | **Transaksi seed tidak mencakup `accounts`.** `bootstrap.js:96-106` hanya membuka tabel di `PEMETAAN`. | `NotFoundError` di dalam transaksi. | Daftarkan tabel di **tiga** tempat: `TABLE`, `SCHEMA_V2`, `PEMETAAN`. Tidak kurang. | WP-01 |
| R-09 | **Event `DIUSULKAN` bocor ke kalender publik.** `isUpcoming()` hanya mengecualikan yang dibatalkan. | Usulan mentah tampil sebagai agenda resmi. | Penyaring publik **tunggal**: `event.isPubliclyVisible`. Dilarang menyaring dengan `status !== 'DIBATALKAN'` di komponen. Gerbang WP-08 butir 4. | WP-01, WP-08 |
| R-10 | **Determinisme seed pecah** karena draw rng disisipkan lebih awal. | Distribusi tier & total poin berubah; `domain-test`/`seed-test` merah; screenshot lama tidak lagi cocok. | Aturan S-1…S-6; gerbang WP-01 butir 5 membandingkan 22/16/12/7/3 dan `totalPoints === 3234`. | WP-01 |
| R-11 | **Komponen gamifikasi menjadi yatim** setelah dicabut dari publik. | `PointsChip`/`TierBadge` disangka mati lalu dihapus → zona Awardee rusak. | Komponen gamifikasi **tetap hidup**: dipakai `Header`, `ToastHost`, `LeaderboardRow`, `RewardCard`, `TierProgress`, `EventCard` (mode `showPoints`), dan 9 halaman `/awardee`. **Dilarang menghapusnya.** | WP-03, WP-05 |
| R-12 | **Dua paket G3-B saling menunggu komponen.** | Paket selesai lebih dulu menemukan build merah karena impor belum ada. | WP-03 dituntaskan **sebelum** G3-B dimulai (ketukan terpisah). Selama G3-B, kontrak §2.13 sudah final dan tidak berubah. | Orkestrator |
| R-13 | **`UNSPLASH_ACCESS_KEY` tidak tersedia** saat mengunduh foto. | `static/img/` kosong; `<img>` rusak di seluruh halaman. | `foto(key)` mengembalikan `null`; setiap komponen **wajib** punya fallback tipografis (bukan gradien). Halaman tetap layak tanpa satu pun foto. | WP-03 |
| R-14 | **Bundel ECharts membengkak** ke halaman publik yang tidak punya chart. | ±1 MB dibayar semua pengunjung. | `import 'echarts'` **hanya** di `src/lib/charts/_echarts.js` (tree-shaken); zona publik tidak mengimpor chart apa pun. Gerbang WP-07 butir 1. | WP-07 |
| R-15 | **`EChart` membongkar canvas tiap filter berubah.** `option` dibaca di dalam efek siklus hidup. | Kedipan putih, animasi hilang, `import('echarts')` berulang di `/admin` yang memuat 6+ chart. | Pisahkan tiga efek: siklus hidup (`container`), data (`setOption` + `notMerge`), interaksi (`on`/`off`). | WP-07 |
| R-16 | **Verifikator meninjau karyanya sendiri** lewat konsol. | Kontrol governance paling dasar bocor. | Ditegakkan di `ContentReviewService` (layer policy), bukan disembunyikan di UI. Diuji di `domain-test.mjs`. | WP-02, WP-06 |
| R-17 | **Dua sumber kredensial demo** (repository + komponen `/masuk`). | Tombol "isi otomatis" gagal login setelah kata sandi diubah. | Kredensial hidup **sekali** di `seed/accounts.js`; `/masuk` membacanya lewat `accountRepository.demoAccounts()` yang **tidak** mengembalikan kata sandi. | WP-01, WP-02 |
| R-18 | **Nav terduplikasi kembali** (4 sumber hari ini → berpotensi 6 dengan tiga zona). | Menambah satu route awardee butuh menyunting dua berkas; salah satu terlupa. | Seluruh definisi nav **hanya** di `src/lib/data/navigation.js`; fallback internal `Sidebar`/`BottomNav` dikosongkan. Berkas ini beku selama G3-B. | WP-02 |
| R-19 | **Zona publik menyentuh repository** untuk mengambil angka. | Arah ketergantungan pecah; PO-2 sulit dijaga. | Aturan D-4 + gerbang `public-purity.mjs`. Satu-satunya jalan: store `impact` & `catalog`. | WP-04 |
| R-20 | **Agen menyentuh file milik paket lain** karena "cuma satu baris". | Pekerjaan agen lain hilang tanpa jejak; tanpa git tidak ada pemulihan. | KP-1…KP-5. Setiap agen **wajib** mencantumkan daftar file yang disentuh di ringkasan akhirnya; orkestrator membandingkannya dengan §3. | Semua |
| R-21 | **Agen membaca penomoran WP lama di `docs/10`/`docs/11`.** "WP-5" di doc 11 = WP-03 di sini; "WP-6" = WP-04. | Agen WP-05 (Awardee) menyunting `app.css`/`app.html`/`editorial/**`; agen WP-06 (Verifikator) menulis `(public)/_view-model.js` yang sedang ditulis ulang WP-04 pada gelombang yang sama. Tanpa git, versi yang kalah hilang permanen. | §0 mencabut penomoran lama secara eksplisit; kepala `docs/11` dan `docs/10` §11.1 memuat koreksi yang sama. Orkestrator **wajib** memberi agen nomor paket dari §3 dokumen ini, bukan dari doc 10/11. | Orkestrator |
| R-22 | **Props tak dikenal pada komponen Svelte 5 diabaikan tanpa error.** `EditorialHero image=` vs `src=`, `PhotoFigure width=` vs tanpa, `MonthCalendar onselect` vs `onSelect`. | `verify:compile` 0 gagal, `npm run build` sukses, gerbang G3-B **hijau**: sementara hero merender tanpa foto dan kalender tanpa penanda. Kegagalan yang lolos seluruh gerbang §6.3. | §2.13 adalah kontrak **final** berikut peta nama lama→final; `docs/11` §8 disunting agar identik. WP-04/05/06/08 menyalin nama & props dari §2.13, **bukan** dari doc 11. Gerbang §6.3 butir 4 diperluas: setiap prop yang dioper wajib ada di typedef §2.13. | WP-03, semua G3-B |
| R-23 | **`admin.svelte.js` menulis status cerita langsung** (`:150`, `:164`, `:201`), melewati `ContentReviewService`. | Dua jalur penulisan status; jalur admin tidak memeriksa `canTransitionStory`, tidak memeriksa `isSelfReview` (R-16), tidak memeriksa `sensitivityConfirmed` lewat domain. PO-4 bocor lewat `/admin/moderasi`. | Gerbang WP-07 butir 8: `approve()`/`requestRevision()` dihapus; `/admin/moderasi` read-only; takedown lewat `ContentReviewService.archiveStory`. | WP-07 |
| R-24 | **`session.login()` berjalan sebelum `bootstrapDatabase()`.** | Tabel `accounts` kosong → `KREDENSIAL_SALAH` untuk kredensial demo yang **benar**, pada login pertama di depan penonton. | §2.12: `bootstrapDatabase()` adalah langkah pertama `login()`. Gerbang WP-02 butir 3b menguji IndexedDB kosong. | WP-02 |

---

## 8. Amandemen resmi terhadap `docs/09-BUILD-CONTRACT.md`

| Pasal 09 | Status | Pengganti |
|---|---|---|
| §3: 25 route, zona `member` | **DIGANTI** | §2.14: 36 route, zona `awardee`/`verifikator`/`admin` |
| §4: WP-1…WP-8 & daftar beku | **DIGANTI** | §1.2 & §3 |
| §5: `session.loginAsMember/loginAsAdmin`, `MemberCard`, `MEMBER_STATUS` | **DIGANTI** | §2.12 (`session.login`), `AwardeeCard`, `AWARDEE_STATUS` |
| §5: kontrak service | **DIPERLUAS** | + `AuthService`, `ContentReviewService`, `ProgramImpactService`, `AccessPolicy`, `Validator` |
| §6: aturan seed | **DIPERLUAS** | + 63 akun, 4–6 event mendatang, 2 event usulan, S-1…S-7 |
| §7: Definition of Done | **DIPERLUAS** | §6.3 (11 butir) |
| §1 K-1 (tanpa DI container) · K-2 (6 store) · K-3 (tier murni ambang) · K-5 (identifier Inggris) · §2 (angka kanonik) · §8 (tanpa dependensi baru) | **TETAP BERLAKU PENUH** |: |

> K-2 diperluas dari 6 menjadi **8 store** (`+ editorial`, `+ impact`). Alasannya sama dengan alasan aslinya: satu store per **konteks pemakaian**. Alur editorial dan angka dampak publik adalah dua konteks yang tidak dimiliki store mana pun yang ada, dan menempelkannya ke `catalog` akan membuat zona publik ikut memuat antrean moderasi.

### 8.1 Amandemen resmi terhadap `docs/10-REVISION-SPEC.md`

| Pasal 10 | Status | Pengganti / alasan |
|---|---|---|
| §3.6 nama modul: `RouteAccessPolicy.js`, `Role`, `ROLE_META`, `Zone`/`ZONE_PREFIX`/`ZONE_ROLES` di `roles.js` | **DIGANTI** | §2.1 & §2.6: `AccessPolicy.js`, `UserRole`, `USER_ROLE_META`; `Zone`/`ZONE_PREFIX`/`ZONE_ROLES` hidup di `AccessPolicy.js` |
| §3.6 flag `session.hydrated` (dua flag) | **DIGANTI** | §2.12: satu flag `ready` + `loading`. Halaman yang butuh entity memakai `session.awardee !== null`. Flag yang tidak pernah didefinisikan selalu `undefined` → falsy → halaman kosong tanpa error |
| §3.7 matriks guard | **DIPERLUAS** | §6.4: baris *"sudah masuk lalu membuka `/masuk`"* dipertahankan dan ditambahkan sebagai kolom |
| §5.4 & §5.8 model **dua sumbu** kegiatan: `EventReviewStatus`, `EVENT_REVIEW_STATUS_META`, `reviewStatus`, `createdById`/`createdByRole`, `kegiatanTampilPublik(reviewStatus, status)` | **DICABUT** | §2.2: satu sumbu `EventStatus` + `DIUSULKAN`/`DITOLAK`, `proposedBy`/`proposedByRole`, `kegiatanTampilPublik(status)`. `EVENT_STATUS_META` ada di `CommunityEvent.js:72` |
| §5.4 transisi **E-04** (verifikator menerbitkan kegiatannya sendiri) | **DICABUT** | §2.1 catatan: pengusul ≠ penyetuju juga untuk kegiatan. Dua akun verifikator sudah di-seed, jadi jalur ini tidak menghalangi operasi |
| §2.3 C-10 & C-11 (Verifikator ✓ menulis & mengajukan cerita) | **DIGANTI** | §2.1: `WRITE_CONTENT` VERIFIER ❌. Kepengarangan cerita hanya Awardee: kalau tidak, `isSelfReview` tidak akan pernah menyala (`awardeeId` selalu `null` untuk VERIFIER, §2.4) |
| §5.9 tanda tangan `ContentReviewService` (`archiveStory(story, reason, actor)`, konstruktor ber-`idGenerator`) | **DIGANTI** | §2.9: urutan `(entity, actor, …)` untuk semua method; konstruktor `{storyRepo, eventRepo, clock}`; `cancelEvent` ditambahkan |
| §5.8 `STORY_STATUS_META[*].aktor` | **DITEGASKAN** | `aktor` **tetap** (label UI, dibaca `awardee/cerita/+page.svelte:445`); `peranAktor: UserRole` **ditambahkan** di sebelahnya |
| §6.5 `variant: 'rail'\|'list'` | **DIGANTI** | §2.13: `'panel'\|'rail'\|'strip'`. `'list'` = alias lama, dilarang |
| §7.2 katalog 12 chart + `EditorialMetricsService` | **DIPERTAHANKAN dengan pemasok berbeda** | 11 chart baru + 6 chart lama diperbaiki (§3.5 WP-07). C-19/C-20 disuplai `ContentReviewService.pipeline()`/`.slaCompliance()` (§2.9) lewat store `editorial`: **`EditorialMetricsService` tidak dibangun** (KP-3: dua sumber kebenaran atas antrean yang sama) |
| §9.2 P-01…P-04 anggaran foto (400/250/60 KB, total 8 MB) | **DIGANTI** | `docs/11` §5 (direvisi): hero ≤400 KB · lain ≤250 KB · total ≤5 MB. Satu manifes, satu anggaran |
| §9.3 manifes "27 entri (32 berkas)" + baris **Avatar** (6 berkas) | **DIGANTI** | `docs/11` §5.1–§5.5 (**28 berkas**) adalah manifes tunggal. Baris Avatar dicabut: `docs/11` §4.6 memutuskan tidak ada wajah stok yang ditempelkan ke nama orang |
| §9.3 F-1 "12 kartu cerita memakai fallback gradien" | **DITEGASKAN & DIKOREKSI** | Seed memuat **12** cerita `TERPUBLIKASI` (diverifikasi). `docs/11` §5.4 dikoreksi dari 11 menjadi 12 |
| §11.1 penomoran `WP-A…WP-K` & daftar berkas beku | **DIGANTI** | §1.2 & §3 dokumen ini |
| §11.1 prasyarat *"hanya setelah amandemen `08-DESIGN-SYSTEM.md` disahkan"* untuk `app.css`/`app.html` | **DICABUT** | §1.2 catatan pembekuan khusus + §3.4 daftar putih. `docs/00…09` beku dan dokumen baru mulai nomor 13, sehingga prasyarat itu tidak akan pernah terpenuhi |
| §11.2 `AuthenticationService`, `ContentTransitionPolicy.allowedTransitions`, `publicSnapshot().snapshotAt`, `session.hydrated` | **DIGANTI** | §2.8 `AuthService`; §2.2 `allowedStoryTransitions`/`allowedEventTransitions` di `content-workflow.js`; §2.10 `capturedAt`; §2.12 tanpa `hydrated` |
| §10.2 DoD-09 "12 chart" | **DIGANTI** | 17 chart di `/admin` (11 baru + 6 lama diperbaiki), 4 tab |
| §10.2 DoD-10 "manifest §9.3" | **DIGANTI** | manifes `docs/11` §5 |
| §2.5 X-01…X-13, §4 klasifikasi angka A/B/C/D, §5.7 lima gerbang publikasi, §3.1–3.5 daftar route, §6 spesifikasi kalender | **TETAP BERLAKU PENUH** |: |

### 8.2 Amandemen resmi terhadap `docs/11-VISUAL-DIRECTION.md`

| Pasal 11 | Status | Pengganti / alasan |
|---|---|---|
| Penomoran **WP-5 / WP-6** (`:7`, §5.6, §8, §9, §11, §12) | **DIGANTI** | WP-5 → **WP-03**; WP-6 → **WP-04**. Kepemilikan berkas: §3 dokumen ini, bukan doc 11 |
| §8 nama komponen `EventRail`, `MiniCalendar`, `ImpactBand`, `EditorialSection` | **DIGANTI** | §2.13: `EventListPanel`, `MonthCalendar`, `DataBand`, `SectionRule`. `MiniCalendar.markers` → `MonthCalendar.events:EventCardVM[]`: beda **bentuk data**, bukan hanya nama |
| §8.1 `PhotoFigure` membaca `photo-credits.json` sendiri | **DICABUT** | Kredit hanya lewat `foto(key).credit` (§2.13). `photo-credits.json` adalah masukan bagi `photos.js`, bukan bagi komponen (KP-3) |
| §8.3 `ImpactFigure` melempar `TypeError` bila `context` kosong | **DIGANTI** | `console.warn` di dev + render label periode. Melempar dari komponen presentasi merobohkan seluruh halaman, bukan satu kartu |
| §3.4 baris `numeric`: *"dua utility, dua zona, nol tabrakan"* | **DICABUT (klaim salah)** | `@utility numeric` (`app.css:219-224`) **membaca `var(--font-display)`** dan dipakai 167× di 47 berkas. §3.4 dokumen ini mewajibkan `numeric` diubah ke `var(--font-sans)` |
| §3.4 baris `label-micro` vs daftar putih lama "ubah `label-micro` ke mono" | **DIPERTAHANKAN (doc 11 menang)** | `label-micro` **tidak** diubah; zona publik memakai `@utility kicker` baru |
| §5.4 "11 slug terbit / 11 entri `TERPUBLIKASI`" | **DIKOREKSI** | **12** (diverifikasi lewat `seed-test.mjs`); slug ke-12 = `bibit-trembesi-desa-cikadu` |
| §9 `cover: story.coverImage ?? '/img/cerita-default.jpg'` | **DICABUT** | `Story` tidak punya field `coverImage`/`cover`: baris itu selalu `undefined` dan membuat **seluruh** kartu cerita memakai satu foto yang sama (reproduksi D-08). Pengganti: `foto: fotoCerita(story.slug)` (§2.13) dengan fallback **tipografis** saat `null` |
| §9 baris `StoryCard`: *"Slot `cover` `:47-51` tetap: kontraknya sudah benar"* | **DICABUT** | `StoryCard.svelte:48-52` merender `<img alt="">` tanpa `width`/`height`/`loading`: melanggar §3.3(d) butir 2 dan §4.5 doc 11 sendiri. `StoryCard` **wajib diubah** (§2.13) |
| §11.1 tiga `grep` manual tanpa pengecualian | **DIGANTI** | `scripts/verify/public-purity.mjs` (§6.2) adalah gerbang resmi; pengecualian `/daftar` (teks consent) & `/metode-pengukuran` berlaku untuk keduanya |
| §11.2 "≥26 foto", "`find -size +260k` kosong", `du ≤3,5 MB` | **DIGANTI** | 28 berkas; hero ≤400 KB, lain ≤250 KB, total ≤5 MB (§3.3 butir 6): anggaran lama mustahil secara aritmetika |
| §12 A-02.1/A-02.2 daftar perubahan `app.css`/`app.html` | **DIGANTI** | §3.4 daftar putih dokumen ini (superset: + `@font-face`, + 4 utility, + `numeric`→sans, + hapus Google Fonts, + meta OG) |
| §12 A-02.3 berkas baru + rujukan "`09-BUILD-CONTRACT.md` §4 di bawah WP-5" | **DIGANTI** | §3.3(a) dokumen ini. `09` §4 sudah DIGANTI oleh §1.2 & §3 |
| §1 D-01…D-15, §2 P-1…P-7, §4 aturan foto, §6 E0–E7, §7, §10 kontras | **TETAP BERLAKU PENUH** | Doc 11 normatif untuk rupa; §2.13 menang hanya atas **nama & signature** |

---

## Catatan Peninjauan

Empat peninjauan adversarial dijalankan terhadap `docs/10`, `docs/11`, dan dokumen ini pada 22 Juli 2026.
Setiap temuan diverifikasi ulang **ke kode**, bukan ke klaim dokumen, sebelum diterima atau ditolak.
Bagian ini adalah rekaman keputusan: apa yang berubah, dan apa yang sengaja tidak.

### A. Temuan DITERIMA: kepemilikan berkas & gelombang

| # | Temuan | Bukti kode | Perubahan |
|---|---|---|---|
| A-1 | **Penomoran WP doc 10 & 11 bertabrakan dengan §3.** "WP-5" doc 11 = WP-03 di sini; "WP-6" = WP-04, sedangkan WP-05/WP-06 di sini adalah zona Awardee & Verifikator yang berjalan **paralel** di G3-B. | `docs/11:7, :764, :1358, :1631, :1855, :1871, :1898, :1907` vs §3.5 | §0 mencabut penomoran lama; kepala doc 10 & doc 11 memuat blok koreksi; §8.1/§8.2 mendaftar amandemennya; R-21 ditambahkan |
| A-2 | **`(public)/daftar/+page.svelte` mengimpor `MEMBER_STATUS`/`MEMBER_STATUS_META` tetapi bukan milik WP-01** → G1 mustahil hijau. | `daftar/+page.svelte:27-28, :116`; L3 merename konstanta itu | Ditambahkan ke WP-01 sebagai **rename mekanis saja**; §3.7 baris G1 diperbarui; pembersihan PO-2 tetap milik WP-02 |
| A-3 | **`(public)/komunitas/+page.svelte` dan `admin/laporan/+page.svelte` memakai `catalog.members`/`activeMembers`** tetapi tidak dimiliki WP-01; akses **properti** tidak tertangkap `verify:compile` maupun `build`. | `komunitas:30-31, :36-42`; `laporan:363-374`; `compile-all.mjs` nol resolusi impor | Keduanya ditambahkan ke WP-01 (rename mekanis); gerbang WP-01 butir 8 baru: nol error konsol pada ketiga halaman |
| A-4 | **`Badge.js` & `Reward.js` merujuk `./Member.js`** tetapi tidak dimiliki paket mana pun ⇒ beku per KP-2. | `Badge.js:250, :253-254`; `Reward.js:242, :245-259`; `jsconfig.json` `checkJs` | Ditambahkan ke WP-01 |
| A-5 | **`PageHeader.svelte` & `KpiCard.svelte` yatim** padahal keduanya adalah mitigasi wajib token `--font-display`. | `PageHeader.svelte:45` tanpa `font-sans`; tak muncul di paket mana pun | Ditambahkan ke WP-03 §3.3(a) dan ke tabel lintas gelombang §3.7 |
| A-6 | **`static/fonts/**` yatim** padahal `docs/11` §3.2 menyebutnya "wajib". | Direktori `static/` belum ada; daftar WP-03 lama tanpa `static/fonts` | Ditambahkan ke WP-03; daftar putih §3.4 mengizinkan `@font-face` dan penghapusan `<link>` Google Fonts |
| A-7 | **`session.svelte.js` diklaim WP-01 dan WP-02** tetapi tidak tercatat di tabel lintas gelombang. | §3.1 vs §3.2 | Baris ditambahkan ke §3.7, bersama `admin.svelte.js`, `Footer.svelte`, `komunitas`, `laporan` |
| A-8 | **`/daftar` diberikan ke WP-04 oleh §2.14** tetapi ke WP-02 oleh §3.2 dan §3.7. | §2.14 baris Publik | §2.14 dikoreksi: `/daftar` pindah ke baris WP-02, sejajar `/masuk` |
| A-9 | **Gerbang WP-02 menuntut menguji `/verifikator` & `/kalender`** yang lahir dua ketukan kemudian → mendorong WP-02 membuat berkas milik WP-06/WP-08. | §6.4 kolom vs §3.5 | §3.2(d) butir 1 dibatasi ke tiga kolom + `/masuk`; §6.4 memuat catatan "kapan tiap kolom diuji"; WP-06 butir 7 baru |

### B. Temuan DITERIMA: kontrak yang gagal DIAM-DIAM

Kelompok paling berbahaya: seluruhnya lolos `verify:compile`, `verify:domain`, dan `npm run build`.

| # | Temuan | Bukti kode | Perubahan |
|---|---|---|---|
| B-1 | **Dua kontrak komponen editorial yang bertentangan** (doc 11 §8 vs §2.13). Svelte 5 **mengabaikan props tak dikenal tanpa error** → hero tanpa foto, kalender tanpa penanda, gerbang tetap hijau. | `EditorialHero src=` vs `image=`; `MonthCalendar.markers` vs `events` (beda **bentuk data**) | §2.13 diperluas menjadi kontrak final berikut **peta nama lama→final**; doc 11 §8 diubah menjadi rujukan; R-22 ditambahkan |
| B-2 | **`EventCardVM` & `StoryVM` dipakai lintas paket tetapi tidak pernah didefinisikan.** WP-04 & WP-08 saling dilarang mengimpor view-model masing-masing → kontrak **memaksa** dua pemeta kembar (pelanggaran KP-3 oleh kontraknya sendiri). | `grep "EventCardVM\|StoryVM" docs/*.md` → 3 baris, nol definisi | Typedef final ditambahkan ke §2.13; pemeta `editorial/view-model.js` menjadi berkas **milik WP-03**; ditambahkan ke allowlist WP-04/05/06/08 |
| B-3 | **`PhotoFigure` & `EditorialHero` tanpa `alt`/`width`/`height`**: gerbang §3.3 butir 1 mustahil dipenuhi sambil menaati KP-4. | §2.13 lama vs §3.3(d) | Props ditambahkan & ditandai WAJIB; kredit disatukan ke `foto(key).credit` (tiga jalur kredit dicabut) |
| B-4 | **`cover: story.coverImage ?? '/img/cerita-default.jpg'`**: `Story` tidak punya field itu; ekspresi selalu `undefined` → **seluruh** kartu cerita memakai satu foto yang sama, dan fallback tipografis menjadi kode mati. | `Story.js` typedef `:57-79`; `seed-data.js`; `StoryCard.svelte:47-52` | doc 11 §9 diganti `foto: fotoCerita(story.slug)`; `StoryCard` masuk daftar "wajib diubah"; §2.13 mengunci prop `foto: Photo\|null` |
| B-5 | **`session.hydrated` tidak ada di kontrak** tetapi doc 10 §3.6 mewajibkannya → `{#if session.hydrated}` selalu falsy → halaman ter-login tidak pernah merender isinya, tanpa error. | §2.12 daftar state | doc 10 §3.6 dikoreksi; §2.12 memuat larangan eksplisit |
| B-6 | **Urutan argumen `ContentReviewService` berbeda** antara doc 10 §5.9 dan §2.9; menukar dua argumen "objek atau string" **tidak melempar**. | `archiveStory(story, reason, actor)` vs `(story, actor, reason)` | §2.9 mengunci `(entity, actor, …)` untuk semua method; `cancelEvent` ditambahkan (§2.2 menuntut `→ DIBATALKAN` tetapi tidak ada methodnya); doc 10 §5.9 diperbarui |
| B-7 | **`STORY_STATUS_META[*].aktor` diganti, bukan ditambahi** → `/awardee/cerita` merender *"Bola ada di undefined."* | `community.js:178…:226`; konsumen tunggal `member/cerita/+page.svelte:445` | L3 dikoreksi menjadi **tambah `peranAktor`, pertahankan `aktor`**, dengan catatan L3-a |
| B-8 | **`EVENT_STATUS_META` disebut ada di `community.js`**; sebenarnya di `CommunityEvent.js:72`, dan konstruktor `:168` **melempar** untuk status tak terdaftar. | `CommunityEvent.js:61, :72, :168` | L3 dikoreksi + catatan L3-b |
| B-9 | **Detektor `terkunci` e2e berbasis teks yang justru akan dihapus WP-02** → setelah V2 skrip melaporkan 36 route hijau bahkan bila semua zona menolak pengguna. | `e2e-routes.mjs:171, :244`; `masuk/+page.svelte`; `admin/+layout.svelte:110` | §6.2 mewajibkan detektor berbasis atribut `data-zone-denied` / `data-zone-splash`; §2.13 mewajibkan `ZoneGuard` memasangnya |
| B-10 | **Mitigasi R-03 inert**: `getDb()` tidak pernah memanggil `open()`, Dexie membuka basis data secara malas di luar `try`. | `db.js:93-102`; `getMeta` `:113`; `DexieRepository.js:78-80` | §2.11 memuat bentuk `getDb()` yang wajib (`await open()` di dalam `try` + `finally { pending = null }`); R-03 ditulis ulang |
| B-11 | **Tidak ada yang menjamin `bootstrapDatabase()` berjalan sebelum `session.login()`** → login pertama gagal dengan kredensial yang benar. | `session.svelte.js:322, :344` (jaminan lama); `(public)/+layout.svelte:47-49` adalah balapan | §2.12 mewajibkannya sebagai langkah pertama `login()`; gerbang WP-02 butir 3b; R-24 |
| B-12 | **`@utility numeric` membaca `var(--font-display)`**: klaim doc 11 §3.4 "nol tabrakan" salah. | `app.css:219-224`; `numeric` = **167 kejadian di 47 berkas** | Daftar putih §3.4 butir (7) mewajibkan `numeric` → `var(--font-sans)`; klaim doc 11 dicabut dengan koreksi tertulis |

### C. Temuan DITERIMA: gerbang yang mustahil, kontradiktif, atau menggantung

| # | Temuan | Bukti | Perubahan |
|---|---|---|---|
| C-1 | Gerbang WP-01 butir 1 (`grep '\bmember\b'` nihil) **mustahil**: `Active Member` adalah nama tier kanonik di berkas BEKU. | `tier-table.js:82`, `app.css:33`, `TierProgress.svelte:25` | Pengecualian eksplisit ditambahkan; label tier dilarang diubah |
| C-2 | Gerbang WP-01 butir 2 (`memberId` nihil) **bertabrakan dengan R-02**: `SCHEMA_V1` wajib mempertahankannya. | `db.js:60, :62, :68, :69` | Pengecualian eksplisit; `PROFIL_ADMIN.id` **diganti** `ID_ADMIN`, bukan dihapus tanpa pengganti (`admin.svelte.js:40, :335`) |
| C-3 | Gerbang doc 11 §11.1 **menghapus teks consent** yang §3.2 butir 6 wajibkan dipertahankan; `/metode-pengukuran` juga gagal grep-nya secara definisi. | `daftar/+page.svelte:65, :70` | doc 11 §11.1 memuat `--exclude-dir` dan menunjuk `public-purity.mjs` sebagai gerbang resmi |
| C-4 | **Tiga rujukan menggantung**: "laporan presentasi §2 (A1–I2)", "manifes audit §3", "§5.1 delta". | `docs/` hanya memuat 00–12; tidak ada penomoran A1–I2 | Diganti rujukan nyata: 8 titik D-15 + `/masuk`; manifes `docs/11` §5; "§3.5 WP-07 daftar Chart baru" |
| C-5 | **Anggaran foto doc 11 mustahil secara aritmetika**: 5×260 KB + 12×180 KB = 3,46 MB sebelum 10 berkas sisanya, sedangkan plafon 3,5 MB. Skrip hanya punya satu ambang dan hanya `console.warn`. | §5 doc 11; `BATAS_BYTE` tunggal | Anggaran direvisi (400/250 KB, total 5 MB), ukuran unduhan diturunkan, skrip memakai **dua ambang** + menurunkan `q` dan mengunduh ulang sampai lolos |
| C-6 | **`VerifierSlaBar` (C-20) & `EditorialMetricsService` tidak dimiliki paket mana pun** ⇒ beku per KP-2, sementara CH-8 melarang menghitungnya di komponen. | doc 10 §7.2 vs §3.5 WP-07 | `VerifierSlaBar.svelte` ditambahkan ke WP-07 (11 chart baru); agregasinya menjadi `ContentReviewService.pipeline()/.slaCompliance()`: **tanpa** kelas keempat (KP-3) |
| C-7 | **Manifes foto punya tiga hitungan, dua anggaran, dan keputusan avatar yang saling meniadakan.** | doc 10 §9.3 "27 entri (32 berkas)" + 6 avatar vs doc 11 §4.6 "nol wajah stok" | `docs/11` §5 menjadi manifes tunggal (28 berkas); baris Avatar, aturan F-4, US-R28 AC-6, dan gerbang `isPlaceholderPhoto` dicabut |
| C-8 | **Gerbang WP-03 membolehkan paket selesai dengan nol foto**: PO-6 bisa lolos tanpa terpenuhi. | §3.3(d) butir 3 lama | Butir 1 menjadi **gerbang keras** (28 berkas, >20 KB, jalur manual §5.7 wajib); ketahanan runtime diturunkan menjadi butir terpisah |
| C-9 | **Doc 11 §5.4 mengklaim 11 cerita terbit**; seed menghasilkan **12**. | `seed-test.mjs` dijalankan; slug ke-12 `bibit-trembesi-desa-cikadu` | §5.4 dikoreksi, baris #26b ditambahkan |
| C-10 | **Penyebut "1.240 penerima manfaat" fiktif**: satu-satunya `1.240` di repo adalah "1.240 batang sabun cuci". | `seed-data.js:950`; nol di `00-SOURCE-BRIEF.md` | `beneficiaryRegistry` ditambahkan ke `PublicImpactSnapshot`; doc 11 memuat larangan mengarang penyebut; `ImpactFigure` `TypeError` → `console.warn` |
| C-11 | **`Header.svelte` mengunci `/awardee/kabar` & `/awardee/profil`** dan beku selama G3-B → verifikator ditolak `ZoneGuard`-nya sendiri. | `Header.svelte:84, :101`; props `:26-32` | Tiga prop baru di §2.13; `Header` masuk daftar kerja WP-03 di §3.7 |
| C-12 | **Aturan P-5 "satu objek merah per viewport" dilanggar rancangan doc 11 sendiri** (4 objek di viewport pertama). | doc 11 `:920`, `:930`, `:947`, `:962` vs `:323` | P-5 dirumuskan ulang menjadi terukur ("satu **isian** merah"); checklist §11.3 diselaraskan |
| C-13 | **Hero mobile & `og:image` akan menjadi foto berbeda** dari hero desktop (pencarian terpisah, `results[0]`). | skrip §5.6 | Field `sameAs` ditambahkan ke `PhotoSlot` + cabang di loop + asersi `unsplashId` identik di §11.2 |
| C-14 | **Matriks guard kehilangan baris "sudah masuk lalu membuka `/masuk`"** yang ada di doc 10 §3.7. | §6.4 vs doc 10 `:383` | Kolom `/masuk` ditambahkan ke §6.4 dan ke gerbang WP-02 butir 2 |
| C-15 | **Allowlist impor WP-05 tanpa repository**, padahal dua halaman yang diwarisi sudah memakainya. | `member/profil:48, :82, :151, :155`; `member/penghargaan:49-52, :161, :248-249` | `consentRepository`, `awardeeRepository`, `rewardRepository` ditambahkan, dengan alasan D-4 hanya mengikat `(public)/**` |
| C-16 | **`verify:seed` belum ada** saat WP-01 dijalankan (blok `scripts` beku sampai WP-09). | `package.json:7-15` | §3.1(d) butir 3 memerintahkan memanggil skrip langsung |
| C-17 | **`EventListPanel` dijanjikan untuk `/verifikator`** tetapi tidak ada di allowlist WP-06. | doc 10 `:297, :848`, US-R09 AC-6 vs §3.5 | Ditambahkan; "empat tempat" → **lima**; DoD-08 diselaraskan |
| C-18 | **Nilai `variant` `EventListPanel` berbeda di tiga dokumen**; `'strip'` diwajibkan doc 11 tetapi tidak ada di enum. | doc 10 `:838` · §2.13 · doc 11 `:1484`, `:1296` | Enum dikunci `'panel'\|'rail'\|'strip'`; `'list'` dinyatakan alias lama yang dilarang |
| C-19 | **D-03/D-04/D-10 tidak punya penegak** di kontrak yang mengikat; `EditorialSection` (penegak ritme) hilang di §2.13. | doc 11 §11.3 vs §3.5 WP-04 lama | `SectionRule` mewarisi props `scale`/`rhythm` + peringatan dev; tiga gerbang §11.3 dipindahkan menjadi kriteria selesai WP-04 butir 7 dan dua di antaranya diperiksa `public-purity.mjs` |
| C-20 | **`thumbnailAt = 3` sebagai nilai bawaan** menjadikan penyimpangan P-3 sebagai keseragaman baru di empat halaman. | doc 11 `:1491`, `:1477-1478` | Baku menjadi `0`; indeks ditentukan pemanggil per lokasi |
| C-21 | **Keying rule diwajibkan pada "setiap foto"** → ornamen seragam pengganti "ikon dalam kotak tint". | doc 11 §4.3 butir 2 | Dibatasi pada foto pembawa makna pilar/seksi, kuota maksimum 3 per halaman, `keyline='none'` sah |
| C-22 | **Klaim `label-micro` "hanya dipakai di atas kartu putih" salah.** | `(public)/+page.svelte:227, :299, :432`; `gerakan:85-103`; `tentang:226` | Koreksi tertulis di doc 11 §10.1; dicatat sebagai utang lama, bukan regresi baru |

### D. Temuan DITERIMA: governance & kewenangan

| # | Temuan | Bukti kode | Perubahan |
|---|---|---|---|
| D-1 | **Admin masih dapat menyetujui cerita**, melanggar matriks §2.1 dan menembus R-16: `admin.svelte.js` menulis status langsung ke repository tanpa `ContentReviewService`. | `admin.svelte.js:150, :164, :201`; §2.1 `REVIEW_CONTENT` ADMIN ❌ | Kriteria selesai WP-07 butir 8: `/admin/moderasi` **read-only**, `approve()`/`requestRevision()` dihapus, gerbang `grep` ditambahkan; R-23 |
| D-2 | **Larangan C-19 tidak dapat ditegakkan**: §2.4 mewajibkan `awardeeId === null` untuk VERIFIER, sehingga `story.authorId === actor.awardeeId` **tidak pernah** benar: kontrol governance paling dasar menjadi *no-op*. Sekaligus, verifikator ber-`WRITE_CONTENT` tidak punya transisi pengajuan (§2.2 `DRAFT → DIAJUKAN` hanya AWARDEE). | §2.1 vs §2.2 vs §2.4; doc 10 C-10/C-11 | **Keputusan: verifikator tidak menulis cerita.** `WRITE_CONTENT` VERIFIER → ❌; doc 10 C-10/C-11 dikoreksi. Konflik kepentingan berpindah ke jalur **kegiatan**, di mana ia nyata dan dapat diperagakan: `isSelfReview(actor.id, event.proposedBy)`, dan **E-04 dicabut**. Dua akun verifikator (§11.3 doc 10) menjadi alasan operasional yang sesungguhnya |
| D-3 | **Model status kegiatan bertentangan** antara doc 10 (dua sumbu) dan §2.2 (satu enum), termasuk nama field (`createdById` vs `proposedBy`: dan `SCHEMA_V2` mengindeks yang kedua). | doc 10 §5.4/§5.8 vs §2.2, `:369` | **Satu sumbu menang** (dicatat berikut alasannya di §2.2 dan doc 10 §5.4); ketiga keberatan doc 10 dijawab satu per satu; kebocoran `isUpcoming()` ditangani dengan mewajibkan `upcomingEvents` diturunkan dari `publishedEvents` |

### E. Temuan DITOLAK

| # | Temuan | Alasan penolakan |
|---|---|---|
| E-1 | *"Hapus §2.7 `Validator.js`: lingkup yang tidak diminta, berada di jalur kritis serial."* | **Ditolak.** Modul ini adalah **allowlist impor WP-05** (§3.5) dan dipakai tiga formulir yang memang diminta pemilik produk: `/masuk` (PO-3), komposer cerita `/awardee/cerita/tulis` (PO-4), dan pengusulan kegiatan (PO-4). Menghapusnya memaksa tiga paket menulis validasinya sendiri: pelanggaran KP-3 yang persis sedang dihindari, ditukar dengan penghematan satu berkas ±120 baris pada gelombang yang memang sekuensial. `Story.isSubmittable` menjawab kelayakan **kirim**, bukan galat **per field** yang harus tampil saat mengetik. |
| E-2 | *"Longgarkan invarian `awardeeId` agar VERIFIER boleh merangkap awardee, lalu seed akun ganda + cerita tulisannya."* | **Ditolak sebagai jalur utama.** Ia memaksa satu awardee memiliki dua akun (memecah `AccountRepository.byAwardeeId`) atau menurunkan cacah `AWARDEE` di bawah 60: keduanya menabrak gerbang seed §3.1(d) butir 4–5 yang berbasis angka kanonik. Jalur yang dipilih (D-2) mencapai tujuan governance yang sama tanpa menyentuh determinisme seed. |
| E-3 | *"Naikkan doc 11 di atas doc 12 dalam urutan kemenangan karena `mtime`-nya lebih baru."* | **Ditolak.** Waktu modifikasi berkas bukan sumber otoritas. Doc 11 memang diletakkan di atas doc 10 (§0) untuk **rupa**, tetapi §2 dokumen ini tetap menang atas **nama & signature**: itulah satu-satunya cara lima paket paralel dapat menulis `import { … }` sebelum implementasinya ada. |
| E-4 | *"Doc 12 §3.7 salah karena ada file yang dimiliki dua paket."* (klaim awal) | **Ditolak sebagian.** Tabel §3.7 memang **nol sel ganda** untuk berkas yang tercantum di dalamnya; seluruh bentrokan nyata datang dari berkas **di luar** tabel (yatim atau tak tercantum). Perbaikannya karenanya adalah **menambah baris**, bukan membagi ulang tabel. |
| E-5 | *"Pangkas 12 sampul cerita menjadi 6 untuk memenuhi anggaran."* | **Ditolak.** Anggaran diperbaiki di sisi yang salah: ukuran unduhan (1800/1200 px, q adaptif) dan plafon (5 MB), bukan cakupan. Memangkas sampul berarti separuh kartu cerita jatuh ke fallback tipografis di halaman yang justru menjadi bukti PO-1b. Pemangkasan tetap dicatat sebagai **jalan keluar terakhir** bila plafon 5 MB terlampaui. |
| E-6 | *"Ganti seluruh `EventStatus` menjadi dua sumbu sesuai doc 10."* | **Ditolak**: lihat D-3. Argumen korektnessnya sahih dan ketiganya dijawab; biayanya (indeks kedua, dua META, dua helper, lima paket paralel tanpa git) tidak sepadan untuk kasus tepi yang tidak muncul di seed maupun di PO-1…PO-7. |
| E-7 | *"Doc 11 §5.4 benar: 11 cerita `TERPUBLIKASI`."* (klaim salah satu peninjau) | **Ditolak.** Menjalankan seed menghasilkan **12**. Slug yang hilang dari tabel doc 11 adalah `bibit-trembesi-desa-cikadu`, yang justru ada di doc 10 §9.3. |
| E-8 | *"Hapus `og:image` / turunkan font lokal menjadi opsional."* | **Ditolak.** Keduanya sekarang **sah**: `static/fonts/**` dimiliki WP-03 dan daftar putih §3.4 mengizinkan `@font-face` serta meta OG. Konflik yang menjadi dasar usulan ini sudah hilang, sehingga tidak ada lagi alasan mengorbankan demo luring maupun kartu berbagi WhatsApp. |

### F. Yang diverifikasi BENAR dan sengaja tidak diubah

- **Baseline seed akurat.** `node scripts/verify/seed-test.mjs` menghasilkan tepat `totalPoints 3234`,
  distribusi tier `22/16/12/7/3`, 639 aktivitas, 60 anggota, 13 kegiatan, 22 cerita, 43 asersi lolos.
  Gerbang §3.1(d) butir 5 valid apa adanya.
- **`echarts@6` terpasang** dan `node_modules/echarts/core.js` ada: rencana tree-shaking §2.13 layak.
- **17 kunci ikon yang dibutuhkan `navigation.js` sudah ada** (dari 61 kunci tersedia).
- **Rujukan `path:baris` yang disampel cocok dengan kode**: `db.js:93-102`, `bootstrap.js:77-80` & `:96-106`,
  `session.svelte.js:69-76/148/194/213-215`, `daftar:65/:70/:242-245`, `_view-model.js:109`,
  `EventCard.svelte:136-137`, `Header.svelte:84/:101`, `BottomNav.svelte:30-34/:45`, `Member.js:366`,
  `app.css:129-132`, `app.html:14-19`, `format.js:183`.
- **Cacat `EChart.svelte` (R-15) nyata**: `option` dibaca di dalam efek siklus hidup.
- **Matematika kontras doc 11 §10 benar** (dihitung ulang: `ink-500` 4,33 · `ink-600` 6,90).
- **Tabel silang §3.7 benar** untuk berkas yang tercantum di dalamnya: nol sel ganda.
- **R-11 benar**: komponen gamifikasi tetap hidup di zona ter-login dan dilarang dihapus.

### G. Pemeriksaan penutup

| Syarat | Status |
|---|---|
| (a) Nol berkas dimiliki dua paket dalam gelombang yang sama | ✓ §3.7 diperluas; seluruh berkas yang ditemukan bertuan ganda atau yatim sudah diberi satu pemilik per gelombang |
| (b) Nol berkas yang harus berubah tetapi tak bertuan | ✓ `daftar`, `komunitas`, `admin/laporan`, `Badge.js`, `Reward.js`, `Footer.svelte`, `PageHeader.svelte`, `KpiCard.svelte`, `static/fonts/**`, `editorial/view-model.js`, `VerifierSlaBar.svelte`: semuanya kini tercantum |
| (c) Seluruh keputusan pemilik produk terjawab | ✓ PO-1 (WP-04/WP-08 + `beneficiaryRegistry`) · PO-2 (`public-purity.mjs` + VM tanpa field skor) · PO-3 (WP-01/02/06 + `bootstrapDatabase` di `login`) · PO-4 (rantai Awardee→Verifikator→publish, `EventListPanel` lima tempat, `/admin/moderasi` read-only) · PO-5 (17 chart) · PO-6 (gerbang foto keras + font lokal + `SectionRule`) · PO-7 (§5, §8.1, §8.2, WP-09) |
| (d) Kontrak export konsisten antar dokumen | ✓ doc 10 §11.2 dan doc 11 §8 disunting agar memakai nama §2; §8.1 & §8.2 mendaftar setiap selisih beserta pemenangnya |
