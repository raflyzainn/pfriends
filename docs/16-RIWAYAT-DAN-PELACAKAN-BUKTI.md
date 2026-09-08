# Riwayat Review dan Pelacakan Bukti Keaktifan

## Tujuan

Fitur ini membuat proses verifikasi dapat dilacak oleh Awardee dan diaudit oleh Verifikator. Status tidak lagi hanya berarti menunggu atau selesai: ketika Verifikator mulai bekerja, PocketBase menyimpan status `IN_REVIEW` yang dapat dilihat Awardee dari perangkat lain.

## Alur status

```text
SUBMITTED
  -> IN_REVIEW
       -> NEEDS_REVISION -> SUBMITTED -> IN_REVIEW
       -> APPROVED
```

- `SUBMITTED`: bukti sudah dikirim dan belum diambil untuk diperiksa.
- `IN_REVIEW`: Verifikator telah menekan **Mulai periksa**.
- `NEEDS_REVISION`: Awardee harus memperbaiki bukti sesuai catatan.
- `APPROVED`: bukti diterima dan poin telah diproses server.

Semua Verifikator aktif dapat memberi keputusan pada submission `IN_REVIEW`. Keputusan dijalankan dalam transaksi; bila dua Verifikator memutuskan bersamaan, hanya transaksi pertama yang berhasil.

## Penyimpanan data

### `activity_submissions`

Menyimpan status terkini, `reviewStartedAt`, pemeriksa terakhir, catatan terakhir, jumlah revisi, dan poin yang diberikan.

### `submission_reviews`

Riwayat keputusan append-only. Satu record dibuat untuk setiap `APPROVE` atau `REQUEST_REVISION`. Collection ini menjadi sumber tab **Riwayat keputusan** Verifikator.

### `submission_status_events`

Audit trail append-only untuk event `SUBMITTED`, `REVIEW_STARTED`, `REVISION_REQUESTED`, `RESUBMITTED`, dan `APPROVED`.

Frontend tidak dapat membuat, mengubah, atau menghapus event. API rules hanya mengizinkan Awardee pemilik submission dan Verifikator membaca event.

## Endpoint server

```http
POST /api/pfriends/activity-submissions/{id}/start-review
POST /api/pfriends/activity-submissions/{id}/review
```

Endpoint pertama mengubah `SUBMITTED` menjadi `IN_REVIEW`. Endpoint kedua hanya menerima submission `IN_REVIEW` dengan keputusan `APPROVE` atau `REQUEST_REVISION`.

## Antarmuka

Awardee membuka `/awardee/bukti-keaktifan` untuk melihat seluruh pengajuan dan `/awardee/bukti-keaktifan/{id}` untuk melihat detail, lampiran protected, catatan, poin, serta timeline status.

Verifikator membuka `/verifikator/bukti-keaktifan`. Tab **Antrean** menampilkan status terkini seluruh submission. Tab **Riwayat keputusan** memuat 25 keputusan per halaman dan dapat difilter berdasarkan approve atau permintaan revisi.

## Menjalankan dan memverifikasi

Restart PocketBase agar migration dan hook baru dimuat:

```powershell
npm run pb:serve
```

Migration `1723968120_submission_tracking.js` diterapkan otomatis. Kemudian jalankan:

```powershell
npm run verify:pocketbase
npm run verify:compile
npm run build
```

Tes integrasi mencakup submit, mulai periksa, keputusan oleh Verifikator berbeda, revisi, kirim ulang, approval, audit trail, isolasi data Awardee, dan pencegahan keputusan ganda.
