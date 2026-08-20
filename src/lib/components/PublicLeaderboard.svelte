<script>
	import { tierUntukPoin } from '$lib/domain/constants/tier-table.js';
	import { formatAngka, inisial } from '$lib/utils/format.js';

	let { entries = [], loading = false, error = null } = $props();

	const rows = $derived(
		entries.map((awardee) => {
			const tier = tierUntukPoin(awardee.points);
			return {
				id: awardee.awardeeId,
				rank: awardee.rank,
				name: awardee.name,
				initials: inisial(awardee.name),
				community: awardee.community === 'WOMENPRENEUR' ? 'PFpreneur' : 'SOBI',
				chapter: awardee.chapterId,
				points: awardee.points,
				tier: tier.label,
				tint: `var(--color-${tier.tint})`,
				ink: `var(--color-${tier.ink})`
			};
		})
	);
</script>

<section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="peringkat-judul">
	<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
		<div>
			<p class="kicker">Papan peringkat</p>
			<h2 id="peringkat-judul" class="display-editorial mt-3 text-[clamp(26px,3vw,36px)] text-heading">
				Peserta paling aktif
			</h2>
		</div>
		<p class="max-w-[42ch] text-[15px] leading-[1.6] text-ink-600">
			Diurut dari poin kontribusi tertinggi berdasarkan aktivitas anggota komunitas.
		</p>
	</div>

	<div class="mt-8 overflow-hidden rounded-card border border-ink-200 bg-surface">
		{#if loading}
			<p class="px-5 py-8 text-[15px] text-ink-600">Memuat papan peringkat.</p>
		{:else if rows.length > 0}
			<ul>
				{#each rows as row (row.id)}
					<li class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-100 px-4 py-4 last:border-b-0 sm:px-6">
						<span class="figure-number inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] {row.rank <= 3 ? 'bg-accent-200 text-accent-800' : 'bg-brand-50 text-brand-700'}">
							{row.rank}
						</span>
						<span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[13px] font-bold text-brand-700" aria-hidden="true">
							{row.initials}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[15px] font-bold text-heading">{row.name}</span>
							<span class="mt-0.5 block text-[13px] text-ink-600">{row.community}, Chapter {row.chapter}</span>
						</span>
						<span class="hidden shrink-0 rounded-chip px-3 py-1 text-[12px] font-semibold sm:inline-block" style="background:{row.tint}; color:{row.ink};">
							{row.tier}
						</span>
						<span class="shrink-0 text-right">
							<span class="figure-number block text-[22px] text-brand-700">{formatAngka(row.points)}</span>
							<span class="block text-[11px] tracking-[0.06em] text-ink-500 uppercase">poin</span>
						</span>
					</li>
				{/each}
			</ul>
		{:else if error}
			<p class="px-5 py-8 text-[15px] leading-[1.6] text-ink-600">
				Papan peringkat belum tersedia. Silakan coba lagi setelah layanan kembali aktif.
			</p>
		{:else}
			<p class="px-5 py-8 text-[15px] leading-[1.6] text-ink-600">
				Belum ada perolehan poin yang dapat ditampilkan.
			</p>
		{/if}
	</div>
</section>
