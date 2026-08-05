<script>
	/**
	 * GatePanel — satu gerbang keputusan, berdiri sendiri.
	 *
	 * @prop {string} kicker       Penanda urutan gerbang, mis. 'Gerbang 1 dari 3'.
	 * @prop {string} title        Nama gerbang.
	 * @prop {string} sumber       Rumusan sumber Hal 12 atau docs/04; kosong bila tidak ada.
	 * @prop {import('./gates.js').GateResult|null} gate  `null` = belum dapat dinilai.
	 * @prop {string} unavailableMessage  Kalimat ketika `gate === null`.
	 * @prop {import('svelte').Snippet} [children]  Kendali tambahan, mis. daftar centang manual.
	 *
	 * Empat keputusan yang tidak terbaca dari kode:
	 *
	 * 1. **Satu panel = satu gerbang.** Komponen ini sengaja tidak menerima dua
	 *    daftar `checks` sekaligus dan tidak menyediakan nilai gabungan. Ketiga
	 *    gerbang bersifat konjungtif, dan angka gabungan membuat kegagalan satu
	 *    syarat dapat ditutupi kelulusan syarat lain (`docs/12` §3.5 WP-06 butir 5).
	 * 2. **Cacah ditampilkan sebagai "n dari m", bukan persentase.** Persentase
	 *    mengundang pembacaan "hampir lolos"; pada gerbang konjungtif, empat dari
	 *    lima syarat sama artinya dengan tidak lolos.
	 * 3. **`hint` syarat yang belum terpenuhi selalu ikut tampil.** Penolakan tanpa
	 *    langkah berikutnya hanya memindahkan pertanyaan ke luar sistem — dan
	 *    verifikator akan menanyakannya lewat kanal yang tidak tercatat.
	 * 4. **Keadaan "belum dapat dinilai" dibedakan dari "tidak lolos".** Naskah yang
	 *    penulisnya tidak ditemukan di katalog bukan naskah yang gagal; menyamakan
	 *    keduanya akan menutup kekeliruan data sebagai keputusan kebijakan.
	 */
	import { Icon, ICONS } from '$lib/components';

	/**
	 * @type {{
	 *   kicker?: string,
	 *   title: string,
	 *   sumber?: string,
	 *   gate: import('./gates.js').GateResult|null,
	 *   unavailableMessage?: string,
	 *   children?: import('svelte').Snippet
	 * }}
	 */
	let {
		kicker = '',
		title,
		sumber = '',
		gate,
		unavailableMessage = 'Gerbang ini belum dapat dinilai dari data yang tersedia.',
		children
	} = $props();
</script>

<section class="card p-5">
	<header class="mb-4">
		{#if kicker !== ''}
			<p class="kicker">{kicker}</p>
		{/if}
		<h3 class="mt-1 text-base font-bold text-heading">{title}</h3>
		{#if sumber !== ''}
			<p class="mt-1 text-xs leading-relaxed text-ink-600">Rumusan sumber: {sumber}</p>
		{/if}

		{#if gate}
			<p
				class="mt-3 inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-bold {gate.ready
					? 'bg-success-tint text-success'
					: 'bg-warning-tint text-warning'}"
			>
				<Icon path={gate.ready ? ICONS.checkCircle : ICONS.warning} size={14} />
				<span class="numeric">{gate.passedCount} dari {gate.totalCount} syarat terpenuhi</span>
			</p>
		{/if}
	</header>

	{#if !gate}
		<p class="text-sm leading-relaxed text-ink-600">{unavailableMessage}</p>
	{:else}
		<ul class="space-y-2.5">
			{#each gate.checks as check (check.key)}
				<li class="flex items-start gap-2.5">
					<span
						class="mt-0.5 shrink-0 {check.passed ? 'text-success' : 'text-ink-400'}"
						aria-hidden="true"
					>
						<Icon path={check.passed ? ICONS.checkCircle : ICONS.xCircle} size={16} />
					</span>
					<span class="min-w-0">
						<span class="block text-sm leading-snug font-medium text-ink-800">
							{check.label}
							<span class="sr-only">{check.passed ? '— terpenuhi' : '— belum terpenuhi'}</span>
						</span>
						{#if check.labelSumber}
							<span class="block text-xs text-ink-500">{check.labelSumber}</span>
						{/if}
						{#if !check.passed && check.hint}
							<span class="mt-0.5 block text-xs leading-relaxed text-ink-600">{check.hint}</span>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if children}
		<div class="mt-4 border-t border-ink-100 pt-4">
			{@render children()}
		</div>
	{/if}
</section>
