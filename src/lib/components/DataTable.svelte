<script>
	/**
	 * DataTable — tabel data dengan pengurutan, kerangka pemuatan, dan keadaan kosong.
	 *
	 * Props:
	 * @prop {{key:string,label:string,align?:'left'|'right'|'center',width?:string,
	 *         sortable?:boolean,numeric?:boolean}[]} columns
	 * @prop {any[]} rows
	 * @prop {string} empty          Pesan kosong (kontrak 09 §5).
	 * @prop {string} emptyMessage   Alias `empty` (penamaan 08 §5.2).
	 * @prop {string} sortKey        Dapat di-`bind`.
	 * @prop {'asc'|'desc'} sortDir  Dapat di-`bind`.
	 * @prop {boolean} loading
	 * @prop {(row:any)=>void} onRowClick
	 * @prop {string} caption        Ringkasan tabel untuk pembaca layar.
	 * @prop {import('svelte').Snippet<[any, any]>} cell  Perender sel kustom.
	 *
	 * Tabel membawa penggulung horizontalnya sendiri. Yang boleh bergulir ke
	 * samping di lebar 375px hanyalah tabel — halamannya tidak pernah.
	 */
	import EmptyState from './EmptyState.svelte';
	import Skeleton from './Skeleton.svelte';
	import Icon from './Icon.svelte';
	import { ICONS } from '$lib/data/icons.js';
	import { kelas } from './_visual.js';

	let {
		columns = [],
		rows = [],
		empty = '',
		emptyMessage = 'Belum ada data',
		sortKey = $bindable(''),
		sortDir = $bindable('asc'),
		loading = false,
		onRowClick = undefined,
		caption = '',
		cell = undefined
	} = $props();

	const BARIS_KERANGKA = 5;

	const pesanKosong = $derived(empty || emptyMessage);

	/** @param {{key:string, sortable?:boolean}} kolom */
	function urutkan(kolom) {
		if (!kolom.sortable) return;
		if (sortKey === kolom.key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
			return;
		}
		sortKey = kolom.key;
		sortDir = 'asc';
	}

	/** @param {{align?:string, numeric?:boolean}} kolom */
	const perataan = (kolom) => {
		const arah = kolom.align ?? (kolom.numeric ? 'right' : 'left');
		return arah === 'right' ? 'text-right' : arah === 'center' ? 'text-center' : 'text-left';
	};
</script>

<div class="overflow-hidden rounded-card border border-ink-100 bg-surface shadow-card">
	<div class="overflow-x-auto" aria-busy={loading}>
		<table class="w-full min-w-max border-collapse text-left">
			{#if caption}<caption class="sr-only">{caption}</caption>{/if}

			<thead>
				<tr class="bg-ink-50">
					{#each columns as kolom (kolom.key)}
						<th
							scope="col"
							class={kelas('label-micro px-4 py-3 whitespace-nowrap', perataan(kolom))}
							style={kolom.width ? `width:${kolom.width};` : ''}
							aria-sort={sortKey === kolom.key
								? sortDir === 'asc'
									? 'ascending'
									: 'descending'
								: kolom.sortable
									? 'none'
									: undefined}
						>
							{#if kolom.sortable}
								<button
									type="button"
									class="inline-flex items-center gap-1 transition-colors hover:text-ink-800"
									onclick={() => urutkan(kolom)}
								>
									{kolom.label}
									{#if sortKey === kolom.key}
										<Icon path={sortDir === 'asc' ? ICONS.arrowUp : ICONS.arrowDown} size={12} />
									{/if}
								</button>
							{:else}
								{kolom.label}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#if loading}
					{#each Array.from({ length: BARIS_KERANGKA }, (_, i) => i) as index (index)}
						<tr class="border-b border-ink-100">
							{#each columns as kolom (kolom.key)}
								<td class="px-4 py-3">
									<Skeleton variant="text" lines={1} />
								</td>
							{/each}
						</tr>
					{/each}
				{:else if rows.length === 0}
					<tr>
						<td colspan={Math.max(1, columns.length)} class="px-4">
							<EmptyState title={pesanKosong} size="sm" iconPath={ICONS.inbox} />
						</td>
					</tr>
				{:else}
					{#each rows as baris, indexBaris (baris.id ?? indexBaris)}
						<tr
							class={kelas(
								'border-b border-ink-100 transition-colors last:border-b-0',
								onRowClick ? 'cursor-pointer hover:bg-ink-50' : 'hover:bg-ink-50'
							)}
							onclick={onRowClick ? () => onRowClick(baris) : undefined}
						>
							{#each columns as kolom (kolom.key)}
								<td
									class={kelas(
										'h-12 px-4 py-2.5 text-sm text-ink-700',
										perataan(kolom),
										kolom.numeric && 'numeric font-normal tabular-nums'
									)}
								>
									{#if cell}
										{@render cell(baris, kolom)}
									{:else}
										{baris[kolom.key] ?? '—'}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
