<script>
	import DummyBadge from './DummyBadge.svelte';
	let { outerClass = '' } = $props();

	const message = 'Data demo lokal. Perubahan hanya tersimpan di browser ini.';
</script>

{#if message}
	<div class={outerClass}>
		<div class="mb-5 flex items-start gap-3 rounded-control border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" data-dummy-notice>
			<DummyBadge title={message} />
			<p>{message}</p>
		</div>
	</div>
{/if}
