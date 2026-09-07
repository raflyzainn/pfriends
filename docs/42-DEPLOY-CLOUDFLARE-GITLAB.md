# Deploy Cloudflare Pages melalui GitLab CI/CD

Pipeline `.gitlab-ci.yml` memakai aturan berikut:

- push ke `fix/registration-forum-production` menjalankan verifikasi, build, lalu preview deployment;
- push atau merge ke `main` menjalankan verifikasi, build, lalu production deployment;
- branch lain tidak memperoleh pipeline deployment.

Build SvelteKit memakai `@sveltejs/adapter-cloudflare` dan menghasilkan `.svelte-kit/cloudflare`. Folder ini membawa aset statis serta SvelteKit server endpoints sebagai Cloudflare Pages Functions.

## 1. Buat project Cloudflare Pages

Buat satu Pages project pada akun Cloudflare. Production branch project harus bernama `main`. Catat nama project dan Account ID. Pipeline menggunakan Direct Upload melalui Wrangler, sehingga GitLab tidak perlu dihubungkan sebagai Git provider di dashboard Cloudflare.

Domain kustom dipasang dari **Workers & Pages > project > Custom domains** setelah deployment pertama berhasil.

## 2. Buat Cloudflare API token

Buat Custom API Token yang dibatasi pada akun terkait dengan izin **Cloudflare Pages: Edit**. Jangan memakai Global API Key.

## 3. Simpan variable di GitLab

Buka **Settings > CI/CD > Variables** dan buat:

| Variable | Perlindungan | Keterangan |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Masked, Hidden, Protected | API token dengan Pages Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Masked, Protected | Account ID Cloudflare |
| `CLOUDFLARE_PAGES_PROJECT` | Protected | Nama Pages project |
| `VITE_PB_URL` | Protected | `https://friend-api.pertaminafoundation.org` |

Jadikan branch `main` dan `fix/registration-forum-production` sebagai **Protected branches**. Ini diperlukan agar kedua branch dapat membaca protected variables sekaligus mencegah branch sembarang menjalankan pipeline dengan token deployment.

## 4. Simpan runtime secret di Cloudflare Pages

Credential server tidak ditanam saat build dan tidak boleh disimpan di GitLab YAML. Buka **Workers & Pages > project > Settings > Variables and Secrets**, lalu atur untuk Production dan Preview:

| Nama | Jenis | Nilai |
|---|---|---|
| `PB_URL` | Variable | `https://friend-api.pertaminafoundation.org` |
| `PB_SUPERUSER_EMAIL` | Secret | email superuser PocketBase deployment |
| `PB_SUPERUSER_PASSWORD` | Secret | kata sandi superuser PocketBase deployment |
| `PB_REQUIRE_STAFF_SSO` | Variable | `0` sampai Microsoft Entra SSO diaktifkan |

Preview yang memakai backend production dapat mengubah data production. Untuk pemisahan yang lebih aman, isi variable dan secret Preview dengan PocketBase staging ketika environment staging sudah tersedia.

## 5. Jalankan deployment

Commit dan push `.gitlab-ci.yml`, `package.json`, serta `package-lock.json`. Pipeline akan:

1. menjalankan `npm ci`;
2. menjalankan seluruh pemeriksaan melalui `npm run verify`;
3. menyimpan hasil build sebagai artifact sementara;
4. menjalankan `wrangler pages deploy` hanya bila tahap verifikasi lulus.

Branch preview memperoleh alias yang diturunkan dari nama branch, misalnya `fix-registration-forum-production.<project>.pages.dev`. Branch `main` memperbarui deployment production dan domain kustomnya.

## Checklist sebelum production

- Project Cloudflare Pages sudah dibuat dan production branch adalah `main`.
- Empat variable GitLab tersedia pada kedua protected branch.
- Runtime variable dan secret PocketBase tersedia di Cloudflare untuk Production.
- Runtime variable dan secret Preview tidak salah menunjuk production tanpa persetujuan.
- Build lokal `npm run build` lulus.
- Setelah deployment, uji login, endpoint `/api/pfriends/*`, file terlindungi, dan realtime Forum dari domain Pages.

