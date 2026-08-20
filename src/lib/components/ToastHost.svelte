<script>
	/**
	 * ToastHost: kontainer notifikasi menumpuk.
	 *
	 * Props (seluruhnya opsional):
	 * @prop {{id:string,type?:'success'|'error'|'info'|'warning'|'points',title?:string,
	 *         message?:string,points?:number,currency?:'PK'|'KT',reason?:string,
	 *         newTotal?:number,tier?:string,sticky?:boolean}[]} toasts
	 * @prop {(id:string)=>void} ondismiss
	 * @prop {number} autoCloseMs
	 *
	 * Komponen ini SENGAJA tidak mengimpor store toast. Ia digerakkan sepenuhnya
	 * lewat props, sehingga lapisan komponen tidak pernah bergantung pada lapisan
	 * store: layout zona yang memasangkan keduanya.
	 *
	 * Perayaan sebanding dengan kelangkaan: toast poin rutin menghilang sendiri,
	 * sedangkan toast yang memuat kenaikan tier tidak pernah menutup otomatis :
	 * momen itu layak dibaca sampai selesai.
	 */
	import Icon from './Icon.svelte';
	import PointsChip from './PointsChip.svelte';
	import TierBadge from './TierBadge.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { formatAngka } from '$lib/utils/format.js';
	import { kelas } from './_visual.js';

	let { toasts = [], ondismiss = undefined, autoCloseMs = 4000 } = $props();

	const JENIS = {
		success: { ikon: ICONS.checkCircle, gaya: 'text-success', tepi: 'var(--color-success)' },
		error: { ikon: ICONS.xCircle, gaya: 'text-danger', tepi: 'var(--color-danger)' },
		warning: { ikon: ICONS.warning, gaya: 'text-warning', tepi: 'var(--color-warning)' },
		info: { ikon: ICONS.info, gaya: 'text-info', tepi: 'var(--color-info)' },
		points: { ikon: ICONS.bolt, gaya: 'text-pertamina-navy', tepi: 'var(--color-pertamina-navy)' }
	};

	/** @param {any} t */
	const menetap = (t) => Boolean(t.sticky || t.tier);

	$effect(() => {
		const timers = toasts
			.filter((t) => !menetap(t))
			.map((t) => setTimeout(() => ondismiss?.(t.id), autoCloseMs));
		return () => timers.forEach(clearTimeout);
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:top-auto sm:right-0 sm:bottom-0 sm:items-end sm:p-6"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toasts as toast (toast.id)}
		{@const cfg = JENIS[toast.type ?? 'info'] ?? JENIS.info}
		<div
			class="point-pop pointer-events-auto w-full max-w-[380px] rounded-card border border-ink-100 bg-surface p-4 shadow-toast"
			style="border-left:2px solid {cfg.tepi};"
			role={toast.type === 'error' ? 'alert' : 'status'}
		>
			<div class="flex items-start gap-3">
				<span class={kelas('mt-0.5 shrink-0', cfg.gaya)}>
					<Icon path={cfg.ikon} size={20} />
				</span>

				<div class="min-w-0 flex-1">
					{#if toast.points !== undefined && toast.points !== null}
						<p class="numeric text-2xl leading-none text-pertamina-navy">
							+{formatAngka(toast.points)}
							<span class="text-sm font-semibold">{toast.currency ?? 'PK'}</span>
						</p>
					{/if}

					{#if toast.title}
						<p class="text-sm font-semibold text-ink-800">{toast.title}</p>
					{/if}

					{#if toast.message || toast.reason}
						<p class="mt-0.5 text-[13px] leading-relaxed text-ink-600">
							{toast.message || toast.reason}
						</p>
					{/if}

					{#if toast.newTotal !== undefined && toast.newTotal !== null}
						<div class="mt-2">
							<PointsChip
								points={toast.newTotal}
								currency={toast.currency ?? 'PK'}
								size="sm"
							/>
						</div>
					{/if}

					{#if toast.tier}
						<div class="mt-2 rounded-xl bg-ink-50 p-3">
							<p class="label-micro mb-1.5">Tier baru terbuka</p>
							<TierBadge tier={toast.tier} size="md" variant="solid" />
						</div>
					{/if}
				</div>

				<button
					type="button"
					class="-mt-1 -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
					aria-label="Tutup notifikasi"
					onclick={() => ondismiss?.(toast.id)}
				>
					<Icon path={ICONS.x} size={16} />
				</button>
			</div>
		</div>
	{/each}
</div>
