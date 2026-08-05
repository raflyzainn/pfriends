<script>
	/**
	 * Modal — dialog terpusat; sheet menempel di bawah pada mobile.
	 *
	 * Props:
	 * @prop {boolean} open
	 * @prop {string}  title
	 * @prop {'sm'|'md'|'lg'|'xl'} size
	 * @prop {boolean} closeOnBackdrop
	 * @prop {() => void} onclose  Kontrak 09 §5.
	 * @prop {() => void} onClose  Alias `onclose` (penamaan 08 §5.2).
	 * @prop {import('svelte').Snippet} footer
	 * @prop {import('svelte').Snippet} children
	 *
	 * Tiga kewajiban aksesibilitas dialog dipenuhi di sini: fokus terperangkap di
	 * dalam panel, Esc menutup, dan fokus dikembalikan ke elemen pemicu saat
	 * ditutup. Tanpa yang ketiga, pengguna keyboard terlempar ke awal halaman
	 * setiap kali menutup dialog.
	 */
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from './_visual.js';

	let {
		open = false,
		title = '',
		size = 'md',
		closeOnBackdrop = true,
		onclose = undefined,
		onClose = undefined,
		footer = undefined,
		children = undefined
	} = $props();

	const UKURAN = {
		sm: 'sm:max-w-sm',
		md: 'sm:max-w-lg',
		lg: 'sm:max-w-2xl',
		xl: 'sm:max-w-4xl'
	};

	/** @type {HTMLElement|null} */
	let panel = $state(null);

	const tutup = () => (onClose ?? onclose)?.();

	const SELEKTOR_FOKUS =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	$effect(() => {
		if (!open || !panel) return;

		const pemicu = document.activeElement;
		const wadah = panel;

		// Fokus awal jatuh ke panel agar pembaca layar mengumumkan judul dialog.
		wadah.focus();

		const sebelumnya = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		/** @param {KeyboardEvent} e */
		const padaTombol = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				tutup();
				return;
			}
			if (e.key !== 'Tab') return;

			const fokusable = Array.from(wadah.querySelectorAll(SELEKTOR_FOKUS)).filter(
				(el) => el instanceof HTMLElement && el.offsetParent !== null
			);
			if (fokusable.length === 0) return;

			const pertama = fokusable[0];
			const terakhir = fokusable[fokusable.length - 1];

			if (e.shiftKey && document.activeElement === pertama) {
				e.preventDefault();
				terakhir.focus();
			} else if (!e.shiftKey && document.activeElement === terakhir) {
				e.preventDefault();
				pertama.focus();
			}
		};

		document.addEventListener('keydown', padaTombol);

		return () => {
			document.removeEventListener('keydown', padaTombol);
			document.body.style.overflow = sebelumnya;
			if (pemicu instanceof HTMLElement) pemicu.focus();
		};
	});
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
		<!-- Latar sebagai tombol: klik menutup, tetapi tidak pernah menerima fokus tab. -->
		<button
			type="button"
			class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
			tabindex="-1"
			aria-hidden="true"
			onclick={closeOnBackdrop ? tutup : undefined}
		></button>

		<div
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-label={title || 'Dialog'}
			tabindex="-1"
			class={kelas(
				'relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-t-panel bg-surface shadow-modal outline-none sm:rounded-panel',
				UKURAN[size] ?? UKURAN.md
			)}
		>
			<div class="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
				<h2 class="text-lg font-bold">{title}</h2>
				<button
					type="button"
					class="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
					aria-label="Tutup dialog"
					onclick={tutup}
				>
					<Icon path={ICONS.x} size={20} />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if children}{@render children()}{/if}
			</div>

			{#if footer}
				<div
					class="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4"
				>
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
