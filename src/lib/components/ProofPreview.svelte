<script>
	let { files = [] } = $props();

	function isImage(name) {
		return /\.(?:jpe?g|png|webp)$/i.test(name);
	}

	function isPdf(name) {
		return /\.pdf$/i.test(name);
	}
</script>

{#if files.length === 0}
	<p class="mt-2 text-sm text-ink-500">Tidak ada bukti yang dapat ditampilkan.</p>
{:else}
	<div class="mt-3 grid gap-4">
		{#each files as file}
			<article class="overflow-hidden rounded-control border border-ink-200 bg-ink-50">
				<div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 bg-white px-3 py-2">
					<p class="min-w-0 truncate text-xs font-semibold text-ink-700" title={file.name}>{file.name}</p>
					<a class="text-xs font-semibold text-brand-700 underline" href={file.url} target="_blank" rel="noreferrer">Buka penuh</a>
				</div>
				{#if isImage(file.name)}
					<img class="max-h-[520px] w-full object-contain" src={file.url} alt={`Bukti ${file.name}`} loading="lazy" />
				{:else if isPdf(file.name)}
					<iframe class="h-[520px] w-full bg-white" src={file.url} title={`Bukti PDF ${file.name}`}></iframe>
				{:else}
					<p class="p-4 text-sm text-ink-600">Format ini tidak mendukung pratinjau langsung.</p>
				{/if}
			</article>
		{/each}
	</div>
{/if}
