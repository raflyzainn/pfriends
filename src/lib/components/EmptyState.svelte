<script>
	/**
	 * EmptyState — keadaan kosong sebagai peluang aktivasi.
	 *
	 * Props (kontrak 09 §5 + turunan 08 §9.1; seluruhnya opsional):
	 * @prop {string} title
	 * @prop {string} message      Kalimat penjelas + langkah berikutnya.
	 * @prop {string} description  Alias `message`.
	 * @prop {string} icon         Path ikon.
	 * @prop {string} iconPath     Alias `icon`.
	 * @prop {string} actionLabel
	 * @prop {string} actionHref
	 * @prop {() => void} onAction
	 * @prop {'sm'|'md'|'lg'} size
	 * @prop {import('svelte').Snippet} action  Slot aksi kustom.
	 *
	 * Aturan yang dijaga di sini: judul menyatakan keadaan tanpa menyalahkan, dan
	 * penjelas selalu menyebut langkah termudah berikutnya. Pada produk
	 * bergamifikasi, layar kosong adalah kesempatan mengaktifkan — bukan sekadar
	 * pemberitahuan bahwa data nihil.
	 */
	import Icon from './Icon.svelte';
	import Button from './Button.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from './_visual.js';

	let {
		title = 'Belum ada data',
		message = '',
		description = '',
		icon = '',
		iconPath = '',
		actionLabel = '',
		actionHref = '',
		onAction = undefined,
		size = 'md',
		class: className = '',
		action = undefined
	} = $props();

	const UKURAN = {
		sm: { wadah: 'py-8', lingkaran: 'h-14 w-14', ikon: 24, judul: 'text-sm' },
		md: { wadah: 'py-12', lingkaran: 'h-[72px] w-[72px]', ikon: 40, judul: 'text-base' },
		lg: { wadah: 'py-16', lingkaran: 'h-24 w-24', ikon: 48, judul: 'text-lg' }
	};

	const cfg = $derived(UKURAN[size] ?? UKURAN.md);
	const teks = $derived(message || description);
	const jalur = $derived(icon || iconPath || ICONS.inbox);
	const adaAksi = $derived(Boolean(action || actionLabel));
</script>

<div class={kelas('text-center', cfg.wadah, className)}>
	<div
		class={kelas(
			'mx-auto inline-flex items-center justify-center rounded-full bg-ink-100 text-ink-400',
			cfg.lingkaran
		)}
	>
		<Icon path={jalur} size={cfg.ikon} strokeWidth={1.5} />
	</div>

	<p class={kelas('mt-4 font-semibold text-ink-800', cfg.judul)}>{title}</p>

	{#if teks}
		<p class="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-600">{teks}</p>
	{/if}

	{#if adaAksi}
		<div class="mt-5 flex justify-center">
			{#if action}
				{@render action()}
			{:else}
				<Button variant="secondary" size="md" href={actionHref} onclick={onAction}>
					{actionLabel}
				</Button>
			{/if}
		</div>
	{/if}
</div>
