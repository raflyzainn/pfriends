# Prompt Codex: Migrasi PFriends ke SvelteKit API

## Status implementasi 26 Agustus 2026

Instruksi pada dokumen ini sudah diimplementasikan secara lokal. Hasil audit saat ini:

- 95 custom HTTP endpoint dan 9 lifecycle/realtime behavior sudah diganti SvelteKit API;
- 104 dari 106 item berstatus `SELESAI_LOKAL`;
- 2 cron memiliki endpoint manual tetapi scheduler otomatis masih `BLOCKED_AUTOMATION`;
- E2E PocketBase sementara tanpa `pb_hooks` lulus 200 asersi;
- production tidak diakses atau di-seed oleh suite migrasi.

Status lengkap dan blocker tercatat di `docs/40-STATUS-AKHIR-MIGRASI-PB-HOOKS.md`. Matriks per item berada di `docs/38-MATRIKS-MIGRASI-SVELTEKIT-API.md`.

Gunakan instruksi berikut ketika membuka repository PFriends langsung di Codex.

## Konteks

Saya sedang mengerjakan repository PFriends yang sedang terbuka ini.

- Codex hanya dapat mengakses repository PFriends ini. Jangan mencari atau membuka repository lain seperti `pf-series-1`.
- PocketBase remote tersedia di `https://friend-api.pertaminafoundation.org`.
- PocketBase Admin UI tersedia di `https://friend-api.pertaminafoundation.org/_/`.
- Saya mempunyai akun superuser PocketBase.
- Collection/schema PFriends sudah saya import ke PocketBase remote.
- Saya tidak mempunyai akses filesystem, SSH, binary, atau deployment server PocketBase untuk memasang `pb_hooks`.
- Jangan mengakses, mengubah, atau mengisi data production tanpa izin eksplisit.
- Jangan pernah menjalankan `seed-demo.mjs` terhadap production.

## Tujuan utama

Ubah arsitektur backend PFriends secara bertahap dari custom PocketBase `pb_hooks` menjadi SvelteKit API yang berkomunikasi dengan PocketBase remote.

Target arsitektur:

```text
Browser
-> SvelteKit API /api/pfriends/*
-> PocketBase remote https://friend-api.pertaminafoundation.org
```

Pola yang diinginkan:

1. Browser memanggil endpoint same-origin milik aplikasi SvelteKit.
2. Endpoint SvelteKit memvalidasi sesi, role, status akun, ownership, status workflow, dan input.
3. Endpoint SvelteKit berkomunikasi dengan PocketBase remote melalui PocketBase SDK.
4. Credential administratif hanya tersedia di server.
5. PocketBase digunakan sebagai auth, database, dan file storage.
6. Logika bisnis secara bertahap dipindahkan ke endpoint SvelteKit.
7. Frontend tidak lagi memanggil custom endpoint `pb_hooks` secara langsung untuk fitur yang sudah dimigrasikan.

Import collection tidak otomatis memasang:

- `pocketbase/pb_hooks/`;
- lifecycle hooks;
- custom endpoint `routerAdd(...)`;
- validasi workflow;
- transaksi;
- audit;
- perhitungan poin;
- idempotency;
- aturan gamifikasi dan reward.

## Audit sebelum implementasi

Sebelum mengubah kode:

1. Baca dokumentasi repository, terutama jika tersedia:
   - `README.md`
   - `CHECKLIST-MIGRASI-HALAMAN.md`
   - `ROADMAP-POCKETBASE.md`
   - `CHECKPOINT.md`
   - seluruh dokumen relevan dalam `docs/`
2. Periksa kondisi Git working tree. Jangan menimpa perubahan pengguna yang tidak terkait.
3. Periksa:
   - `package.json`
   - `svelte.config.js`
   - `.env.example`
   - `src/hooks.server.js`
   - route guards
   - auth dan session store
   - `src/routes/`
   - `src/lib/infrastructure/pocketbase/`
   - `pocketbase/pb_hooks/`
   - `pocketbase/pb_migrations/`
   - scripts pengujian
   - seluruh pemanggilan `/api/pfriends/*`
4. Periksa schema lokal, tetapi jangan menganggap schema remote identik.
5. Jangan menghubungi atau memodifikasi PocketBase production selama audit.

## Matriks migrasi

Buat inventaris seluruh endpoint dan lifecycle hook. Untuk setiap item, catat:

- file hook;
- method dan path endpoint;
- frontend atau store pemanggil;
- collection yang dibaca dan ditulis;
- role yang diperbolehkan;
- validasi status dan ownership;
- lifecycle hook terkait;
- penggunaan transaksi;
- operasi multi-record;
- kebutuhan upload atau protected file;
- risiko race condition;
- tingkat risiko;
- endpoint SvelteKit pengganti;
- tahap dan status migrasi.

Kelompokkan menjadi:

1. Public read-only.
2. Authenticated read-only.
3. Write sederhana.
4. Workflow multi-record.
5. Operasi transaksional kritis.

Operasi kritis mencakup pemberian poin, ledger gamifikasi, approval Bukti Keaktifan, daily cap, reward redemption, kuota reward, perubahan tier, movement workflow, audit, dan impersonation.

## Fondasi SvelteKit server

PFriends mungkin masih menggunakan `@sveltejs/adapter-static`. Adapter statis tidak dapat menjalankan `+server.js` saat production.

1. Tentukan target deployment berdasarkan bukti repository.
2. Jika targetnya Cloudflare Pages/Workers, gunakan `@sveltejs/adapter-cloudflare`.
3. Jika target deployment tidak dapat ditentukan, jangan menebak dan jangan mengubah adapter. Jelaskan keputusan yang dibutuhkan.
4. Buat server-side PocketBase client, misalnya `src/lib/server/pocketbase.js`.
5. Pisahkan client pengguna berdasarkan token dengan client administratif.
6. Buat helper autentikasi, RBAC, validasi input, dan pemetaan error.
7. Buat endpoint dalam `src/routes/api/pfriends/.../+server.js`.

Gunakan pola berikut hanya sebagai referensi dan sesuaikan dengan SDK aktual:

```js
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

const PB_URL = env.PB_URL || 'https://friend-api.pertaminafoundation.org';

export function createUserPocketBase(token) {
    const pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    if (token) pb.authStore.save(token, null);
    return pb;
}
```

Jangan menyalin contoh tanpa memeriksa versi dan API PocketBase SDK yang terpasang.

## Environment dan secret

- Secret wajib server-only.
- Jangan gunakan prefix `VITE_` atau `PUBLIC_` untuk email, password, atau token superuser.
- Jangan mengirim credential administratif ke browser.
- Jangan menulis credential asli ke source code, log, test fixture, dokumentasi, atau commit.
- Perbarui `.env.example` hanya menggunakan placeholder.

Contoh:

```env
PB_URL=https://friend-api.pertaminafoundation.org
PB_SUPERUSER_EMAIL=
PB_SUPERUSER_PASSWORD=
```

## Keamanan

1. Jangan mempercayai role dari request body, localStorage, atau session frontend.
2. Validasi token pengguna ke PocketBase dan ambil role serta status terbaru.
3. Periksa role, status akun, ownership, dan status transition pada server.
4. Cegah filter injection dan validasi request body.
5. Jangan membocorkan email, telepon, WhatsApp, bukti privat, atau identitas sensitif melalui DTO publik.
6. Periksa cookie HttpOnly, Secure, SameSite, CSRF, dan CORS.
7. Pending applicant hanya boleh mengakses status pendaftaran dan tidak boleh mendapat akses Awardee penuh.
8. Jangan mencatat password atau token lengkap.

## Batasan transaksi

PocketBase REST menjalankan operasi per request. Beberapa request REST tidak otomatis menjadi satu transaksi.

Jika hook lama menggunakan `e.app.runInTransaction(...)`, jangan menerjemahkannya menjadi beberapa pemanggilan `create()` atau `update()` dan menganggapnya atomic.

Untuk endpoint transaksional:

1. Audit invariant dan kemungkinan partial failure.
2. Periksa unique index dan idempotency key.
3. Periksa concurrent request dan race condition.
4. Tentukan retry dan reconciliation process.
5. Jangan memigrasikan operasi kritis sebelum desain konsistensinya aman.
6. Jika atomicity tidak bisa dicapai melalui REST, tandai sebagai blocker arsitektur.
7. Berikan pilihan konkret, seperti hook minimal oleh pemilik server, backend dengan transaksi, atau idempotency dan reconciliation dengan keterbatasan yang dijelaskan.

Jangan menurunkan keamanan atau konsistensi hanya agar migrasi terlihat selesai.

## Urutan pengerjaan

### Tahap pertama

1. Audit repository dan seluruh hooks.
2. Buat dokumen matriks migrasi.
3. Tentukan target deployment dari bukti repository.
4. Buat desain autentikasi SvelteKit ke PocketBase remote.
5. Pilih satu vertical slice read-only berisiko rendah.
6. Implementasikan fondasi server-side PocketBase dan endpoint tersebut jika aman.
7. Ubah infrastructure adapter frontend terkait agar memakai endpoint same-origin.
8. Pertahankan DTO dan struktur presentation, store/domain, serta infrastructure.

Kandidat vertical slice yang perlu dipertimbangkan:

- public stories;
- public impact;
- public communities;
- public movements;
- public leaderboard;
- calendar;
- directory;
- dashboard agregat.

Jangan memilih semuanya sekaligus. Tentukan kandidat final berdasarkan dependensi dan risiko aktual.

### Tahap berikutnya

Setelah vertical slice pertama terverifikasi, siapkan urutan migrasi untuk profile, consent, forum, broadcast, stories, registration, movements, admin, verifier, gamification, dan rewards.

Jangan menghapus hooks lama. Fitur yang belum dimigrasikan harus tetap kompatibel dengan implementasi lama.

## Dokumentasi wajib

Untuk setiap fitur yang diimplementasikan:

1. Buat atau perbarui dokumen fitur dalam `docs/`.
2. Perbarui `CHECKLIST-MIGRASI-HALAMAN.md`.
3. Perbarui traceability hook lama, endpoint lama, endpoint baru, pemanggil, collection, dan status verifikasi.
4. Dokumentasikan environment variables dan deployment.
5. Dokumentasikan risiko dan blocker transaksi.
6. Hindari em dash dalam dokumentasi, komentar, UI copy, dan laporan.

## Verifikasi minimal

- compile dan build production berhasil;
- secret tidak masuk client bundle;
- endpoint public hanya mengeluarkan field publik;
- endpoint authenticated menolak token kosong dan tidak valid;
- Awardee tidak dapat mengakses endpoint Admin atau Verifikator;
- role dan status akun diperiksa dari backend;
- data pengguna lain tidak bocor;
- filter status dan audience diterapkan;
- frontend fitur yang dimigrasikan tidak lagi memanggil custom endpoint PocketBase secara langsung;
- error PocketBase dipetakan dengan aman;
- test write tidak dijalankan terhadap production.

Gunakan PocketBase lokal atau test environment untuk write test. Jika live E2E tidak dapat dijalankan, nyatakan secara eksplisit bahwa live E2E belum terverifikasi.

## Aturan kerja

- Kerjakan bertahap dan berdasarkan bukti repository.
- Jangan berhenti pada daftar folder.
- Jangan melakukan deployment production.
- Jangan mengubah data remote tanpa izin eksplisit.
- Jangan meminta saya menuliskan credential di chat atau source code.
- Jangan menimpa perubahan Git yang tidak terkait.
- Jangan melakukan refactor besar di luar scope.
- Jangan menggunakan data dummy sebagai implementasi akhir.
- Jangan menjalankan demo seeder terhadap production.
- Setelah audit, lanjutkan vertical slice pertama jika aman.
- Jika keputusan adapter benar-benar tidak dapat ditentukan, berhenti sebelum mengubah adapter dan jelaskan informasi yang dibutuhkan.

## Laporan akhir

Berikan:

1. Ringkasan arsitektur sebelum dan sesudah.
2. Matriks hooks dan endpoint.
3. Daftar file yang berubah.
4. Endpoint yang sudah dan belum dimigrasikan.
5. Risiko transaksi dan blocker.
6. Environment yang diperlukan.
7. Hasil test dan build yang benar-benar dijalankan.
8. Rekomendasi tahap berikutnya.

Mulai dengan membaca seluruh dokumentasi dan memeriksa kondisi repository. Jangan mengakses PocketBase production atau melakukan perubahan remote sebelum saya memberikan izin eksplisit.
