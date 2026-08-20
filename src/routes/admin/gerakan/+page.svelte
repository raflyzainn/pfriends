<script>
	import { onMount } from 'svelte'; import { listMovements } from '$lib/infrastructure/pocketbase/movements.js';
	let items = $state([]), loading = $state(true), error = $state('');
	onMount(async () => { try { items = await listMovements(); } catch (e) { error = e.message; } finally { loading = false; } });
	const running = $derived(items.filter((item) => item.status === 'BERJALAN').length); const completed = $derived(items.filter((item) => item.status === 'SELESAI').length); const reports = $derived(items.reduce((sum, item) => sum + item.approvedReportCount, 0));
</script>
<style>
	section > div.grid > div.border, section > div.overflow-x-auto.border { border-color: transparent; box-shadow: 0 1px 3px rgb(15 23 42 / 0.08); }
</style>
<svelte:head><title>Pemantauan Gerakan | PFriends</title></svelte:head>
<section class="space-y-6"><header><p class="font-semibold text-emerald-700">Pemantauan program</p><h1 class="text-3xl font-bold">Gerakan</h1><p class="mt-2 text-slate-600">Admin melihat agregat dan status. Keputusan usulan serta laporan tetap menjadi kewenangan Verifikator.</p></header>{#if error}<p class="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>{/if}<div class="grid gap-4 sm:grid-cols-3">{#each [[running,'Sedang berjalan'],[completed,'Selesai'],[reports,'Laporan disetujui']] as stat}<div class="rounded-2xl border bg-white p-5"><strong class="text-3xl">{stat[0]}</strong><p class="text-slate-600">{stat[1]}</p></div>{/each}</div>{#if loading}<p>Memuat data...</p>{:else}<div class="overflow-x-auto rounded-2xl border bg-white"><table class="w-full text-left text-sm"><thead class="bg-slate-50"><tr><th class="p-3">Gerakan</th><th class="p-3">Status</th><th class="p-3">Wilayah</th><th class="p-3">Peserta</th><th class="p-3">Laporan</th></tr></thead><tbody>{#each items as item}<tr class="border-t"><td class="p-3"><b>{item.title}</b><br><span>{item.leaderName}</span></td><td class="p-3">{item.status}</td><td class="p-3">{item.region}</td><td class="p-3">{item.participantCount}</td><td class="p-3">{item.approvedReportCount}</td></tr>{/each}</tbody></table></div>{/if}</section>
