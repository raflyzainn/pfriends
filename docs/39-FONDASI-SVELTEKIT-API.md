# Runtime SvelteKit API

## Status 26 Agustus 2026

Seluruh custom HTTP endpoint dan lifecycle/realtime behavior dalam `pocketbase/pb_hooks` sudah memiliki pengganti lokal pada SvelteKit API. Matriks aktual berada di `38-MATRIKS-MIGRASI-SVELTEKIT-API.md`:

- 95 custom HTTP endpoint selesai lokal;
- 9 lifecycle atau realtime behavior selesai lokal;
- 2 cron job memiliki endpoint manual, tetapi automation scheduler masih berstatus `BLOCKED_AUTOMATION`;
- total matriks 106 item: 104 `SELESAI_LOKAL` dan 2 `BLOCKED_AUTOMATION`;
- tidak ada klaim `SELESAI_REMOTE` karena suite tidak dijalankan terhadap production.

Folder `pocketbase/pb_hooks` dipertahankan sebagai referensi legacy. `npm run pb:serve` memakai `pocketbase/pb_no_hooks`, jadi hasil pengujian tidak bergantung pada hook lama.

## Arsitektur aktif

```text
Browser
  -> /api/pfriends/* pada SvelteKit
  -> PocketBase REST API
  -> collection dan file storage
```

SvelteKit memeriksa bearer token dengan `authRefresh()`, status akun, role, ownership, transisi workflow, input, idempotency, dan operasi batch. Kredensial superuser hanya tersedia pada runtime server.

Dua akses browser ke PocketBase yang tetap disengaja adalah:

- PocketBase SDK menyimpan token sesi dan meminta token file untuk protected file;
- Forum membuka subscription SSE langsung ke collection yang sudah dibatasi API rule berdasarkan sesi dan komunitas.

Seluruh custom `/api/pfriends/*` tetap dipanggil melalui same-origin SvelteKit API.

## Environment lokal

```dotenv
VITE_PB_URL=http://127.0.0.1:8090
PB_URL=http://127.0.0.1:8090
PB_SUPERUSER_EMAIL=
PB_SUPERUSER_PASSWORD=
PB_REQUIRE_STAFF_SSO=0
VITE_ENABLE_DEMO_LOGIN=1
APP_ENV=development
ALLOW_DEMO_SEED=1
```

Jalankan PocketBase lokal tanpa custom hooks, seed demo, lalu SvelteKit:

```powershell
npm run pb:serve
$env:ALLOW_DEMO_SEED='1'; $env:APP_ENV='development'; npm run pb:seed
npm run dev
```

`seed-demo.mjs` menolak host production meskipun flag diaktifkan.

## Environment dengan PocketBase production

```dotenv
VITE_PB_URL=https://friend-api.pertaminafoundation.org
PB_URL=https://friend-api.pertaminafoundation.org
PB_SUPERUSER_EMAIL=<email-superuser>
PB_SUPERUSER_PASSWORD=<password-superuser>
PB_REQUIRE_STAFF_SSO=0
VITE_ENABLE_DEMO_LOGIN=0
APP_ENV=production
ALLOW_DEMO_SEED=0
```

`VITE_PB_URL` diperlukan oleh client browser untuk sesi, protected file, dan SSE Forum. Hanya URL publik yang boleh memakai prefix `VITE_`. `PB_URL` dan `PB_SUPERUSER_*` wajib disimpan sebagai secret Cloudflare, bukan sebagai variable browser.

Sesudah mengubah `.env`, restart `npm run dev` dan muat ulang browser. Typo seperti `ITE_PB_URL` menyebabkan client jatuh ke fallback `http://127.0.0.1:8090`.

## Syarat PocketBase remote

Collection/schema yang sesuai migration harus sudah tersedia. PocketBase Batch API juga wajib diaktifkan dari Dashboard pada **Settings > Application > Batch requests**. Konfigurasi yang telah lulus pada suite lokal:

- enabled: aktif;
- max requests: minimal 50;
- timeout: minimal 15 detik;
- max body size: minimal 67108864 byte atau 64 MiB.

Jika Batch API tidak aktif, operasi atomik mengembalikan kode `BLOCKED_BATCH_API`. Ini bukan alasan untuk mengganti transaksi menjadi beberapa write terpisah.

## Registrasi dan akun

Kredensial Dashboard PocketBase adalah superuser, bukan akun aplikasi PFriends. Form login PFriends hanya menerima akun pada collection `users`.

Registrasi baru membuat record `users` dan `awardee_registrations` dalam satu batch. Record `registration_reviews` memang masih kosong sampai ada keputusan `REQUEST_CLARIFICATION`, `APPROVE`, `REJECT`, `REOPEN`, atau event `RESUBMIT`.

Applicant dengan onboarding `PENDING`, `CLARIFICATION`, atau `REJECTED` dapat:

- login;
- membaca `/api/pfriends/registrations/me`;
- membaca riwayat miliknya di `/api/pfriends/registrations/{id}/reviews`;
- mengirim ulang ketika status `CLARIFICATION`.

Applicant belum memperoleh akses area Awardee sebelum disetujui.

## Automation yang belum selesai

Dua endpoint manual tersedia dan sudah diuji:

- `POST /api/pfriends/admin/jobs/publish-broadcasts`;
- `POST /api/pfriends/admin/jobs/expire-profile-consents`.

Parity cron otomatis tetap terblokir sampai deployment memilih Cloudflare Cron Trigger, GitLab Schedule, atau scheduler lain yang dapat memanggil endpoint dengan autentikasi server-ke-server.

## Verifikasi

```powershell
npm run verify:backend
npm run verify
```

Hasil terakhir pada PocketBase sementara dengan migration fresh dan `pb_no_hooks`:

- matriks: 106 item, 104 selesai lokal, 2 blocker automation;
- E2E SvelteKit API: 200 asersi lulus;
- custom endpoint lama pada PocketBase: 404 sebagaimana diharapkan;
- production tidak dibaca, ditulis, atau di-seed oleh suite ini.
