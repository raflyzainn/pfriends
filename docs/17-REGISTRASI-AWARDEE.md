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
| `GET` | `/api/pfriends/registrations/me` | Pemilik termasuk applicant nonaktif | Membaca status registrasi sendiri |
| `GET` | `/api/pfriends/registrations/{id}/reviews` | Pemilik/Verifikator/Admin | Membaca riwayat keputusan |
| `GET` | `/api/pfriends/registrations` | Verifikator/Admin | Membaca antrean; Admin hanya memantau melalui halaman read-only |
| `PATCH` | `/api/pfriends/registrations/me` | Pendaftar berstatus klarifikasi | Mengirim perbaikan |
| `POST` | `/api/pfriends/registrations/{id}/decision` | Verifikator aktif | ACC, klarifikasi, tolak, atau buka kembali |

Role, status, pemilik, reviewer, dan `awardeeId` selalu ditetapkan SvelteKit API. Approval berjalan dalam satu PocketBase batch: profil dibuat, user ditautkan dan diaktifkan, registrasi diperbarui, lalu audit ditulis. Kegagalan salah satu langkah membatalkan semuanya.

Saat approval, persetujuan internal mengambil isi reference policy aktif jika tersedia. Jika collection `consent_policies` belum memiliki reference policy aktif, backend memakai snapshot versi dan teks persetujuan yang ditampilkan serta diterima pada formulir registrasi. Dengan demikian, kekosongan reference data tidak memblokir keputusan Verifikator dan bukti persetujuan tetap tercatat pada `profile_consents`.

`registration_reviews` memang kosong sesudah registrasi baru. Record pertama baru muncul ketika Verifikator memberi keputusan atau pendaftar mengirim ulang klarifikasi.

## UI

- `/daftar`: formulir registrasi Awardee.
- `/pendaftaran/status`: status terbatas bagi akun pending/klarifikasi/ditolak.

Akun Awardee dengan `onboardingStatus` `PENDING`, `CLARIFICATION`, atau `REJECTED` tetap boleh
melakukan autentikasi walaupun `users.status` masih `NONAKTIF`. Sesi tersebut hanya dapat membuka
`/pendaftaran/status`; route Awardee lain tetap diblokir sampai Verifikator menyetujui pendaftaran
dan backend mengubah akun menjadi `status=AKTIF` serta `onboardingStatus=APPROVED`. Akun nonaktif
yang bukan pelamar tetap ditolak oleh guard SvelteKit API.
- `/verifikator/pendaftaran`: antrean, bukti, dan keputusan.
- `/admin/pendaftaran`: pemantauan read-only.

## Login staf dan TODO SSO

Password login Verifikator/Admin tetap tersedia selama integrasi Entra SSO belum aktif. Kartu akun demo hanya untuk lokal:

```dotenv
VITE_ENABLE_DEMO_LOGIN=1
PB_REQUIRE_STAFF_SSO=0
```

Flag pertama mengendalikan kartu UI. Selama SSO belum tersedia, password auth staf tetap aktif. Setelah provider SSO siap, ubah flag kedua menjadi `1` untuk menolak login password staf. Komentar `TODO(SSO)` menandai adapter dan UI yang akan diganti `authWithOAuth2` setelah provider, domain korporat, dan pemetaan claim disepakati.

`PB_REQUIRE_STAFF_SSO` dibaca SvelteKit API. Rahasia superuser tersedia bagi server dan script seed, tetapi tidak masuk bundle browser.

Email verification, SMTP, notifikasi email, pemulihan password, dan implementasi OAuth belum termasuk fase ini.

## Menjalankan dan memverifikasi

Jalankan PocketBase lokal tanpa hook, lalu seed akun demo lokal:

```powershell
npm run pb:serve
$env:VITE_PB_URL='http://127.0.0.1:8090'; $env:ALLOW_DEMO_SEED='1'; $env:APP_ENV='development'; npm run pb:seed
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
npm run verify:backend
```

Suite backend membuat database sementara, menjalankan migration tanpa `pb_hooks`, lalu membuktikan registrasi, login pending, pembacaan review milik sendiri, penolakan akses lintas pemilik, klarifikasi, pengiriman ulang, approval, aktivasi user, pembuatan profil, dan audit sebagai bagian dari 200 asersi lintas fitur.
