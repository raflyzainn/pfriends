<script>
	import { page } from '$app/state';
	import { PageHeader, Card, StatusBadge, Button, EmptyState } from '$lib/components';
	import { aturanSkor } from '$lib/domain/constants/scoring-table.js';
	import { activitySubmissions, SUBMISSION_EVENT_META, SUBMISSION_STATUS_META, SubmissionStatus } from '$lib/stores/activity-submissions.svelte.js';
	let started = false;
	$effect(() => { if (!started && page.params.id) { started = true; void activitySubmissions.detail(page.params.id).catch(() => {}); } });
	const dateTime = (value) => String(value || '').slice(0, 16).replace('T', ' ');
</script>

<svelte:head><title>Detail Bukti Keaktifan · Awardee PFriends</title></svelte:head>
<PageHeader eyebrow="Pelacakan bukti" title={activitySubmissions.selected?.title ?? 'Memuat pengajuan…'} description="Lihat isi pengajuan, lampiran, dan perkembangan pemeriksaannya." />

{#if activitySubmissions.selected}
	{@const item = activitySubmissions.selected}
	{@const rule = aturanSkor(item.activityType)}
	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<div class="grid gap-5">
			<Card>
				<div class="flex flex-wrap items-center gap-2"><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label} color={SUBMISSION_STATUS_META[item.status]?.color} withDot /><span class="text-sm text-ink-500">{rule.label} · {rule.points} poin</span></div>
				<dl class="mt-5 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs text-ink-500">Tanggal aktivitas</dt><dd class="font-semibold">{String(item.activityDate).slice(0,10)}</dd></div><div><dt class="text-xs text-ink-500">Terakhir dikirim</dt><dd>{dateTime(item.submittedAt)}</dd></div><div><dt class="text-xs text-ink-500">Jumlah revisi</dt><dd>{item.revisionCount ?? 0}</dd></div><div><dt class="text-xs text-ink-500">Poin dibukukan</dt><dd>{item.status === SubmissionStatus.APPROVED ? `+${item.awardedPoints}` : 'Belum ada'}</dd></div></dl>
				<p class="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink-700">{item.description}</p>
				{#if item.externalUrl}<a class="mt-4 inline-block text-sm font-semibold text-info underline" href={item.externalUrl} target="_blank" rel="noreferrer">Buka tautan pendukung</a>{/if}
			</Card>
			<Card><h2 class="font-semibold text-heading">Lampiran yang dikirim</h2><div class="mt-4 grid gap-3 sm:grid-cols-2">{#each item.evidenceFiles as file}{@const url = activitySubmissions.fileUrl(item,file)}{#if /\.pdf$/i.test(file)}<a class="rounded-xl border border-ink-200 p-4 text-sm font-semibold text-info" href={url} target="_blank" rel="noreferrer">Buka PDF · {file}</a>{:else}<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Bukti ${file}`} class="aspect-video w-full rounded-xl border border-ink-200 object-cover" /></a>{/if}{/each}</div></Card>
		</div>
		<aside class="grid content-start gap-4">
			<Card><h2 class="font-semibold text-heading">Perkembangan status</h2>{#if activitySubmissions.events.length}<ol class="mt-4 grid gap-4">{#each activitySubmissions.events as event}<li class="relative border-l-2 border-ink-200 pb-1 pl-4 text-sm"><span class="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-pertamina-navy"></span><strong>{SUBMISSION_EVENT_META[event.eventType] ?? event.eventType}</strong><p class="text-xs text-ink-500">{dateTime(event.occurredAt)}{event.expand?.actor?.displayName ? ` · ${event.expand.actor.displayName}` : ''}</p>{#if event.note}<p class="mt-1 rounded-lg bg-ink-50 p-2 text-ink-700">{event.note}</p>{/if}</li>{/each}</ol>{:else}<p class="mt-3 text-sm text-ink-500">Timeline belum tersedia untuk pengajuan ini.</p>{/if}</Card>
			{#if item.status === SubmissionStatus.NEEDS_REVISION}<Card><h2 class="font-semibold text-heading">Perlu diperbaiki</h2><p class="mt-2 text-sm text-ink-600">{item.reviewNote}</p><Button class="mt-4" href="/awardee/bukti-keaktifan" variant="outline">Perbaiki pengajuan</Button></Card>{/if}
			<Button href="/awardee/bukti-keaktifan" variant="secondary">Kembali ke riwayat</Button>
		</aside>
	</div>
{:else if !activitySubmissions.loading}
	<EmptyState title="Pengajuan tidak ditemukan" message={activitySubmissions.error || 'Bukti ini tidak tersedia atau bukan milik akunmu.'} />
{/if}
