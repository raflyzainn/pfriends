# Status Akhir Migrasi `pb_hooks`

Tanggal audit: 26 Agustus 2026.

## Sudah selesai lokal

- [x] Fondasi SvelteKit API, server PocketBase client, auth refresh, RBAC, ownership, validasi, error mapping, dan Batch API.
- [x] Login dan pemeriksaan sesi.
- [x] Registrasi, status applicant, riwayat keputusan, klarifikasi, kirim ulang, dan approval menjadi Awardee.
- [x] Profil, avatar, consent, Jejaring, dan produk Womenpreneur.
- [x] Bukti Keaktifan, timeline review, revisi, approval, ledger poin, dan pencabutan poin.
- [x] Kabar, durasi baca, tanggapan CTA, publikasi, jadwal manual, dan poin engagement.
- [x] Kalender kegiatan, usulan, keputusan, registrasi peserta, dan transisi status.
- [x] Forum kanal, pesan, konteks, reaksi, hapus, presence, dan rule SSE.
- [x] Gamifikasi, leaderboard, tier dinamis, preview dampak, optimistic concurrency, dan audit.
- [x] Reward, wallet koin, penukaran atomik, workflow fulfillment, refund, arsip, dan hapus.
- [x] Gerakan, revisi usulan, join, laporan leader/participant, review, poin, dan penyelesaian.
- [x] Cerita privat, draf, submit, review, checklist sensitivitas, publish, archive, consent revoke, dan konten publik.
- [x] Admin Awardee, status akun, status keanggotaan, audit, impersonasi, dan akhir impersonasi.
- [x] Dasbor Awardee, Verifikator, dan Admin melalui DTO server.
- [x] Enam endpoint konten publik tanpa PII.
- [x] Seluruh pemanggil custom API frontend memakai same-origin `/api/pfriends/*`.
- [x] PocketBase lokal berjalan dengan `pocketbase/pb_no_hooks`.
- [x] Migration boundary menutup direct write yang sebelumnya bergantung lifecycle hook.
- [x] Matrix audit menemukan 106 item: 104 `SELESAI_LOKAL`, 2 `BLOCKED_AUTOMATION`.
- [x] E2E fresh database tanpa hook: 200 asersi lulus.

## Belum selesai

- [ ] E2E terhadap PocketBase production. Tidak dijalankan agar tidak membaca atau mengubah data production tanpa izin terpisah.
- [ ] Deployment SvelteKit API ke Cloudflare Pages beserta secret production.
- [ ] Aktivasi dan validasi Microsoft Entra SSO. Password staf masih dapat dipakai ketika `PB_REQUIRE_STAFF_SSO=0`.
- [ ] Pengujian upload dan akses file terhadap Cloudflare R2 production.

Item di atas bukan dependensi `pb_hooks`, tetapi masih diperlukan sebelum klaim siap production penuh.

## Blocker

- [!] `pfriends-publish-broadcasts`: endpoint manual selesai, scheduler otomatis belum dipilih.
- [!] `profile-consent-expiry`: endpoint manual selesai, scheduler otomatis belum dipilih.

Pilihan penyelesaian blocker adalah Cloudflare Cron Trigger, GitLab Schedule, atau scheduler eksternal yang memanggil endpoint job menggunakan autentikasi server-ke-server. Jangan memakai token pengguna Admin yang disimpan permanen sebagai secret scheduler.

## Batas deployment

- Import collection tidak memasang `pb_hooks`, migration, data, atau scheduler.
- Production wajib mempunyai schema migration terbaru dan Batch API aktif.
- `seed-demo.mjs` hanya untuk PocketBase lokal atau database test sementara dan menolak host production.
- Kartu akun demo wajib mati pada remote dengan `VITE_ENABLE_DEMO_LOGIN=0`.
- Kredensial superuser wajib berada pada secret server `PB_SUPERUSER_EMAIL` dan `PB_SUPERUSER_PASSWORD`.
- URL publik PocketBase harus tersedia pada `VITE_PB_URL`; salah ketik membuat client file kembali ke localhost.

## Perintah verifikasi

```powershell
npm run verify:backend
npm run verify
```

Rincian setiap endpoint, event, dan cron terdapat di `38-MATRIKS-MIGRASI-SVELTEKIT-API.md`. Arsitektur dan konfigurasi terdapat di `39-FONDASI-SVELTEKIT-API.md`.
