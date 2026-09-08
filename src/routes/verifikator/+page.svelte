<script>
	import { EmptyState, Icon, LeaderboardRow, PageHeader, StatTile, ICONS } from '$lib/components';
	import VerifAwardeePerforma from '$lib/charts/VerifAwardeePerforma.svelte';
	import VerifKpiAwardeeBar from '$lib/charts/VerifKpiAwardeeBar.svelte';
	import VerifSebaranChapter from '$lib/charts/VerifSebaranChapter.svelte';
	import { KPI_TARGETS, rasioPencapaian } from '$lib/domain/constants/kpi-targets.js';
	import { editorial } from '$lib/stores/editorial.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';
	import { verifierDashboardStore } from '$lib/stores/verifier-dashboard.svelte.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { SlaBadge, slaAntrean } from './_components/index.js';

	const PREVIEW_LIMIT = 3;
	const now = new Date();
	let dashboardLoaded = false;
	$effect(() => { if (!dashboardLoaded) { dashboardLoaded = true; void verifierDashboardStore.load(); } });

	const dashboard = $derived(verifierDashboardStore.data);
	const monthly = $derived(dashboard?.monthly ?? []);
	const totalPublished = $derived(monthly.reduce((sum, item) => sum + (item.publishedStories ?? 0), 0));
	const totalPoints = $derived(dashboard?.totalPoints ?? 0);
	const registered = $derived(dashboard?.registeredAwardees ?? 0);
	const active = $derived(dashboard?.activeAwardees ?? 0);
	const activeRate = $derived(registered > 0 ? Math.round(active / registered * 100) : 0);
	const trend = (values) => values.length > 1 && values.at(-2) > 0 ? Math.round((values.at(-1) - values.at(-2)) / values.at(-2) * 100) : 0;

	const kpiRows = $derived.by(() => {
		const actuals = new Map((dashboard?.kpis ?? []).map((item) => [item.id, item]));
		return KPI_TARGETS.map((target) => ({
			label: target.shortLabel,
			capaian: Math.min(100, Math.round(rasioPencapaian(actuals.get(target.id)?.actual ?? 0, target) * 100))
		}));
	});
	const achievedKpis = $derived(kpiRows.filter((item) => item.capaian >= 100).length);
	const keyFigures = $derived([
		{ id:'stories',label:'Cerita dampak terbit',value:totalPublished,hint:`${monthly.at(-1)?.publishedStories ?? 0} terbit pada ${monthly.at(-1)?.label ?? 'periode terakhir'}`,trend:trend(monthly.map(item=>item.publishedStories??0)),iconPath:ICONS.book,color:'var(--color-brand-600)' },
		{ id:'points',label:'Poin kontribusi Awardee',value:totalPoints,hint:'Terkumpul sepanjang periode program',trend:trend(monthly.map(item=>item.points??0)),iconPath:ICONS.coin,color:'var(--color-accent-700)' },
		{ id:'active',label:'Awardee aktif',value:active,hint:`${activeRate}% dari ${formatAngka(registered)} Awardee terdaftar`,trend:null,iconPath:ICONS.users,color:'var(--color-brand-700)' },
		{ id:'kpi',label:'KPI resmi tercapai',value:`${achievedKpis} dari ${KPI_TARGETS.length}`,hint:'Mengikuti target M-01 sampai M-05',trend:null,iconPath:ICONS.trophy,color:'var(--color-brand-600)' }
	]);

	const leaderboard = $derived((dashboard?.leaderboard ?? []).map((item) => ({ ...item, delta:null })));
	const oldestStories = $derived(editorial.storyQueue.slice(0,PREVIEW_LIMIT));
	const oldestEvents = $derived(editorial.eventQueue.slice(0,PREVIEW_LIMIT));
	const queues = $derived([
		{ id:'stories',label:'Submission Blog',description:'Naskah Awardee yang menunggu keputusan.',count:editorial.storyQueue.length,overdue:editorial.storyOverdueCount,href:'/verifikator/cerita',iconPath:ICONS.book,items:oldestStories.map(item=>({id:item.id,title:item.title,meta:item.authorName,href:`/verifikator/cerita/${item.id}`,sla:slaAntrean(item,now)})),empty:'Tidak ada naskah yang menunggu keputusan.' },
		{ id:'events',label:'Konfigurasi Calendar of Event',description:'Usulan kegiatan yang menunggu persetujuan.',count:editorial.eventQueue.length,overdue:editorial.eventOverdueCount,href:'/verifikator/kegiatan',iconPath:ICONS.calendar,items:oldestEvents.map(item=>({id:item.id,title:item.title,meta:item.typeMeta.label,href:'/verifikator/kegiatan',sla:slaAntrean(item,now)})),empty:'Tidak ada usulan kegiatan yang menunggu.' }
	]);

	const performance = $derived(dashboard?.reviewPerformance ?? { decisionsThisWeek:0,averageResponseDays:0,approvalRate:0,decisionCount:0 });
	const record = $derived(dashboard?.workRecord ?? {});
	const workCards = $derived([
		{label:'Cerita',value:record.stories??0,icon:ICONS.book},{label:'Kegiatan',value:record.events??0,icon:ICONS.calendar},{label:'Bukti keaktifan',value:record.evidence??0,icon:ICONS.checkCircle},{label:'Pendaftaran',value:record.registrations??0,icon:ICONS.users},{label:'Gerakan',value:record.movements??0,icon:ICONS.globe},{label:'Pesanan reward',value:record.redemptions??0,icon:ICONS.gift},{label:'Usulan Anda',value:record.proposals??0,icon:ICONS.plus}
	]);
	const account = $derived(session.account);
</script>

<PageHeader eyebrow="Ruang kerja verifikator" title="Performa Awardee & dampaknya" subtitle="Selamat datang, {session.displayName}. Seluruh angka performa dan rekam kerja pada layar ini dihitung dari PocketBase." />

{#if verifierDashboardStore.error || editorial.error}<p class="card mt-5 p-4 text-sm text-danger" role="alert">{verifierDashboardStore.error || editorial.error}</p>{/if}

<section class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Angka kunci performa Awardee">
	{#each keyFigures as item (item.id)}<StatTile label={item.label} value={item.value} hint={item.hint} trend={item.trend} iconPath={item.iconPath} color={item.color} />{/each}
</section>

<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<section class="card min-w-0 p-5" aria-labelledby="productivity-title">
		<h2 id="productivity-title" class="text-base font-bold text-heading">Produktivitas dan poin Awardee</h2>
		<p class="mt-1 mb-3 text-sm text-ink-600">Perbandingan Cerita yang benar-benar terbit dan poin terverifikasi sepanjang periode program.</p>
		<VerifAwardeePerforma labels={monthly.map(item=>item.label)} postingan={monthly.map(item=>item.publishedStories??0)} poin={monthly.map(item=>item.points??0)} height="300px" loading={verifierDashboardStore.loading} />
	</section>
	<section class="card min-w-0 p-5" aria-labelledby="kpi-title">
		<h2 id="kpi-title" class="text-base font-bold text-heading">Capaian KPI resmi</h2>
		<p class="mt-1 mb-3 text-sm text-ink-600">Capaian M-01 sampai M-05 dinormalisasi terhadap target resminya.</p>
		<VerifKpiAwardeeBar data={kpiRows} target={100} height="300px" loading={verifierDashboardStore.loading} />
	</section>
</div>

<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
	<section class="card min-w-0 p-5" aria-labelledby="leaderboard-title">
		<div class="flex flex-wrap items-baseline justify-between gap-2"><h2 id="leaderboard-title" class="text-base font-bold text-heading">Peserta paling aktif</h2><span class="label-micro">Diurut poin kontribusi</span></div>
		<p class="mt-1 text-sm text-ink-600">Delapan Awardee dengan perolehan poin tertinggi.</p>
		{#if leaderboard.length===0}<div class="mt-4"><EmptyState title="Papan peringkat belum terisi" message="Peringkat muncul setelah Awardee mengumpulkan poin." iconPath={ICONS.trophy} size="sm" /></div>{:else}<ul class="mt-4 border-t border-ink-100">{#each leaderboard as item (item.id)}<li><LeaderboardRow rank={item.rank} awardee={{id:item.id,name:item.name,community:item.community,chapter:item.chapter}} points={item.points} delta={item.delta} variant="full" /></li>{/each}</ul>{/if}
	</section>
	<section class="card min-w-0 p-5" aria-labelledby="chapter-title"><h2 id="chapter-title" class="text-base font-bold text-heading">Asal kontribusi</h2><p class="mt-1 mb-3 text-sm text-ink-600">Chapter dan komunitas yang menyumbang poin terverifikasi.</p><VerifSebaranChapter data={dashboard?.chapter??[]} height="230px" /></section>
</div>

<section class="mt-8" aria-labelledby="queue-title">
	<div class="flex flex-wrap items-baseline justify-between gap-3"><h2 id="queue-title" class="text-lg font-bold text-heading">Menunggu keputusan Anda</h2><p class="text-xs text-ink-600">Pekan ini <strong>{performance.decisionsThisWeek} keputusan</strong>, rata-rata tanggap <strong>{String(performance.averageResponseDays).replace('.',',')} hari kerja</strong>, tingkat persetujuan <strong>{performance.approvalRate}%</strong>.</p></div>
	<div class="mt-4 grid gap-5 sm:grid-cols-2">{#each queues as queue (queue.id)}<div class="card min-w-0 p-5"><div class="flex items-start gap-3"><span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pertamina-navy-tint text-pertamina-navy"><Icon path={queue.iconPath} size={18}/></span><div class="min-w-0 flex-1"><h3 class="font-bold text-heading">{queue.label}</h3><p class="mt-0.5 text-xs text-ink-600">{queue.description}</p></div><span class="numeric text-2xl font-bold">{queue.count}</span></div><p class="mt-3 text-xs {queue.overdue>0?'font-semibold text-pertamina-red-ink':'text-ink-600'}">{queue.overdue>0?`${queue.overdue} sudah lewat tenggat`:'Seluruhnya masih dalam tenggat'}</p>{#if queue.items.length===0}<p class="mt-3 border-t border-ink-100 pt-3 text-sm text-ink-600">{queue.empty}</p>{:else}<ul class="mt-3 border-t border-ink-100">{#each queue.items as item (item.id)}<li class="border-b border-ink-100 py-2.5 last:border-0"><a class="group block" href={item.href}><span class="block truncate text-sm font-semibold group-hover:underline">{item.title}</span><span class="mt-1 flex flex-wrap items-center gap-2"><span class="text-xs text-ink-600">{item.meta}</span><SlaBadge sla={item.sla} size="sm" /></span></a></li>{/each}</ul>{/if}<a class="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-pertamina-navy hover:underline" href={queue.href}>Buka {queue.label}<Icon path={ICONS.arrowRight} size={16}/></a></div>{/each}</div>
</section>

<section class="card mt-8 p-5" aria-labelledby="work-title">
	<h2 id="work-title" class="text-base font-bold text-heading">Profil & rekam kerja Anda</h2><p class="mt-1 text-sm text-ink-600">Tindakan yang tersimpan atas nama akun Verifikator aktif.</p>
	<div class="mt-4 flex min-w-0 items-center gap-3 border-t border-ink-100 pt-4"><span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-chip bg-pertamina-navy-tint text-sm font-bold text-pertamina-navy">{account?.initials??'PF'}</span><div class="min-w-0"><p class="truncate font-bold text-heading">{session.displayName}</p><p class="truncate text-sm text-ink-600">{account?.email??''}</p><p class="label-micro mt-0.5">{session.roleLabel}{account?.unit?` · ${account.unit}`:''}</p></div></div>
	<dl class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{#each workCards as item (item.label)}<div class="rounded-control bg-canvas p-3"><dt class="flex items-center gap-2 text-xs font-semibold text-ink-600"><Icon path={item.icon} size={15}/>{item.label}</dt><dd class="numeric mt-2 text-xl font-bold text-ink-900">{item.value}</dd></div>{/each}</dl>
	<p class="mt-4 text-xs text-ink-600">Total {performance.decisionCount} tindakan peninjauan tersimpan. Verifikator dinilai dari mutu keputusan, bukan poin atau tier pribadi.</p>
</section>
