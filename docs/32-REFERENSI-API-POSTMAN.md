# Referensi API PFriends untuk Postman

Dokumen ini mencatat API yang tersedia pada implementasi PocketBase PFriends saat ini. Sumber utama adalah `pocketbase/pb_hooks/*.js`, pemanggilan frontend, dan aturan collection PocketBase.

## 1. Persiapan Postman

Buat environment dengan variabel berikut:

| Variabel | Contoh |
|---|---|
| `baseUrl` | `http://127.0.0.1:8090` |
| `token` | token aktif yang terakhir dipilih |
| `awardeeToken` | token hasil login role AWARDEE |
| `verifierToken` | token hasil login role VERIFIER |
| `adminToken` | token hasil login role ADMIN |
| `awardeeUserId` | id user AWARDEE terakhir login |
| `verifierUserId` | id user VERIFIER terakhir login |
| `adminUserId` | id user ADMIN terakhir login |
| `awardeeId` | id record collection `awardees` |
| `registrationId` | id registrasi |
| `submissionId` | id Bukti Keaktifan |
| `eventId` | id kegiatan |
| `movementId` | id Gerakan |
| `movementReportId` | id laporan Gerakan |
| `storyId` | id Cerita |
| `storySlug` | slug Cerita publik |
| `broadcastId` | id Kabar |
| `rewardId` | id hadiah |
| `redemptionId` | id penukaran |
| `pointActionId` | id aksi poin |
| `pointActivityId` | id ledger poin |

Untuk endpoint terautentikasi, tambahkan header:

```http
Authorization: Bearer {{token}}
Content-Type: application/json
```

Untuk unggahan file, pilih Body > form-data dan jangan menulis `Content-Type` secara manual. Postman akan membuat boundary multipart.

Role yang dipakai: `AWARDEE`, `VERIFIER`, dan `ADMIN`. Istilah **Staf** berarti `ADMIN` atau `VERIFIER` aktif.

Dasbor `/awardee` tidak memiliki endpoint agregat tersendiri. Untuk mereproduksi datanya di Postman, login sebagai Awardee lalu jalankan `GET /api/pfriends/gamification/me`, `GET /api/pfriends/events`, `GET /api/pfriends/broadcasts`, dan `GET /api/pfriends/stories/mine` dengan `{{awardeeToken}}`.

### Forum PFriends

| Method | Endpoint | Body atau fungsi |
|---|---|---|
| GET | `/api/pfriends/forum/channels` | Daftar kanal yang boleh diakses pengguna aktif |
| GET | `/api/pfriends/forum/channels/{{channelSlug}}/messages?perPage=50&before={{messageCursor}}` | Riwayat pesan berbasis cursor |
| POST | `/api/pfriends/forum/channels/{{channelSlug}}/messages` | `{ "content": "Pesan maksimal 600 karakter", "requestKey": "{{$guid}}" }` |
| POST | `/api/pfriends/forum/messages/{{forumMessageId}}/reaction` | `{ "emoji": "👍", "selected": true }`; emoji: `👍`, `❤️`, atau `🎉` |
| GET | `/api/pfriends/forum/presence` | Anggota aktif maksimal lima menit terakhir |
| POST | `/api/pfriends/forum/presence/heartbeat` | `{ "channel": "tanya-jawab" }` |

`pengumuman` hanya dapat ditulis Admin dan Verifikator. Kanal `sobi-alumni` dan `pfpreneur` dibatasi pada komunitas Awardee terkait, sementara staf aktif dapat mengakses seluruh kanal. Frontend memakai topic SSE `forum:channel:{channelId}` dan `forum:presence` setelah initial load REST.

## 2. Auth dan sesi

Endpoint auth di bawah adalah REST bawaan PocketBase.

### Login

`POST {{baseUrl}}/api/collections/users/auth-with-password`

Publik. Body JSON:

```json
{
  "identity": "admin@pertaminafoundation.org",
  "password": "pfriends2026"
}
```

Tambahkan script berikut pada tab **Scripts > Post-response** request Login. Script membaca role dari respons PocketBase, menyimpan token pada variabel role yang sesuai, lalu menjadikannya token aktif:

```javascript
const json = pm.response.json();

pm.test('Login berhasil', function () {
  pm.expect(pm.response.code).to.equal(200);
  pm.expect(json.token).to.be.a('string').and.not.empty;
  pm.expect(json.record).to.be.an('object');
  pm.expect(['AWARDEE', 'VERIFIER', 'ADMIN']).to.include(json.record.role);
});

const role = json.record.role;
const prefixByRole = {
  AWARDEE: 'awardee',
  VERIFIER: 'verifier',
  ADMIN: 'admin'
};
const prefix = prefixByRole[role];

pm.environment.set(`${prefix}Token`, json.token);
pm.environment.set(`${prefix}UserId`, json.record.id);
pm.environment.set('token', json.token);
pm.environment.set('activeRole', role);

console.log(`Token ${role} disimpan sebagai ${prefix}Token dan token aktif.`);
```

Hasilnya:

- login Awardee mengisi `awardeeToken`, `awardeeUserId`, dan `token`;
- login Verifikator mengisi `verifierToken`, `verifierUserId`, dan `token`;
- login Admin mengisi `adminToken`, `adminUserId`, dan `token`.

### Susunan request login yang disarankan

Buat tiga request dengan endpoint login yang sama tetapi body berbeda:

#### Login Awardee

```json
{
  "identity": "email-awardee@example.com",
  "password": "password-awardee"
}
```

#### Login Verifikator

```json
{
  "identity": "verifikator@pertaminafoundation.org",
  "password": "pfriends2026"
}
```

#### Login Admin

```json
{
  "identity": "admin@pertaminafoundation.org",
  "password": "pfriends2026"
}
```

Pasang script Post-response yang sama pada ketiga request tersebut. Agar tidak menduplikasi script, script juga dapat dipasang pada folder **Auth & Session**.

### Token otomatis per folder

Atur Authorization pada setiap folder Postman menjadi **Bearer Token**:

| Folder | Token |
|---|---|
| Request Awardee | `{{awardeeToken}}` |
| Request Verifikator | `{{verifierToken}}` |
| Request Admin | `{{adminToken}}` |
| Request lintas role atau eksperimen | `{{token}}` |

Request di dalam folder memilih **Inherit auth from parent**. Dengan cara ini, login sebagai Admin tidak mengubah autentikasi request Awardee karena folder Awardee tetap membaca `awardeeToken`.

### Memilih token aktif secara manual

Jika ingin menggunakan satu folder dengan `{{token}}`, buat request tanpa endpoint bernama **Gunakan Token Awardee** dan pasang script berikut pada tab Pre-request:

```javascript
pm.environment.set('token', pm.environment.get('awardeeToken'));
pm.environment.set('activeRole', 'AWARDEE');
```

Untuk Verifikator atau Admin, ganti sumbernya menjadi `verifierToken` atau `adminToken`. Namun, pemisahan Authorization per folder lebih aman karena tidak bergantung pada urutan request yang dijalankan.

Catatan: akun harus berstatus `AKTIF`. Jalur login password staf dapat dimatikan oleh `PB_REQUIRE_STAFF_SSO=1`.

### Refresh token

`POST {{baseUrl}}/api/collections/users/auth-refresh`

Memerlukan Bearer token. Tanpa body.

### Profil sesi aktif

`GET {{baseUrl}}/api/pfriends/session/me`

Semua role aktif. Tanpa body.

### Akhiri impersonasi Admin

`POST {{baseUrl}}/api/pfriends/admin/impersonations/{id}/end`

Admin pemilik sesi atau Awardee target. `{id}` adalah id `admin_awardee_actions` dari respons impersonasi. Tanpa body.

## 3. Registrasi Awardee

### Buat registrasi

`POST {{baseUrl}}/api/pfriends/registrations`

Publik. Body `multipart/form-data`:

| Field | Tipe | Ketentuan |
|---|---|---|
| `email` | text | Email unik |
| `password` | text | Minimal 8 karakter |
| `passwordConfirm` | text | Harus sama dengan password |
| `fullName` | text | Minimal 3 karakter |
| `whatsapp` | text | Nomor Indonesia, dinormalisasi ke `+62...` |
| `community` | text | `SOBI` atau `WOMENPRENEUR` |
| `programPillar` | text | `PFprestasi`, `PFmuda`, `PFsains`, atau `PFlestari` |
| `batch` | text | `PF10`, `PF11`, atau `PF12` |
| `region` | text | Minimal 2 karakter |
| `university` | text | Wajib untuk SOBI |
| `graduationYear` | number | Wajib untuk SOBI, 1980 sampai 2100 |
| `businessName` | text | Wajib untuk WOMENPRENEUR |
| `businessSector` | text | Wajib untuk WOMENPRENEUR |
| `businessCity` | text | Wajib untuk WOMENPRENEUR |
| `consent` | text | Harus `true` |
| `proofs` | file | 1 sampai 3 file |

### Kirim ulang klarifikasi

`PATCH {{baseUrl}}/api/pfriends/registrations/me`

Awardee dengan status registrasi `CLARIFICATION`. Body form-data memakai field profil di atas. `proofs` opsional, maksimal 3 file baru. Email, password, dan consent tidak diubah.

### Keputusan registrasi

`POST {{baseUrl}}/api/pfriends/registrations/{{registrationId}}/decision`

Verifikator. Body JSON:

```json
{
  "decision": "APPROVE",
  "note": "Data dan bukti telah sesuai."
}
```

`decision`: `APPROVE`, `REQUEST_CLARIFICATION`, `REJECT`, atau `REOPEN`. Catatan minimal 5 karakter kecuali `APPROVE`.

### Baca registrasi dan riwayat melalui REST PocketBase

| Method | Endpoint | Role/keterangan |
|---|---|---|
| GET | `/api/collections/awardee_registrations/records?filter=(owner='{{userId}}')` | Pendaftar membaca miliknya |
| GET | `/api/collections/awardee_registrations/records?sort=-submittedAt` | Verifikator membaca antrean |
| GET | `/api/collections/registration_reviews/records?filter=(registration='{{registrationId}}')&sort=decidedAt` | Pendaftar atau Verifikator |

Gunakan URL lengkap `{{baseUrl}}` sebelum setiap path.

## 4. Bukti Keaktifan

Pembuatan dan pembacaan submission menggunakan REST collection PocketBase karena validasi bisnis dipasang pada record hook.

### Buat bukti umum

`POST {{baseUrl}}/api/collections/activity_submissions/records`

Awardee. Body `multipart/form-data`:

| Field | Tipe | Ketentuan |
|---|---|---|
| `pointAction` | text | id aksi aktif dengan workflow `EVIDENCE` |
| `activityDate` | date | ISO 8601 |
| `title` | text | 3 sampai 160 karakter |
| `description` | text | 20 sampai 3000 karakter |
| `externalUrl` | text | Opsional |
| `evidenceFiles` | file | 1 sampai 5 file, maksimal 5 MB/file; JPG, PNG, WebP, atau PDF |

Untuk alur inti lama, `activityType` masih dapat dikirim. Nilai yang dipakai saat persetujuan tetap diambil dari `point_actions`.

Tambahan alur khusus:

- Kehadiran: `activityType=SESSION_ATTEND`, `event={{eventId}}`.
- Share Kabar: `activityType=SHARE_PRIVATE` atau `SHARE_PUBLIC`, `broadcast={{broadcastId}}`; share publik wajib `externalUrl`.

`owner`, status, identitas Awardee, dan waktu submit ditetapkan server.

### Perbarui bukti yang perlu revisi

`PATCH {{baseUrl}}/api/collections/activity_submissions/records/{{submissionId}}`

Awardee pemilik, hanya ketika status `NEEDS_REVISION`. Body form-data: `activityDate`, `title`, `description`, `externalUrl`, dan opsional file baru. Identitas aksi tidak dapat diubah.

### Daftar dan detail bukti

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/collections/activity_submissions/records?sort=-submittedAt&expand=owner,reviewer` | Verifikator melihat semua, Awardee hanya miliknya |
| GET | `/api/collections/activity_submissions/records/{{submissionId}}?expand=owner,reviewer` | Detail |
| GET | `/api/collections/submission_reviews/records?filter=(submission='{{submissionId}}')&sort=decidedAt&expand=reviewer` | Riwayat keputusan |
| GET | `/api/collections/submission_status_events/records?filter=(submission='{{submissionId}}')&sort=occurredAt&expand=actor` | Timeline status |

### Mulai review

`POST {{baseUrl}}/api/pfriends/activity-submissions/{{submissionId}}/start-review`

Verifikator. Tanpa body. Status harus `SUBMITTED`.

### Putuskan bukti

`POST {{baseUrl}}/api/pfriends/activity-submissions/{{submissionId}}/review`

Verifikator. Body:

```json
{
  "decision": "APPROVE",
  "note": "Bukti sesuai dengan aktivitas."
}
```

`decision`: `APPROVE` atau `REQUEST_REVISION`. Catatan revisi minimal 5 karakter.

## 5. Aksi dan gamifikasi

| Method | Endpoint | Role | Query/body |
|---|---|---|---|
| GET | `/api/pfriends/point-actions` | Semua user aktif | Tanpa body. Awardee menerima aksi aktif; Staf menerima semua status |
| GET | `/api/pfriends/gamification/me` | Awardee | Profil, wallet, aksi, kuota, ledger, badge |
| GET | `/api/pfriends/gamification/leaderboard` | Semua user login | Query: `scope=global|community|chapter`, `key`, `period=all|month`, `limit=1..100` |
| GET | `/api/pfriends/verifier/dashboard` | Verifikator | Tanpa body. Mengembalikan agregat gamifikasi, `monthly`, `kpis`, `reviewPerformance`, `workRecord`, dan leaderboard tanpa isi keputusan atau bukti privat |
| POST | `/api/pfriends/point-activities/{{pointActivityId}}/revoke` | Admin | `{"reason":"Alasan pencabutan minimal lima karakter"}` |

### Tambah aksi poin

`POST {{baseUrl}}/api/pfriends/staff/point-actions`

Admin atau Verifikator. Body:

```json
{
  "label": "Menjadi relawan kegiatan komunitas",
  "description": "Berkontribusi sebagai relawan pada kegiatan komunitas yang terverifikasi.",
  "actionClass": "C",
  "pillar": "Community Engagement",
  "points": 20,
  "dailyCap": 1,
  "status": "ACTIVE"
}
```

`actionClass`: `B`, `C`, atau `D`. `points`: 1 sampai 999. `dailyCap`: 1 sampai 100. `status`: `ACTIVE` atau `INACTIVE`. Kode dibuat server dan workflow selalu `EVIDENCE`.

### Ubah, hapus, dan audit aksi

| Method | Endpoint | Body/keterangan |
|---|---|---|
| PATCH | `/api/pfriends/staff/point-actions/{{pointActionId}}` | Body sama: `label`, `description`, `actionClass`, `pillar`, `points`, `dailyCap`, `status` |
| DELETE | `/api/pfriends/staff/point-actions/{{pointActionId}}` | Tanpa body. Aksi inti/terpakai diarsipkan menjadi `INACTIVE` |
| GET | `/api/pfriends/staff/point-actions/{{pointActionId}}/audit` | Tanpa body |

### Aturan tier gamifikasi, Admin

| Method | Endpoint | Body dan hasil utama |
|---|---|---|
| GET | `/api/pfriends/admin/gamification/rules` | Tanpa body. Mengembalikan `tiers`, `thresholds`, `version`, `impact`, `sample`, dan `audits` |
| POST | `/api/pfriends/admin/gamification/tiers/preview` | `{ "thresholds": { "NEWCOMER": 0, "ACTIVE_MEMBER": 25, "CONTRIBUTOR": 50, "FEATURED_CANDIDATE": 100, "CHAMPION": 150 } }` |
| PUT | `/api/pfriends/admin/gamification/tiers` | Body pratinjau ditambah `expectedVersion` dari GET terakhir. Langsung menerapkan tier seluruh profil |
| GET | `/api/pfriends/admin/gamification/tiers/audit` | Tanpa body. Mengembalikan maksimum 100 audit terbaru |

Ambang wajib bilangan bulat nonnegatif dan meningkat. `NEWCOMER` wajib 0. Endpoint ini hanya menerima token user aktif dengan role `ADMIN`.

## 6. Kabar

| Method | Endpoint | Role | Body |
|---|---|---|---|
| GET | `/api/pfriends/broadcasts` | Awardee | Tanpa body; hanya Kabar `TERKIRIM` sesuai komunitas |
| POST | `/api/pfriends/broadcasts/{{broadcastId}}/start` | Awardee | Tanpa body; memulai timer baca 15 detik |
| POST | `/api/pfriends/broadcasts/{{broadcastId}}/engage` | Awardee | Lihat contoh engagement |
| GET | `/api/pfriends/admin/broadcasts` | Admin | Semua Kabar |
| GET | `/api/pfriends/verifier/broadcasts` | Verifikator | Semua Kabar, read-only |
| POST | `/api/pfriends/admin/broadcasts` | Admin | Body Kabar |
| PATCH | `/api/pfriends/admin/broadcasts/{{broadcastId}}` | Admin | Body Kabar; Kabar terkirim tidak dapat disunting |
| POST | `/api/pfriends/admin/broadcasts/{{broadcastId}}/publish` | Admin | Tanpa body |
| DELETE | `/api/pfriends/admin/broadcasts/{{broadcastId}}` | Admin | Tanpa body; Kabar terkirim tidak dapat dihapus |

Body Kabar:

```json
{
  "title": "Kabar komunitas pekan ini",
  "summary": "Ringkasan kabar minimal sepuluh karakter.",
  "body": "Isi lengkap kabar minimal dua puluh karakter.",
  "channel": "SEMUA",
  "contentSource": "Pertamina Foundation",
  "lightCta": "Bagikan tanggapanmu",
  "ctaLink": "https://example.com",
  "audience": "SEMUA",
  "scheduledAt": "2026-08-30T02:00:00.000Z"
}
```

`audience`: `SEMUA`, `SOBI`, atau `WOMENPRENEUR`. `scheduledAt` boleh kosong.

Body engagement:

```json
{
  "type": "CTA_REACT",
  "response": "Tanggapan bermakna minimal dua puluh karakter.",
  "requestKey": "request-unik-cta-001"
}
```

`type`: `BROADCAST_VIEW` atau `CTA_REACT`. Untuk `BROADCAST_VIEW`, panggil endpoint `/start`, tunggu minimal 15 detik, lalu `/engage`.

## 7. Calendar of Event

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/api/pfriends/events` | Awardee/Verifikator | Awardee melihat kegiatan publik dan usulannya; Verifikator melihat semua |
| POST | `/api/pfriends/events` | Awardee | Mengusulkan kegiatan |
| POST | `/api/pfriends/events/{{eventId}}/decision` | Verifikator | Memutuskan usulan |
| PATCH | `/api/pfriends/events/{{eventId}}` | Verifikator | Mengubah kegiatan |
| POST | `/api/pfriends/events/{{eventId}}/transition` | Verifikator | Mengubah status operasional |
| POST | `/api/pfriends/events/{{eventId}}/register` | Awardee | Daftar kegiatan; tanpa body |

Body usulan:

```json
{
  "title": "Kelas Daring Pengelolaan Sampah",
  "type": "WORKSHOP",
  "description": "Deskripsi kegiatan dan manfaat untuk peserta.",
  "speakerName": "Nama Pembicara",
  "chapterId": "PF12",
  "community": "SOBI",
  "location": "Zoom",
  "isOnline": true,
  "startsAt": "2026-09-10T02:00:00.000Z",
  "endsAt": "2026-09-10T04:00:00.000Z",
  "quota": 100
}
```

Body keputusan: `{"decision":"APPROVE","note":"Jadwal dan materi sesuai."}`. `decision`: `APPROVE` atau `REJECT`; penolakan membutuhkan catatan minimal 5 karakter.

Body PATCH: `title`, `type`, `description`, `location`, `isOnline`, `startsAt`, `endsAt`, `quota`, `outcomeNote`.

Body transition: `{"status":"BERLANGSUNG","note":"Kegiatan dimulai."}`. Transisi sah: `TERJADWAL` ke `BERLANGSUNG`/`DIBATALKAN`, lalu `BERLANGSUNG` ke `SELESAI`/`DIBATALKAN`.

## 8. Gerakan

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| GET | `/api/pfriends/movements` | Semua role aktif | Isi disaring menurut role |
| POST | `/api/pfriends/movements` | Awardee | Usulkan Gerakan |
| POST | `/api/pfriends/movements/{{movementId}}/resubmit` | Awardee pengusul | Kirim ulang revisi usulan |
| POST | `/api/pfriends/movements/{{movementId}}/join` | Awardee | Bergabung; tanpa body |
| POST | `/api/pfriends/movements/{{movementId}}/reports` | Awardee peserta | Endpoint laporan multipart kompatibilitas |
| POST | `/api/pfriends/movements/{{movementId}}/action-reports` | Awardee peserta | Endpoint laporan yang dipakai UI |
| POST | `/api/pfriends/movement-reports/{{movementReportId}}/resubmit` | Awardee pemilik | Kirim ulang laporan revisi |
| POST | `/api/pfriends/verifier/movements/{{movementId}}/decision` | Verifikator | Putuskan usulan |
| POST | `/api/pfriends/verifier/movement-reports/{{movementReportId}}/start-review` | Verifikator | Tanpa body |
| POST | `/api/pfriends/verifier/movement-reports/{{movementReportId}}/decision` | Verifikator | Putuskan laporan |
| POST | `/api/pfriends/verifier/movements/{{movementId}}/complete` | Verifikator | Tanpa body; perlu minimal satu laporan disetujui |

Body usulan/resubmit Gerakan:

```json
{
  "title": "Aksi Bersih Sungai Bersama",
  "category": "LINGKUNGAN",
  "objective": "Mengurangi sampah dan meningkatkan kesadaran warga sekitar.",
  "description": "Rangkaian kegiatan, pembagian peran, sasaran, dan metode pelaksanaan secara lengkap.",
  "region": "Jakarta",
  "startsAt": "2026-09-15T01:00:00.000Z",
  "endsAt": "2026-09-15T06:00:00.000Z",
  "targetParticipants": 30
}
```

Kategori input: `LINGKUNGAN`, `EDUKASI`, atau `EKONOMI`.

Body laporan `multipart/form-data`: `activityDate`, `location`, `participantCount`, `outcomeNote` minimal 40 karakter, dan minimal satu `evidenceFiles`. Saat resubmit, file baru opsional jika file lama masih tersedia.

Body keputusan usulan:

```json
{
  "decision": "APPROVE",
  "note": "Usulan siap dijalankan.",
  "esgTags": [
    { "pillar": "E", "sdgGoal": 6 }
  ]
}
```

`decision`: `APPROVE`, `REQUEST_REVISION`, atau `REJECT`. Approval membutuhkan minimal satu `esgTags`; keputusan lain membutuhkan catatan minimal 5 karakter.

Body keputusan laporan: `{"decision":"APPROVE","note":"Bukti dan hasil sesuai."}` dengan pilihan keputusan yang sama.

## 9. Cerita

### Endpoint Awardee

| Method | Endpoint | Body/keterangan |
|---|---|---|
| GET | `/api/pfriends/stories/mine` | Tanpa body |
| POST | `/api/pfriends/stories/drafts` | Form-data Cerita |
| PATCH | `/api/pfriends/stories/{{storyId}}/draft` | Form-data Cerita; hanya pemilik dan status `DRAFT`/`PERLU_REVISI` |
| POST | `/api/pfriends/stories/{{storyId}}/submit` | Tanpa body |
| POST | `/api/pfriends/stories/consent/revoke` | Tanpa body; mencabut consent dan menarik publikasi terkait |

Body form-data Cerita:

| Field | Tipe | Keterangan |
|---|---|---|
| `title` | text | Minimal 5 karakter saat submit |
| `summary` | text | Ringkasan |
| `body` | text | Minimal 300 kata saat submit |
| `location` | text | Wajib saat submit |
| `activityDate` | date | Wajib saat submit |
| `participantCount` | number | Minimal 1 saat submit |
| `esgTags` | JSON string | Contoh `[ {"pillar":"S","sdgGoal":4} ]` |
| `outcome` | JSON string | Contoh `{"note":"Catatan hasil minimal dua puluh karakter."}` |
| `evidenceFiles` | file | Minimal satu saat submit |
| `coverCandidate` | file | Tepat satu foto sampul saat submit |
| `removeEvidence` | text | `true` untuk menghapus file saat simpan draf |
| `removeCover` | text | `true` untuk menghapus sampul saat simpan draf |

### Endpoint Verifikator

| Method | Endpoint | Query/body |
|---|---|---|
| GET | `/api/pfriends/verifier/stories` | Query `scope=queue|all` |
| GET | `/api/pfriends/verifier/stories/{{storyId}}` | Detail, review, timeline |
| POST | `/api/pfriends/verifier/stories/{{storyId}}/start-review` | Tanpa body |
| POST | `/api/pfriends/verifier/stories/{{storyId}}/decision` | Body keputusan |
| POST | `/api/pfriends/verifier/stories/{{storyId}}/publish` | Tanpa body |
| POST | `/api/pfriends/verifier/stories/{{storyId}}/archive` | `{"reason":"DITOLAK"}` |

Body keputusan:

```json
{
  "decision": "APPROVE",
  "note": "Naskah dan bukti sesuai.",
  "sensitivityChecks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
}
```

`decision`: `APPROVE` atau `REQUEST_REVISION`. Approval wajib mengirim seluruh nomor 1 sampai 21. Alasan arsip: `DITOLAK`, `KEDALUWARSA`, `CONSENT_DICABUT`, `PERMINTAAN_ANGGOTA`, atau `IDLE_TIMEOUT`.

### Endpoint pantauan Admin

| Method | Endpoint | Query |
|---|---|---|
| GET | `/api/pfriends/admin/stories` | `page`, `perPage` maksimal 50, `status`, `q` |
| GET | `/api/pfriends/admin/stories/{{storyId}}` | Tanpa body; metadata, review, timeline |

## 10. Hadiah dan penukaran

| Method | Endpoint | Role | Query/body |
|---|---|---|---|
| GET | `/api/pfriends/achievements` | Awardee | Wallet, hadiah, dan pesanan sendiri |
| POST | `/api/pfriends/redemptions` | Awardee | `{"rewardId":"{{rewardId}}","requestKey":"redeem-unik-001"}` |
| GET | `/api/pfriends/admin/redemptions` | Staf | Query opsional `status` |
| POST | `/api/pfriends/admin/redemptions/{{redemptionId}}/transition` | Verifikator | `{"status":"DISETUJUI","note":"Disetujui"}` |
| GET | `/api/pfriends/staff/rewards` | Staf | Semua hadiah |
| POST | `/api/pfriends/staff/rewards` | Staf | Body hadiah |
| PATCH | `/api/pfriends/staff/rewards/{{rewardId}}` | Staf | Body hadiah |
| DELETE | `/api/pfriends/staff/rewards/{{rewardId}}` | Staf | Tanpa body; hadiah terpakai menjadi `SEGERA` |

Transisi penukaran: `DIAJUKAN` ke `DISETUJUI`/`DITOLAK`, `DISETUJUI` ke `DIKIRIM`, dan `DIKIRIM` ke `SELESAI`. Penolakan membutuhkan catatan minimal 5 karakter dan memicu refund.

Body hadiah:

```json
{
  "name": "Sertifikat Kontributor",
  "category": "SERTIFIKAT",
  "description": "Sertifikat apresiasi untuk kontributor aktif.",
  "priceCoins": 100,
  "minTierLevel": "CONTRIBUTOR",
  "status": "TERSEDIA",
  "monthlyQuota": 20,
  "requiresApproval": true,
  "community": "",
  "fulfillmentNote": "Verifikator akan menghubungi Awardee.",
  "image": ""
}
```

Kategori: `MERCHANDISE`, `UPSKILLING`, `MENTORING`, `PROFIL`, `UNDANGAN`, `SERTIFIKAT`, `DAMPAK`. Tier: `NEWCOMER`, `ACTIVE_MEMBER`, `CONTRIBUTOR`, `FEATURED_CANDIDATE`, `CHAMPION`. Status: `TERSEDIA`, `HABIS`, atau `SEGERA`. `community` kosong untuk semua, atau `SOBI`/`WOMENPRENEUR`.

## 11. Jejaring dan profil

### Direktori Awardee

`GET {{baseUrl}}/api/pfriends/directory`

Semua akun aktif. Query opsional: `search`, `community`, `chapter`, `city`, `skill`, `mentor=true`, `page`, `perPage` maksimal 48.

Respons hanya memuat data yang aman untuk Awardee lain. `avatar` hadir jika consent `PUBLIKASI_FOTO_WAJAH` aktif. `whatsapp` hadir jika consent `KONTAK_UNTUK_MENTORING` aktif dan pemilik profil mengaktifkan `openToMentoring`. Keduanya tidak dikirim ketika syaratnya tidak terpenuhi. Foto tetap memerlukan token file PocketBase.

### Ubah profil sendiri

`PATCH {{baseUrl}}/api/pfriends/profile/me`

Awardee aktif. Gunakan `multipart/form-data` bila mengunggah `avatar`, atau JSON tanpa foto. Nama, email, komunitas, pilar, chapter, kampus, dan tahun lulus merupakan data terverifikasi yang tidak dapat diubah dari endpoint ini.

```json
{
	"whatsapp": "081234567890",
	"city": "Bandung",
  "occupation": "Wirausaha sosial",
  "bio": "Profil singkat Awardee.",
  "skills": ["Fasilitasi", "Pengelolaan Sampah"],
  "openToMentoring": true,
	"profileVisibility": "DIRECTORY",
	"businessName": "Usaha Lestari",
	"businessSector": "Kuliner",
	"businessCity": "Bandung",
	"businessDescription": "Produk pangan lokal.",
	"businessContact": "081298765432",
  "businessEmployees": 8,
  "businessGrowthPercent": 12.5
}
```

`GET {{baseUrl}}/api/pfriends/profile/me` mengembalikan profil pribadi, `avatarAsset`, statistik Cerita, status dan riwayat consent, serta produk. Pemilik selalu dapat membaca avatarnya sendiri. Maksimal 12 skill, masing-masing 60 karakter. `profileVisibility` adalah `DIRECTORY` atau `PRIVATE`. Field bisnis hanya diterapkan untuk WOMENPRENEUR. Foto profil menerima JPEG, PNG, atau WebP maksimal 2 MB.

### Consent profil

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/pfriends/profile/consents/{{type}}/grant` | Memberikan consent memakai versi kebijakan aktif |
| POST | `/api/pfriends/profile/consents/{{type}}/revoke` | Mencabut consent tanpa mengubah poin atau tier |

Tanpa body. `type` adalah consent opsional, misalnya `PUBLIKASI_NAMA`, `PUBLIKASI_FOTO_WAJAH`, `KONTAK_UNTUK_MENTORING`, `PUBLIKASI_CERITA`, atau `PUBLIKASI_DATA_USAHA`. Consent internal tidak dapat diubah mandiri. Setiap tindakan menambah rekaman baru dan tidak menimpa riwayat lama. Pencabutan consent foto atau kontak menyembunyikan field terkait dari Jejaring, tetapi tidak menghapus data profil pribadi.

### Etalase Womenpreneur

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/pfriends/profile/products` | `multipart/form-data`: `name`, `category`, `description`, dan `image` wajib |
| PATCH | `/api/pfriends/profile/products/{{productId}}` | Field yang diubah; `image` opsional |
| DELETE | `/api/pfriends/profile/products/{{productId}}` | Tanpa body |

Maksimal lima produk per Awardee Womenpreneur. Foto menerima JPEG, PNG, atau WebP maksimal 5 MB. Etalase dan kontak usaha hanya muncul di Jejaring ketika profil berstatus `DIRECTORY` dan consent `PUBLIKASI_DATA_USAHA` aktif.

## 12. Administrasi Awardee

| Method | Endpoint | Query/body |
|---|---|---|
| GET | `/api/pfriends/admin/awardees` | `page`, `perPage` maksimal 50, `q`, `accountStatus`, `membershipStatus`, `community`, `chapter` |
| GET | `/api/pfriends/admin/awardees/{{awardeeId}}/history` | Detail dan 100 audit terbaru |
| POST | `/api/pfriends/admin/awardees/{{awardeeId}}/account-status` | Body status |
| POST | `/api/pfriends/admin/awardees/{{awardeeId}}/membership-status` | Body status |
| POST | `/api/pfriends/admin/awardees/{{awardeeId}}/impersonate` | Tanpa body; menghasilkan token Awardee sementara 30 menit |
| GET | `/api/pfriends/admin/dashboard` | Tanpa body |

Body status:

```json
{
  "status": "TERKUNCI",
  "reason": "Alasan perubahan minimal sepuluh karakter."
}
```

Status akun: `AKTIF`, `TERKUNCI`, `NONAKTIF`. Status keanggotaan: `AKTIF`, `DORMAN`, `NONAKTIF`.

## 13. API publik

Tidak memerlukan Bearer token.

| Method | Endpoint | Query/keterangan |
|---|---|---|
| GET | `/api/pfriends/public/stories` | Daftar Cerita terpublikasi |
| GET | `/api/pfriends/public/stories/{{storySlug}}` | Detail Cerita dan menambah jumlah view |
| GET | `/api/pfriends/public/leaderboard` | Query `limit`, default 8, maksimal 20 |
| GET | `/api/pfriends/public/communities` | Ringkasan komunitas |
| GET | `/api/pfriends/public/movements` | Gerakan publik `BERJALAN`/`SELESAI` |
| GET | `/api/pfriends/public/impact` | Snapshot KPI dampak publik |

## 14. Endpoint file PocketBase

File publik menggunakan:

```text
GET {{baseUrl}}/api/files/{collectionIdOrName}/{recordId}/{filename}
```

File protected seperti bukti memerlukan token file. SDK frontend mengambilnya melalui PocketBase Files API. Untuk Postman:

1. Panggil `POST {{baseUrl}}/api/files/token` dengan Bearer token.
2. Tambahkan query `?token=<file-token>` pada URL file.

## 15. Ringkasan struktur collection Postman

Susunan folder yang disarankan:

1. Auth & Session
2. Registration
3. Activity Evidence
4. Point Actions & Gamification
5. Broadcasts
6. Calendar Events
7. Movements
8. Stories
9. Rewards & Redemptions
10. Directory & Profile
11. Admin Awardees & Dashboard
12. Public Content
13. PocketBase Files

Gunakan request Postman berbeda untuk setiap role karena token membawa `role`, `status`, dan identitas Awardee yang digunakan oleh server untuk otorisasi serta pengisian field internal.
