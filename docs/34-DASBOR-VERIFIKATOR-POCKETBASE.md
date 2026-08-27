# Dasbor Verifikator PocketBase

## Tujuan

Halaman `/verifikator` menjadi ringkasan operasional untuk melihat performa Awardee, pekerjaan yang menunggu, dan rekam kerja akun Verifikator. Seluruh angka operasional berasal dari PocketBase. Halaman ini tidak lagi memakai `dasbor-data.js` atau widget berlabel `DUMMY`.

## Endpoint

`GET /api/pfriends/verifier/dashboard` hanya menerima token user dengan role `VERIFIER`. Field lama seperti total poin, jumlah Awardee, tier, streak, badge, distribusi chapter, dan leaderboard tetap tersedia. `activeStreaks` sekarang menghitung Awardee dengan streak harian yang masih berjalan berdasarkan tanggal poin masuk WIB.

Respons juga membawa:

- `monthly`: Januari sampai Juli 2026, berisi poin terverifikasi dan Cerita terbit.
- `kpis`: nilai aktual KPI resmi M-01 sampai M-05. Rumusnya memakai utilitas yang sama dengan dasbor Admin.
- `reviewPerformance`: keputusan pada pekan berjalan WIB, rata-rata waktu tanggap hari kerja, tingkat persetujuan, dan jumlah keputusan tersimpan.
- `workRecord`: jumlah tindakan akun aktif pada Cerita, kegiatan, Bukti Keaktifan, pendaftaran, Gerakan, pesanan reward, dan usulan kegiatan.

DTO tidak menyertakan email Awardee, WhatsApp, catatan keputusan, isi Cerita, atau referensi berkas bukti.

## Aturan Perhitungan

Pekan berjalan dimulai Senin pukul 00.00 WIB. Rata-rata waktu tanggap menghitung hari kerja dari waktu pengajuan sampai keputusan tersimpan. Rekam kerja bersifat sepanjang waktu dan disaring berdasarkan record id user PocketBase yang sedang login.

Cerita, pendaftaran, Bukti Keaktifan, dan Gerakan dihitung dari collection audit. Kegiatan dihitung dari `reviewedBy`. Pesanan reward dihitung sebagai pesanan unik dengan `actedBy` terakhir karena schema pesanan belum memiliki audit untuk setiap transisi.

## Verifikasi

Jalankan:

```bash
npm run verify:verifier-dashboard
npm run verify:streak
npm run verify:compile
npm run verify:domain
npm run verify:seed
npm run verify:purity
npm run build
```

Tes integrasi memeriksa RBAC, tujuh bulan program, lima KPI, kesamaan nilai dengan dasbor Admin, rekam kerja seluruh workflow, bentuk metrik peninjauan, keamanan DTO, dan kestabilan pembacaan berulang.
