<script>
	import { page } from '$app/state';
	import { PageHeader, Card, StatusBadge, Button, EmptyState } from '$lib/components';
	import { aturanSkor } from '$lib/domain/constants/scoring-table.js';
	import { activitySubmissions, SUBMISSION_EVENT_META, SUBMISSION_STATUS_META, SubmissionStatus } from '$lib/stores/activity-submissions.svelte.js';
	import { toast, ToastType } from '$lib/stores/toast.svelte.js';
	let note = $state(''); let started = false;
	$effect(() => { if (!started && page.params.id) { started = true; void activitySubmissions.detail(page.params.id).catch(() => {}); } });
	const dateTime = (value) => String(value || '').slice(0, 16).replace('T', ' ');
	async function beginReview() { try { await activitySubmissions.startReview(page.params.id); toast.push({ type: ToastType.SUCCESS, title: 'Pemeriksaan dimulai', message: 'Awardee kini dapat melihat status Sedang diperiksa.' }); } catch {} }
	async function decide(decision) { try { await activitySubmissions.review(page.params.id, decision, note); toast.push({ type: ToastType.SUCCESS, title: decision === 'APPROVE' ? 'Bukti disetujui' : 'Revisi diminta', message: decision === 'APPROVE' ? 'Poin telah dibukukan secara otomatis.' : 'Catatan dapat dilihat Awardee.' }); note = ''; } catch {} }
</script>

<svelte:head><title>Detail Bukti Keaktifan · Verifikator PFriends</title></svelte:head>
<PageHeader eyebrow="Verifikasi bukti" title={activitySubmissions.selected?.title ?? 'Memuat pengajuan…'} description="Periksa konteks aktivitas, lampiran, dan seluruh jejak keputusan." />

{#if activitySubmissions.selected}
	{@const item = activitySubmissions.selected}
	{@const rule = aturanSkor(item.activityType)}
	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
		<div class="grid gap-5">
			<Card><div class="flex flex-wrap items-center gap-2"><StatusBadge label={SUBMISSION_STATUS_META[item.status]?.label} color={SUBMISSION_STATUS_META[item.status]?.color} withDot /><span class="text-sm text-ink-500">{rule.label} · {rule.points} poin</span></div><dl class="mt-5 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs text-ink-500">Awardee</dt><dd class="font-semibold">{item.expand?.owner?.displayName ?? item.awardeeId}</dd></div><div><dt class="text-xs text-ink-500">Tanggal aktivitas</dt><dd>{String(item.activityDate).slice(0,10)}</dd></div><div><dt class="text-xs text-ink-500">Terakhir dikirim</dt><dd>{dateTime(item.submittedAt)}</dd></div><div><dt class="text-xs text-ink-500">Jumlah revisi</dt><dd>{item.revisionCount ?? 0}</dd></div></dl><p class="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink-700">{item.description}</p>{#if item.externalUrl}<a class="mt-4 inline-block text-sm font-semibold text-info underline" href={item.externalUrl} target="_blank" rel="noreferrer">Buka tautan pendukung</a>{/if}</Card>
			<Card><h2 class="font-semibold text-heading">Lampiran bukti</h2><div class="mt-4 grid gap-3 sm:grid-cols-2">{#each item.evidenceFiles as file}{@const url = activitySubmissions.fileUrl(item,file)}{#if /\.pdf$/i.test(file)}<a class="rounded-xl border border-ink-200 p-4 text-sm font-semibold text-info" href={url} target="_blank" rel="noreferrer">Buka PDF · {file}</a>{:else}<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Bukti ${file}`} class="aspect-video w-full rounded-xl border border-ink-200 object-cover" /></a>{/if}{/each}</div></Card>
			<Card><h2 class="font-semibold text-heading">Jejak status</h2>{#if activitySubmissions.events.length}<ol class="mt-4 grid gap-4">{#each activitySubmissions.events as event}<li class="relative border-l-2 border-ink-200 pb-1 pl-4 text-sm"><span class="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-pertamina-navy"></span><strong>{SUBMISSION_EVENT_META[event.eventType] ?? event.eventType}</strong><p class="text-xs text-ink-500">{dateTime(event.occurredAt)}{event.expand?.actor?.displayName ? ` · ${event.expand.actor.displayName}` : ''}</p>{#if event.note}<p class="mt-1 rounded-lg bg-ink-50 p-2">{event.note}</p>{/if}</li>{/each}</ol>{:else}<p class="mt-3 text-sm text-ink-500">Belum ada jejak status.</p>{/if}</Card>
		</div>
		<aside>
			<Card><h2 class="font-semibold text-heading">Keputusan</h2>
				{#if item.status === SubmissionStatus.SUBMITTED}<p class="mt-3 text-sm text-ink-600">Tandai pengajuan sebagai sedang diperiksa sebelum memberi keputusan.</p><Button class="mt-4" fullWidth loading={activitySubmissions.working} onclick={beginReview}>Mulai periksa</Button>
				{:else if item.status === SubmissionStatus.IN_REVIEW}<p class="mt-3 text-xs text-ink-500">Dimulai {dateTime(item.reviewStartedAt)} oleh {item.expand?.reviewer?.displayName ?? 'Verifikator'}. Verifikator aktif lain tetap dapat memberi keputusan.</p><label class="mt-4 grid gap-1.5 text-sm font-medium">Catatan<textarea bind:value={note} rows="5" maxlength="2000" class="rounded-xl border border-ink-200 p-3" placeholder="Wajib saat meminta revisi; opsional saat menyetujui."></textarea></label><div class="mt-4 grid gap-2"><Button loading={activitySubmissions.working} variant="success" onclick={() => decide('APPROVE')}>Setujui · +{rule.points} poin</Button><Button loading={activitySubmissions.working} variant="outline" disabled={note.trim().length < 5} onclick={() => decide('REQUEST_REVISION')}>Minta revisi</Button></div>
				{:else}<p class="mt-3 text-sm text-ink-600">Pengajuan ini tidak sedang menunggu keputusan.</p>{/if}
				{#if item.reviewNote}<p class="mt-4 rounded-lg bg-ink-50 p-3 text-sm"><strong>Catatan terakhir:</strong> {item.reviewNote}</p>{/if}
			</Card>
			{#if activitySubmissions.reviews.length}<Card className="mt-4"><h2 class="font-semibold text-heading">Riwayat review</h2><ol class="mt-3 grid gap-3">{#each activitySubmissions.reviews as review}<li class="border-l-2 border-ink-200 pl-3 text-sm"><strong>{review.decision === 'APPROVE' ? 'Disetujui' : 'Diminta revisi'}</strong><br/><span class="text-ink-500">{review.expand?.reviewer?.displayName} · {dateTime(review.decidedAt)}</span>{#if review.note}<p class="mt-1">{review.note}</p>{/if}</li>{/each}</ol></Card>{/if}
			<Button class="mt-4" href="/verifikator/bukti-keaktifan" variant="secondary" fullWidth>Kembali ke daftar</Button>
		</aside>
	</div>
{:else if !activitySubmissions.loading}
	<EmptyState title="Pengajuan tidak ditemukan" message={activitySubmissions.error || 'Pengajuan tidak tersedia.'} />
{/if}
