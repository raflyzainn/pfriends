<script>
	/**
	 * AdminSebaranChapter — sebaran anggota per chapter, dipecah per komunitas.
	 *
	 * Props:
	 * @prop {string[]} categories  Label chapter, urut seperti di konstanta domain.
	 * @prop {{name:string,data:number[],color?:string}[]} series Satu seri per komunitas.
	 * @prop {string} unit
	 * @prop {string} height
	 * @prop {boolean} loading
	 *
	 * Satu chart menjawab dua pertanyaan sekaligus — "chapter mana yang paling
	 * besar" dan "bagaimana komposisi komunitasnya" — karena keduanya selalu
	 * ditanyakan berurutan. Memisahkannya menjadi batang chapter dan donat
	 * komunitas memaksa pembaca menjumlahkan sendiri di kepala, dan jumlah itu
	 * justru isi jawabannya.
	 *
	 * Bar HORIZONTAL bertumpuk: label chapter terbaca mendatar tanpa dimiringkan,
	 * dan panjang total tiap baris langsung dapat dibandingkan. Tumpukan sah di
	 * sini karena kedua komunitas saling lepas — seorang anggota hanya berada di
	 * satu komunitas, sehingga tidak ada orang yang terhitung dua kali.
	 *
	 * Tanpa data, `option` bernilai `null` — bukan batang bernilai nol (CH-4).
	 */
	import EChart from '$lib/components/EChart.svelte';
	import { tip, legend, grid, valueAxis, categoryAxis, animasi, angka, series as paletSeri } from './_chartTheme.js';

	let { categories = [], series = [], unit = 'anggota', height = '260px', loading = false } = $props();

	/** Bar horizontal ECharts menggambar dari bawah; kategori dibalik agar yang pertama di atas. */
	const kategoriUrut = $derived([...categories].reverse());

	const adaData = $derived(series.some((s) => s.data.some((n) => n > 0)));

	const option = $derived.by(() => {
		if (!adaData) return null;

		return {
			...animasi,
			tooltip: {
				...tip,
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				valueFormatter: (n) => `${angka(n)} ${unit}`
			},
			legend: { ...legend, show: series.length > 1, top: 0 },
			grid: { ...grid, top: series.length > 1 ? 36 : 16 },
			xAxis: { ...valueAxis },
			yAxis: { ...categoryAxis, axisLine: { show: false }, data: kategoriUrut },
			series: series.map((seri, index) => ({
				name: seri.name,
				type: 'bar',
				stack: 'anggota',
				barMaxWidth: 26,
				itemStyle: { color: seri.color ?? paletSeri[index % paletSeri.length] },
				emphasis: { focus: 'series' },
				data: [...seri.data].reverse()
			}))
		};
	});
</script>

<EChart
	{option}
	{height}
	{loading}
	emptyMessage="Belum ada anggota terdata pada chapter mana pun."
/>
