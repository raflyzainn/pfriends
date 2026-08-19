# Koin, Reward, dan Penukaran PocketBase

Status per 19 Agustus 2026: saldo Koin Tukar, katalog reward, kuota bulanan, Pesanan Saya, dan pemrosesan pesanan oleh Admin sudah menggunakan PocketBase.

## Cara memperoleh lencana dan koin

Lencana tidak diberikan oleh browser. PocketBase mengevaluasi `verified_point_activities`, streak, tier, jenis aktivitas, dan komunitas. Hasilnya disimpan pada `awardee_badges`. Jika sumber pencapaiannya dicabut, lencana berubah menjadi `REVOKED` dan bonusnya dikoreksi.

Koin Tukar memakai aturan berikut:

- setiap 1 Poin Kontribusi terverifikasi menghasilkan 1 KT;
- lencana `UMUM` memberi 25 KT;
- lencana `LANGKA` memberi 75 KT;
- lencana `EPIK` memberi 200 KT;
- lencana `LEGENDARIS` memberi 500 KT.

Semua kredit, debit, koreksi, penukaran, dan refund dicatat append-only pada `coin_transactions`. `coin_accounts` hanya merupakan proyeksi saldo yang dapat dibangun ulang. Penukaran tidak mengurangi Poin Kontribusi maupun tier.

## Pesanan Saya dan alur Admin

Saat Awardee menukar hadiah, server memeriksa role, status akun, komunitas, tier, status reward, saldo, dan kuota dalam satu transaksi. `requestKey` unik mencegah klik ganda membuat dua debit.

- Reward tanpa persetujuan langsung berstatus `DIKIRIM`.
- Reward dengan persetujuan dimulai dari `DIAJUKAN`.
- Verifikator memproses `DIAJUKAN -> DISETUJUI -> DIKIRIM -> SELESAI`.
- Verifikator dapat mengubah `DIAJUKAN -> DITOLAK` dengan alasan minimal lima karakter.
- Penolakan mengembalikan KT tepat satu kali dan membebaskan kuota bulan tersebut.

Awardee melihat perubahan pada tab **Pesanan Saya**. Verifikator memprosesnya di `/verifikator/gamifikasi`, termasuk tautan WhatsApp Awardee. Admin hanya memantau pesanan di `/admin/gamifikasi`. Admin dan Verifikator sama-sama dapat membuat, membaca, mengubah, serta menghapus/nonaktifkan katalog hadiah.

## Koleksi dan endpoint

- `coin_accounts`, `coin_transactions`, `rewards`, dan `redemptions` dibuat melalui migration versioned.
- `GET /api/pfriends/achievements` membaca wallet, katalog, kuota, dan pesanan Awardee.
- `POST /api/pfriends/redemptions` membuat penukaran atomik.
- `GET /api/pfriends/admin/redemptions` membaca antrean staf.
- `POST /api/pfriends/admin/redemptions/{id}/transition` menjalankan transisi dan audit Verifikator.
- `/api/pfriends/staff/rewards` menyediakan CRUD katalog untuk Admin dan Verifikator.

Collection dikunci dari CRUD browser biasa. Data hanya keluar atau berubah melalui endpoint yang memeriksa role.

## Seed dan verifikasi

`npm run pb:seed` mengimpor 12 reward dan 13 penukaran historis secara idempoten serta merekonsiliasi saldo akun demo. Jalankan `npm run verify:rewards` untuk menguji saldo seed, katalog, idempotensi, debit, RBAC, antrean, penolakan, refund, dan pencegahan refund ganda.
