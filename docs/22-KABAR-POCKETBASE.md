# Kabar PocketBase

Fitur Kabar tidak lagi membaca seed Dexie. Collection `broadcasts` menyimpan draf, jadwal, dan kabar terkirim; `broadcast_engagements` menyimpan aksi baca, CTA, serta share WhatsApp. Data awal sengaja kosong dan dibuat Admin melalui `/admin/broadcast`.

Awardee hanya menerima kabar `TERKIRIM` yang cocok dengan komunitasnya. Klaim baca dibuka setelah 15 detik dan hanya berlaku sekali per kabar. CTA minimal 20 karakter dan sekali per kabar. Membuka `wa.me` tidak menghasilkan poin karena server tidak dapat membuktikan pesan terkirim; Awardee harus mengunggah screenshot terlindungi dan Verifikator menyetujuinya sebelum 5 poin dibukukan. Share publik memakai alur bukti yang sama dan menghasilkan 8 poin setelah disetujui.

Tombol Simpan pada konsol Admin menghasilkan `DRAF`, sehingga belum tampil untuk Awardee. Admin harus menekan Terbitkan atau mengisi jadwal. Verifikator dapat memantau seluruh status secara read-only melalui `/verifikator/kabar`, tetapi tidak memperoleh kewenangan menyunting atau menerbitkan.

Poin tidak pernah ditulis oleh browser. Endpoint PocketBase membuat ledger `ENGAGEMENT` secara transaksional untuk aksi ringan, sedangkan share publik tetap memakai ledger `EVIDENCE`. Kabar terkirim dibuat immutable agar materi yang menjadi dasar poin dan audit tidak berubah.
