# Registrasi dan Verifikasi Akun Awardee

## Tujuan

Fitur ini memungkinkan alumni SOBI dan penerima manfaat PFpreneur mendaftar mandiri. Akun belum memperoleh akses komunitas sampai data diri dan bukti ke-Awardee-an disetujui Verifikator.

## Alur status

```text
PENDING
  -> APPROVED
  -> CLARIFICATION -> PENDING
  -> REJECTED -> CLARIFICATION (dibuka kembali Verifikator)
```

- `PENDING`: menunggu keputusan Verifikator.
- `CLARIFICATION`: pendaftar boleh memperbaiki data selain email dan mengganti bukti.
- `APPROVED`: profil Awardee dibuat dan akun diaktifkan.
- `REJECTED`: terminal bagi pendaftar; hanya Verifikator dapat membuka kembali.

Admin dapat memantau seluruh status, tetapi endpoint keputusan menolak role selain `VERIFIER`.

## Data dan collection

- `users`: PocketBase Auth, role, status akses, `onboardingStatus`, dan `awardeeId`.
- `awardee_registrations`: snapshot data pendaftaran, consent, maksimal tiga bukti protected, status, dan keputusan terakhir.
- `registration_reviews`: audit append-only untuk klarifikasi, pengiriman ulang, approval, penolakan, dan pembukaan kembali.
- `awardees`: profil Awardee yang baru dibuat ketika approval berhasil.

Komunitas dan program asal disimpan terpisah. Komunitas adalah `SOBI` atau `WOMENPRENEUR` (label PFpreneur), sedangkan program asal adalah `PFprestasi`, `PFmuda`, `PFsains`, atau `PFlestari`.

## Endpoint

| Method | Endpoint | Akses | Fungsi |
|---|---|---|---|
| `POST` | `/api/pfriends/registrations` | Publik | Membuat auth user nonaktif dan registrasi |
| `GET` | collection `awardee_registrations` | Pemilik/Verifikator/Admin | Membaca status atau antrean |
| `PATCH` | `/api/pfriends/registrations/me` | Pendaftar berstatus klarifikasi | Mengirim perbaikan |
| `POST` | `/api/pfriends/registrations/{id}/decision` | Verifikator aktif | ACC, klarifikasi, tolak, atau buka kembali |

Role, status, pemilik, reviewer, dan `awardeeId` selalu ditetapkan hook server. Approval berjalan dalam satu transaksi: profil dibuat, user ditautkan dan diaktifkan, registrasi diperbarui, lalu audit ditulis. Kegagalan salah satu langkah membatalkan semuanya.

## UI

- `/daftar`: formulir registrasi Awardee.
- `/pendaftaran/status`: status terbatas bagi akun pending/klarifikasi/ditolak.
- `/verifikator/pendaftaran`: antrean, bukti, dan keputusan.
- `/admin/pendaftaran`: pemantauan read-only.

## Login staf dan TODO SSO

Password login Verifikator/Admin hanya untuk demo lokal. Aktifkan kedua flag berikut:

```dotenv
VITE_ENABLE_DEMO_LOGIN=1
PB_REQUIRE_STAFF_SSO=0
```

Flag pertama mengendalikan kartu UI. Selama SSO belum tersedia, password auth staf tetap aktif. Setelah provider SSO siap, ubah flag kedua menjadi `1` untuk menolak login password staf. Komentar `TODO(SSO)` menandai adapter dan UI yang akan diganti `authWithOAuth2` setelah provider, domain korporat, dan pemetaan claim disepakati.

`npm run pb:serve` memuat `.env` melalui launcher Node sebelum menjalankan binary PocketBase, sehingga flag server benar-benar tersedia bagi hook. Rahasia superuser tetap hanya dipakai script seed dan tidak masuk bundle browser.

Email verification, SMTP, notifikasi email, pemulihan password, dan implementasi OAuth belum termasuk fase ini.

## Menjalankan dan memverifikasi

Restart PocketBase agar migration dan hook baru dimuat, kemudian seed akun demo:

```powershell
npm run pb:serve
npm run pb:seed
npm run dev
```

Gerbang kode:

```powershell
npm run verify:compile
npm run verify:domain
npm run verify:seed
npm run build
```

Integration test registrasi bersifat mutatif dan ditujukan untuk database sementara yang sudah di-seed dengan mode demo staf aktif:

```powershell
$env:VITE_PB_URL='http://127.0.0.1:8091'
npm run verify:registration
```

Tes itu membuktikan registrasi, login pending, klarifikasi, pengiriman ulang, approval, aktivasi user, pembuatan profil, dan audit sebanyak sebelas asersi.
