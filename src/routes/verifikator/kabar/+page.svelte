<script>
	import { EmptyState, PageHeader, StatusBadge, ICONS } from '$lib/components';
	import { verifierBroadcasts } from '$lib/infrastructure/pocketbase/broadcasts.js';
	import { toast } from '$lib/stores/toast.svelte.js';
	import { formatTanggal } from '$lib/utils/format.js';
	let rows=$state.raw([]),loading=$state(true);
	$effect(()=>{verifierBroadcasts().then((value)=>rows=value).catch((error)=>toast.error('Kabar gagal dimuat',error.message)).finally(()=>loading=false)});
</script>
<svelte:head><title>Pemantauan Kabar · PFriends</title></svelte:head>
<PageHeader eyebrow="Diseminasi" title="Pemantauan Kabar" subtitle="Pantau kabar yang disusun Admin. Verifikator memeriksa bukti share publik melalui menu Bukti Keaktifan." />
{#if loading}<p class="mt-5 text-sm text-ink-600">Memuat kabar…</p>{:else if rows.length===0}<div class="mt-5"><EmptyState title="Belum ada kabar" message="Draf dan kabar yang diterbitkan Admin akan tampil di sini." iconPath={ICONS.megaphone}/></div>{:else}<div class="mt-5 space-y-3">{#each rows as row (row.id)}<article class="card p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><div class="flex flex-wrap gap-2"><StatusBadge label={row.status} color={row.status==='TERKIRIM'?'green':row.status==='TERJADWAL'?'blue':'slate'} withDot/><StatusBadge label={row.audience==='SEMUA'?'Semua Awardee':row.audience} color="slate"/></div><h2 class="mt-2 font-bold text-heading">{row.title}</h2><p class="mt-1 text-sm text-ink-600">{row.summary}</p><p class="mt-2 text-xs text-ink-600">{row.sentAt?`Terbit ${formatTanggal(row.sentAt,'waktu')}`:row.scheduledAt?`Dijadwalkan ${formatTanggal(row.scheduledAt,'waktu')}`:'Belum dijadwalkan'} · {row.recipientCount||0} penerima</p></div></div></article>{/each}</div>{/if}
