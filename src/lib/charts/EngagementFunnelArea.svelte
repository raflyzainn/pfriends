<script>
	/**
	 * EngagementFunnelArea (C-14): dari terdaftar menjadi aktif, lalu menjadi
	 * pengamplifikasi.
	 *
	 * Props:
	 * @prop {{monthKey:string,label:string,registered:number,active:number,amplifiers:number}[]} data
	 * @prop {number} windowHari Panjang jendela "aktif" dalam hari, untuk label legenda.
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Tiga area bertumpang tindih, BUKAN bertumpuk. Ketiga deret adalah himpunan
	 * bersarang: setiap pengamplifikasi juga aktif, setiap yang aktif juga
	 * terdaftar: sehingga menumpuknya akan menjumlahkan orang yang sama sampai
	 * tiga kali. Corong yang menggelembung karena penjumlahan ganda adalah cara
	 * paling halus untuk melaporkan keterlibatan yang tidak ada.
	 *
	 * Yang perlu dibaca adalah JARAK vertikal antarpita, bukan tinggi masing-masing:
	 * di situlah terlihat berapa banyak yang berhenti pada setiap anak tangga.
	 *
	 * @see docs/10-REVISION-SPEC.md: §7.2 C-14
	 */
	import EChart from '$lib/components/EChart.svelte';
	import {
		tip,
		legend,
		grid,
		valueAxis,
		categoryAxis,
		animasi,
		angka,
		areaGradien,
		palette
	} from './_chartTheme.js';

	let { data = [], windowHari = 0, height = '320px', loading = false } = $props();

	const adaData = $derived(data.some((b) => b.registered > 0 || b.active > 0 || b.amplifiers > 0));

	const labelAktif = $derived(
		windowHari > 0 ? `Aktif ${angka(windowHari)} hari terakhir` : 'Aktif'
	);

	const option = $derived.by(() => {
		if (!adaData) return null;

		/** @type {{nama:string, warna:string, nilai:number[]}[]} */
		const lapisan = [
			{ nama: 'Terdaftar kumulatif', warna: palette.navy, nilai: data.map((b) => b.registered) },
			{ nama: labelAktif, warna: palette.blue, nilai: data.map((b) => b.active) },
			{ nama: 'Mengamplifikasi', warna: palette.green, nilai: data.map((b) => b.amplifiers) }
		];

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'line', lineStyle: { color: '#cbd5e1' } },
				valueFormatter: (nilai) => `${angka(nilai)} orang`
			},
			legend: { ...legend, show: true, type: 'scroll' },
			grid: { ...grid, top: 40 },
			xAxis: { ...categoryAxis, boundaryGap: false, data: data.map((b) => b.label) },
			yAxis: { ...valueAxis, minInterval: 1 },
			series: lapisan.map((l) => ({
				name: l.nama,
				type: 'line',
				smooth: 0.3,
				symbol: 'circle',
				symbolSize: 6,
				showSymbol: false,
				lineStyle: { color: l.warna, width: 2.5 },
				itemStyle: { color: l.warna, borderColor: '#ffffff', borderWidth: 2 },
				areaStyle: { color: areaGradien(l.warna) },
				emphasis: { focus: 'series' },
				data: l.nilai
			}))
		};
	});
</script>

<EChart
	{option}
	{height}
	{loading}
	emptyMessage="Belum ada anggota terdaftar pada rentang program. Corong keterlibatan muncul setelah pendaftaran pertama terverifikasi."
/>
