# PocketBase dan Fitur Bukti Keaktifan

## Tujuan

Fitur ini adalah vertical slice backend pertama PFriends. Awardee mengirim bukti aktivitas, Verifikator meninjau, lalu PocketBase membukukan poin kanonik ketika bukti disetujui. Pengajuan yang belum layak dikembalikan dengan catatan dan dapat dikirim ulang.

## Arsitektur

```text
SvelteKit SPA
  -> session PocketBase Auth
  -> activitySubmissions store
  -> PocketBase API + protected files
  -> hook review dalam transaksi
  -> verified_point_activities
  -> ActivityRepository gabungan (Dexie demo + PocketBase)
```

Data fitur lama masih memakai Dexie. `ActivityRepository` membaca ledger lokal dan ledger terverifikasi PocketBase agar saldo serta leaderboard tidak berbeda. Ini adapter transisi; saat seluruh gamifikasi sudah dimigrasikan, Dexie dan penggabungan tersebut harus dihapus.

## Collection

### `users` (Auth)

Menampung 60 Awardee, dua Verifikator, dan satu Admin demo. Field khusus: `legacyAccountId`, `awardeeId`, `role`, `displayName`, `unit`, dan `status`. Pengalaman login tetap memakai kartu dan password demo, tetapi validasi kredensial serta token dilakukan PocketBase.

### `activity_submissions`

Menyimpan owner, Awardee, jenis aktivitas, tanggal, judul, deskripsi, tautan, maksimum lima file protected, status, reviewer, catatan, revision count, dan poin hasil keputusan.

Status yang sah:

```text
SUBMITTED -> IN_REVIEW -> NEEDS_REVISION -> SUBMITTED
SUBMITTED -> IN_REVIEW -> APPROVED
```

### `submission_reviews`

Riwayat keputusan append-only. Catatan minimal lima karakter wajib untuk `REQUEST_REVISION`.

### `submission_status_events`

Audit trail append-only untuk pengiriman, mulai pemeriksaan, permintaan revisi, kirim ulang, dan approval. Detail desain dan UI tracking dijelaskan di `docs/16-RIWAYAT-DAN-PELACAKAN-BUKTI.md`.

### `verified_point_activities`

Ledger poin yang hanya dapat dibuat hook server. Relation `submission` unik mencegah approval ganda. Nilai poin berasal dari tabel skor kanonik; daily cap dapat menghasilkan approval dengan nol poin dan `DAILY_CAP`.

## Keamanan

- Awardee hanya melihat record miliknya.
- Verifikator melihat antrean dan detail seluruh pengajuan.
- Owner, awardee, status, reviewer, dan poin ditetapkan server, bukan dipercaya dari browser.
- File JPG, PNG, WebP, dan PDF bersifat protected; maksimum lima file dan 5 MB per file.
- Endpoint keputusan hanya menerima token `users` ber-role `VERIFIER`.
- Approval, review log, dan ledger disimpan dalam satu transaksi.
- Superuser tidak pernah digunakan frontend dan variabel rahasianya tidak memakai prefix `VITE_`.

## Struktur implementasi

```text
pocketbase/
  pocketbase.exe                    binary lokal, tidak dikomit
  pb_data/                          data lokal, tidak dikomit
  pb_migrations/                    skema, index, dan API rules
  pb_hooks/                         validasi submission dan endpoint review
scripts/pocketbase/seed-demo.mjs    seed akun demo idempoten
src/lib/infrastructure/pocketbase/  client dan adapter ledger
src/lib/stores/                     store workflow submission
src/routes/awardee/bukti-keaktifan/ form dan riwayat Awardee
src/routes/verifikator/bukti-keaktifan/ antrean dan detail review
```

## Menjalankan di Windows

1. Pasang dependency:

```powershell
npm install
```

2. Unduh PocketBase v0.39.9 Windows amd64 dan letakkan binary di:

```text
pocketbase/pocketbase.exe
```

3. Jalankan backend:

```powershell
npm run pb:serve
```

4. Buka `http://127.0.0.1:8090/_/` dan buat superuser pertama.

5. Salin konfigurasi:

```powershell
Copy-Item .env.example .env
```

Isi:

```dotenv
VITE_PB_URL=http://127.0.0.1:8090
PB_SUPERUSER_EMAIL=superuser@example.com
PB_SUPERUSER_PASSWORD=ganti-dengan-password-kuat
```

6. PowerShell tidak otomatis memuat `.env` untuk script Node. Pasang dua nilai server-only pada terminal lalu jalankan seed:

```powershell
$env:PB_SUPERUSER_EMAIL='superuser@example.com'
$env:PB_SUPERUSER_PASSWORD='ganti-dengan-password-kuat'
npm run pb:seed
```

7. Jalankan frontend pada terminal lain:

```powershell
npm run dev
```

## Alur penggunaan

1. Masuk sebagai Awardee dari `/masuk`.
2. Buka `/awardee/bukti-keaktifan` melalui sidebar atau laci HP.
3. Isi jenis aktivitas, tanggal, judul, keterangan, tautan opsional, dan lampiran.
4. Masuk sebagai Verifikator dan buka `/verifikator/bukti-keaktifan`.
5. Buka detail; pilih `Setujui` atau tulis catatan lalu `Minta revisi`.
6. Awardee yang menerima revisi memperbaiki pengajuan yang sama.
7. Saat disetujui, poin tampil di ledger gabungan setelah refresh store/halaman.

## Katalog aksi dinamis

Pilihan Jenis aktivitas berasal dari `point_actions` aktif dengan workflow `EVIDENCE`. Jika katalog belum memiliki aksi yang sesuai, form menampilkan penjelasan dan tombol kirim dinonaktifkan. Verifikator atau Admin dapat menambah aksi melalui panel Kelola katalog aksi.

Aksi kustom menyimpan relasi `pointAction` dan snapshot `actionCode`. Field legacy `activityType` dikosongkan karena pilihan schema tersebut hanya memuat kode aksi inti. Nilai poin, kuota harian, label, dan status selalu dibaca ulang dari `point_actions` pada saat Verifikator menyetujui pengajuan.

## Verifikasi

```powershell
npm run verify:compile
npm run verify:domain
npm run verify:seed
npm run verify:purity
npm run build
```

Pengujian manual minimum memakai dua sesi browser:

- Awardee lain tidak dapat membuka submission milik orang lain lewat API.
- File lebih dari 5 MB atau format selain allowlist ditolak.
- Revisi tanpa catatan ditolak.
- Request approval kedua tidak membuat ledger baru.
- Approval yang melewati daily cap tetap approved dengan nol poin.

## Batasan versi pertama

- Data selain autentikasi, submission, review, dan poin terverifikasi masih dummy di Dexie.
- Koin Tukar, badge, reward, email, dan notifikasi realtime belum dipicu oleh approval.
- Revisi tidak dibatasi jumlahnya dan belum memiliki tenggat kedaluwarsa.
- PocketBase dan `pb_data` lokal tidak dikomit; migration dan hook adalah sumber konfigurasi yang dikomit.
