/**
 * KAMUS DATA INDONESIA UNTUK SEED.
 *
 * Tanggung jawab: memasok nama orang, kampus, kota, bidang usaha, dan keahlian
 * yang wajar bagi konteks Pertamina Foundation.
 *
 * Kontrak build §6 melarang nama generik seperti "User 1". Alasannya bukan
 * estetika: mockup ini dipresentasikan ke divisi Corporate Secretary, dan direktori
 * alumni berisi "User 1 … User 60" akan langsung dibaca sebagai layar kosong yang
 * belum jadi. Nama, kampus, dan kota yang nyata membuat halaman direktori dan papan
 * peringkat dapat dinilai sebagaimana adanya nanti.
 *
 * Universitas yang terdaftar adalah mitra penerima Beasiswa Sobat Bumi yang tersebar
 * di berbagai pulau — sebaran itu memang bagian dari cerita program, sehingga daftar
 * yang hanya berisi kampus Jawa akan menghilangkan salah satu poinnya.
 *
 * @see docs/09-BUILD-CONTRACT.md — §6 Aturan seed data
 */

/**
 * Nama depan perempuan. Dipisahkan dari nama laki-laki karena komunitas
 * Womenpreneur seluruhnya perempuan — menggabungkannya akan menghasilkan daftar
 * "Womenpreneur" berisi nama laki-laki, dan itu langsung terlihat keliru.
 * @type {readonly string[]}
 */
export const NAMA_DEPAN_PEREMPUAN = Object.freeze([
	'Ayu', 'Siti', 'Dewi', 'Rani', 'Putri', 'Nurul', 'Intan', 'Maya', 'Lestari', 'Anisa',
	'Ratna', 'Fitri', 'Wulan', 'Sari', 'Indah', 'Melati', 'Cahaya', 'Kartika', 'Nadia', 'Salma',
	'Hesti', 'Yuliana', 'Rahma', 'Tiara', 'Gita', 'Larasati', 'Novita', 'Suryani', 'Zahra', 'Amelia'
]);

/**
 * Nama depan laki-laki.
 * @type {readonly string[]}
 */
export const NAMA_DEPAN_LAKI = Object.freeze([
	'Bagus', 'Andi', 'Rizky', 'Fajar', 'Hendra', 'Yoga', 'Dimas', 'Arif', 'Bayu', 'Ilham',
	'Reza', 'Aditya', 'Galih', 'Wahyu', 'Teguh', 'Panji', 'Satria', 'Iqbal', 'Rendra', 'Faisal',
	'Gilang', 'Hafiz', 'Krisna', 'Mahendra', 'Surya', 'Taufik', 'Yusuf', 'Zulfikar', 'Bimo', 'Damar'
]);

/**
 * Nama belakang / nama keluarga yang lazim di Indonesia, sengaja lintas etnis
 * (Jawa, Sunda, Batak, Minang, Bugis, Bali, Maluku, Papua) agar direktori tidak
 * terbaca sebagai komunitas satu daerah saja.
 * @type {readonly string[]}
 */
export const NAMA_BELAKANG = Object.freeze([
	'Pratama', 'Wijaya', 'Nugroho', 'Santoso', 'Hidayat', 'Kusuma', 'Permana', 'Saputra',
	'Ramadhani', 'Maulana', 'Anggraini', 'Puspitasari', 'Handayani', 'Wulandari', 'Rahmawati',
	'Sihombing', 'Simanjuntak', 'Nasution', 'Harahap', 'Situmorang',
	'Rahayu', 'Setiawan', 'Firdaus', 'Alamsyah', 'Syahputra',
	'Pangestu', 'Wardhana', 'Mahardika', 'Prasetyo', 'Kurniawan',
	'Sudarsono', 'Adiwinata', 'Sanjaya', 'Gunawan', 'Suryadi',
	'Tanjung', 'Lubis', 'Siregar', 'Manurung', 'Panjaitan',
	'Kartawijaya', 'Sasmita', 'Wibowo', 'Utami', 'Cahyani',
	'Amir', 'Latuconsina', 'Wanggai', 'Rumbiak', 'Ndoen'
]);

/**
 * Universitas mitra penerima Beasiswa Sobat Bumi.
 * @type {readonly {nama: string, kota: string}[]}
 */
export const UNIVERSITAS = Object.freeze([
	Object.freeze({ nama: 'Universitas Indonesia', kota: 'Depok' }),
	Object.freeze({ nama: 'Institut Teknologi Bandung', kota: 'Bandung' }),
	Object.freeze({ nama: 'Universitas Gadjah Mada', kota: 'Yogyakarta' }),
	Object.freeze({ nama: 'Institut Pertanian Bogor', kota: 'Bogor' }),
	Object.freeze({ nama: 'Institut Teknologi Sepuluh Nopember', kota: 'Surabaya' }),
	Object.freeze({ nama: 'Universitas Diponegoro', kota: 'Semarang' }),
	Object.freeze({ nama: 'Universitas Airlangga', kota: 'Surabaya' }),
	Object.freeze({ nama: 'Universitas Brawijaya', kota: 'Malang' }),
	Object.freeze({ nama: 'Universitas Padjadjaran', kota: 'Bandung' }),
	Object.freeze({ nama: 'Universitas Hasanuddin', kota: 'Makassar' }),
	Object.freeze({ nama: 'Universitas Sumatera Utara', kota: 'Medan' }),
	Object.freeze({ nama: 'Universitas Andalas', kota: 'Padang' }),
	Object.freeze({ nama: 'Universitas Sriwijaya', kota: 'Palembang' }),
	Object.freeze({ nama: 'Universitas Udayana', kota: 'Denpasar' }),
	Object.freeze({ nama: 'Universitas Riau', kota: 'Pekanbaru' }),
	Object.freeze({ nama: 'Universitas Lampung', kota: 'Bandar Lampung' }),
	Object.freeze({ nama: 'Universitas Mulawarman', kota: 'Samarinda' }),
	Object.freeze({ nama: 'Universitas Sam Ratulangi', kota: 'Manado' }),
	Object.freeze({ nama: 'Universitas Syiah Kuala', kota: 'Banda Aceh' }),
	Object.freeze({ nama: 'Universitas Cenderawasih', kota: 'Jayapura' }),
	Object.freeze({ nama: 'Universitas Pattimura', kota: 'Ambon' }),
	Object.freeze({ nama: 'Universitas Negeri Semarang', kota: 'Semarang' }),
	Object.freeze({ nama: 'Universitas Jenderal Soedirman', kota: 'Purwokerto' }),
	Object.freeze({ nama: 'Universitas Nusa Cendana', kota: 'Kupang' })
]);

/**
 * Kota domisili anggota, tersebar di berbagai provinsi.
 * @type {readonly {kota: string, provinsi: string}[]}
 */
export const KOTA = Object.freeze([
	Object.freeze({ kota: 'Jakarta Selatan', provinsi: 'DKI Jakarta' }),
	Object.freeze({ kota: 'Jakarta Timur', provinsi: 'DKI Jakarta' }),
	Object.freeze({ kota: 'Depok', provinsi: 'Jawa Barat' }),
	Object.freeze({ kota: 'Bandung', provinsi: 'Jawa Barat' }),
	Object.freeze({ kota: 'Bogor', provinsi: 'Jawa Barat' }),
	Object.freeze({ kota: 'Bekasi', provinsi: 'Jawa Barat' }),
	Object.freeze({ kota: 'Cirebon', provinsi: 'Jawa Barat' }),
	Object.freeze({ kota: 'Semarang', provinsi: 'Jawa Tengah' }),
	Object.freeze({ kota: 'Solo', provinsi: 'Jawa Tengah' }),
	Object.freeze({ kota: 'Purwokerto', provinsi: 'Jawa Tengah' }),
	Object.freeze({ kota: 'Yogyakarta', provinsi: 'DI Yogyakarta' }),
	Object.freeze({ kota: 'Surabaya', provinsi: 'Jawa Timur' }),
	Object.freeze({ kota: 'Malang', provinsi: 'Jawa Timur' }),
	Object.freeze({ kota: 'Gresik', provinsi: 'Jawa Timur' }),
	Object.freeze({ kota: 'Denpasar', provinsi: 'Bali' }),
	Object.freeze({ kota: 'Mataram', provinsi: 'Nusa Tenggara Barat' }),
	Object.freeze({ kota: 'Kupang', provinsi: 'Nusa Tenggara Timur' }),
	Object.freeze({ kota: 'Medan', provinsi: 'Sumatera Utara' }),
	Object.freeze({ kota: 'Padang', provinsi: 'Sumatera Barat' }),
	Object.freeze({ kota: 'Pekanbaru', provinsi: 'Riau' }),
	Object.freeze({ kota: 'Dumai', provinsi: 'Riau' }),
	Object.freeze({ kota: 'Palembang', provinsi: 'Sumatera Selatan' }),
	Object.freeze({ kota: 'Bandar Lampung', provinsi: 'Lampung' }),
	Object.freeze({ kota: 'Banda Aceh', provinsi: 'Aceh' }),
	Object.freeze({ kota: 'Jambi', provinsi: 'Jambi' }),
	Object.freeze({ kota: 'Balikpapan', provinsi: 'Kalimantan Timur' }),
	Object.freeze({ kota: 'Samarinda', provinsi: 'Kalimantan Timur' }),
	Object.freeze({ kota: 'Banjarmasin', provinsi: 'Kalimantan Selatan' }),
	Object.freeze({ kota: 'Pontianak', provinsi: 'Kalimantan Barat' }),
	Object.freeze({ kota: 'Makassar', provinsi: 'Sulawesi Selatan' }),
	Object.freeze({ kota: 'Manado', provinsi: 'Sulawesi Utara' }),
	Object.freeze({ kota: 'Palu', provinsi: 'Sulawesi Tengah' }),
	Object.freeze({ kota: 'Kendari', provinsi: 'Sulawesi Tenggara' }),
	Object.freeze({ kota: 'Ambon', provinsi: 'Maluku' }),
	Object.freeze({ kota: 'Sorong', provinsi: 'Papua Barat Daya' }),
	Object.freeze({ kota: 'Jayapura', provinsi: 'Papua' })
]);

/**
 * Bidang usaha UMKM binaan PFpreneur beserta contoh penamaan usaha dan satuan
 * produksinya. `satuan` dipakai untuk menyusun metrik dampak yang masuk akal —
 * "120 kg" untuk keripik dan "340 helai" untuk batik, bukan satuan seragam.
 * @type {readonly {sektor: string, contohNama: readonly string[], satuan: string}[]}
 */
export const BIDANG_USAHA = Object.freeze([
	Object.freeze({
		sektor: 'Kuliner olahan',
		contohNama: Object.freeze(['Dapur Rempah Nusantara', 'Keripik Bumi Lestari', 'Sambal Ranah Minang', 'Abon Ikan Samudra']),
		satuan: 'kg'
	}),
	Object.freeze({
		sektor: 'Kriya dan tenun',
		contohNama: Object.freeze(['Tenun Ikat Sumba Asri', 'Batik Pesisir Cirebon', 'Rajut Ibu Mandiri', 'Anyaman Pandan Kalimantan']),
		satuan: 'helai'
	}),
	Object.freeze({
		sektor: 'Kopi dan minuman',
		contohNama: Object.freeze(['Kopi Gayo Perempuan', 'Kopi Toraja Sipakainge', 'Teh Herbal Daun Kelor', 'Kopi Flores Bajawa']),
		satuan: 'kg'
	}),
	Object.freeze({
		sektor: 'Fesyen dan aksesori',
		contohNama: Object.freeze(['Ecoprint Rumah Daun', 'Hijab Katun Lestari', 'Tas Purun Rawa Gambut', 'Sandal Serat Pelepah']),
		satuan: 'potong'
	}),
	Object.freeze({
		sektor: 'Produk perawatan alami',
		contohNama: Object.freeze(['Sabun Minyak Jelantah Bersih', 'Lulur Rempah Jawa', 'Minyak Kelapa Murni Sulawesi', 'Balsem Serai Wangi']),
		satuan: 'botol'
	}),
	Object.freeze({
		sektor: 'Pengolahan hasil laut',
		contohNama: Object.freeze(['Rumput Laut Kupang Sejahtera', 'Kerupuk Ikan Tenggiri Bumi', 'Ikan Asap Ambon Manise']),
		satuan: 'kg'
	}),
	Object.freeze({
		sektor: 'Daur ulang dan produk hijau',
		contohNama: Object.freeze(['Bank Sampah Bumi Kita', 'Ecobrick Kreatif Bandung', 'Kompos Rumah Tangga Hijau']),
		satuan: 'unit'
	}),
	Object.freeze({
		sektor: 'Pertanian dan hortikultura',
		contohNama: Object.freeze(['Sayur Hidroponik Sobat Tani', 'Madu Hutan Kalimantan', 'Beras Organik Lereng Merapi']),
		satuan: 'kg'
	})
]);

/**
 * Bidang pekerjaan alumni Sobat Bumi. Sengaja memuat sektor energi, lingkungan,
 * pendidikan, dan teknologi — sektor yang membuat alumni relevan sebagai mentor
 * bagi UMKM binaan, sesuai peran "mitra muda/mentor" pada Hal 4.
 * @type {readonly string[]}
 */
export const PEKERJAAN_ALUMNI = Object.freeze([
	'Analis Keberlanjutan di perusahaan energi',
	'Insinyur Proses Kilang',
	'Peneliti Energi Terbarukan',
	'Guru SMA bidang Fisika',
	'Konsultan Lingkungan',
	'Data Analyst di perusahaan logistik',
	'Perancang Produk Digital',
	'Manajer Program Yayasan Lingkungan',
	'Auditor Sistem Manajemen Lingkungan',
	'Dosen Teknik Kimia',
	'Spesialis Komunikasi Korporat',
	'Wirausaha Sosial bidang Pengelolaan Sampah',
	'Agronom di perusahaan perkebunan',
	'Perencana Kota di pemerintah daerah',
	'Ahli Geologi eksplorasi panas bumi',
	'Manajer Pemasaran Digital',
	'Fasilitator Pemberdayaan Masyarakat',
	'Analis Keuangan Berkelanjutan',
	'Pengembang Perangkat Lunak',
	'Koordinator CSR perusahaan manufaktur'
]);

/**
 * Keahlian yang ditawarkan anggota untuk mentoring lintas komunitas. Daftar ini
 * dipasangkan dengan kebutuhan Womenpreneur pada `COMMUNITIES` — pemasaran, riset
 * pasar, dan keahlian digital — supaya direktori mentoring benar-benar menjawab
 * kendala yang disebut Hal 2, bukan sekadar menampilkan tagar keahlian acak.
 * @type {readonly string[]}
 */
export const KEAHLIAN = Object.freeze([
	'Pemasaran digital', 'Riset pasar', 'Fotografi produk', 'Penulisan konten',
	'Analisis data', 'Manajemen keuangan usaha', 'Desain kemasan', 'Pengelolaan media sosial',
	'Sertifikasi halal dan izin edar', 'Rantai pasok', 'Perhitungan jejak karbon',
	'Fasilitasi pelatihan', 'Pengelolaan sampah', 'Energi terbarukan', 'Literasi iklim',
	'Public speaking', 'Penyusunan proposal', 'E-commerce dan marketplace',
	'Pengembangan produk', 'Videografi pendek'
]);
