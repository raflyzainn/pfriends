# PocketBase tanpa custom hook

Direktori ini sengaja tidak memuat file `*.pb.js`. Perintah `npm run pb:serve`
menunjuk ke direktori ini agar pengembangan lokal membuktikan bahwa seluruh
logika aplikasi berjalan melalui SvelteKit API.

Direktori `pocketbase/pb_hooks/` dipertahankan sebagai referensi migrasi dan
tidak boleh dipasang pada deployment backend baru.
