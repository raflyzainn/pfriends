# Calendar of Event: PocketBase

## Status implementasi

- [x] Collection `events` untuk usulan dan lifecycle kegiatan.
- [x] Collection `event_participants` untuk registrasi serta status kehadiran.
- [x] Kalender PocketBase dimulai kosong; `pb:seed` tidak membuat event.
- [x] Hanya Awardee aktif yang dapat mengusulkan event.
- [x] Usulan tidak tampil publik sebelum disetujui Verifikator.
- [x] Verifikator dapat menyetujui, menolak, membatalkan, dan mengubah lifecycle event.
- [x] Awardee dapat mendaftar dengan validasi waktu, kuota, dan duplikasi server-side.
- [x] Pendaftaran tidak memberikan poin.
- [x] Hanya peserta terdaftar yang dapat mengunggah bukti setelah event selesai.
- [x] Bukti hadir memakai file protected dan workflow pemeriksaan Verifikator.
- [x] Persetujuan bukti membukukan satu ledger `SESSION_ATTEND` sebesar 15 PK.
- [x] Pengajuan kehadiran bebas dari halaman Bukti Keaktifan umum ditutup.
- [x] Halaman publik, Awardee, dan Verifikator membaca event dari PocketBase.
- [x] Tanggal opsional kosong dari PocketBase dinormalisasi menjadi `null` agar respons 200 selalu dapat dibentuk menjadi entity frontend.
- [x] Tab “Usulan Saya” membandingkan relasi `proposedBy` dengan record ID PocketBase, bukan ID akun legacy.

## Alur

1. Awardee mengisi formulir pada `/awardee/kalender`; server menyimpan event sebagai `DIUSULKAN`.
2. Verifikator memutuskan usulan pada `/verifikator/kegiatan`.
3. Persetujuan mengubah status menjadi `TERJADWAL` dan event langsung tampil pada kalender publik serta Awardee.
4. Awardee mendaftar sebelum event dimulai. Endpoint registrasi mengunci pasangan event–Awardee dan memeriksa kuota dalam transaksi.
5. Setelah waktu selesai, peserta memilih 1–5 file JPG, PNG, WebP, atau PDF, maksimal 5 MB per file.
6. Verifikator membuka bukti dari bagian “Bukti hadir peserta”, memulai pemeriksaan, lalu meminta revisi atau menyetujui.
7. Persetujuan membuat satu `verified_point_activities` bernilai 15 PK dan menandai peserta `APPROVED`. Unique index mencegah klaim serta ledger ganda.

Aturan maksimum dua `SESSION_ATTEND` berpoin per Awardee per hari tetap berlaku. Bukti ketiga yang sah tetap dapat disetujui, tetapi ledger bernilai 0 dengan alasan `DAILY_CAP`.

## Endpoint

| Method | Endpoint | Aktor | Fungsi |
|---|---|---|---|
| `GET` | `/api/pfriends/events` | Publik | Event publik; Awardee juga melihat usulannya dan Verifikator melihat seluruh event. |
| `POST` | `/api/pfriends/events` | Awardee | Mengirim usulan event. |
| `POST` | `/api/pfriends/events/{id}/decision` | Verifikator | Menyetujui atau menolak usulan. |
| `PATCH` | `/api/pfriends/events/{id}` | Verifikator | Memperbaiki detail agenda tanpa melewati workflow status. |
| `POST` | `/api/pfriends/events/{id}/transition` | Verifikator | Mengubah status pelaksanaan atau membatalkan event. |
| `POST` | `/api/pfriends/events/{id}/register` | Awardee | Mendaftarkan diri ke event. |

Bukti hadir dibuat pada `activity_submissions` dengan `activityType=SESSION_ATTEND`, `event`, dan `eventParticipant`. Endpoint review bukti yang sudah ada tetap digunakan sehingga riwayat keputusan dan file protected konsisten dengan Bukti Keaktifan.

## Verifikasi

Jalankan PocketBase dengan migration dan hook terbaru, seed akun demo, kemudian:

```powershell
npm run verify:calendar
```

Tes ini memastikan seeder tidak menghasilkan event ketika `EXPECT_EMPTY_EVENTS=1`, lalu menguji proposal sampai ledger 15 poin.
