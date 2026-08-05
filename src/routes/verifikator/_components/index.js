/**
 * BARREL KOMPONEN LOKAL ZONA VERIFIKATOR.
 *
 * Berkas ini melayani ENAM halaman `/verifikator/**` saja. Ia sengaja TIDAK
 * di-reexport dari `$lib/components`: komponen di dalamnya mengenal registri
 * keputusan editorial dan checklist data sensitif — pengetahuan yang hanya berlaku
 * di ruang kerja verifikator, dan yang bila dibagikan ke barrel bersama akan
 * mengundang zona lain merender tombol keputusan tanpa penjagaan zonanya.
 *
 * Pola `_components/` di dalam folder route mengikuti KP-5 `docs/12` §1.1:
 * SvelteKit mengabaikan berkas non-`+page`/`+layout`, sehingga direktori ini tidak
 * pernah menjadi route.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §1.1 KP-5, §3.5 WP-06
 */

export { default as SlaBadge } from './SlaBadge.svelte';
export { default as QueueRow } from './QueueRow.svelte';
export { default as DecisionBar } from './DecisionBar.svelte';
export { default as DecisionDialog } from './DecisionDialog.svelte';
export { default as GatePanel } from './GatePanel.svelte';
export { default as SensitivityGate } from './SensitivityGate.svelte';

export {
	DecisionInput,
	EVENT_DECISIONS,
	STORY_DECISIONS,
	ARCHIVE_REASON_LABEL,
	PESAN_CATATAN_WAJIB,
	PESAN_KONFLIK_CERITA,
	PESAN_KONFLIK_KEGIATAN,
	keputusanCerita,
	keputusanKegiatan,
	periksaMasukan
} from './decisions.js';

export { ANTREAN_SLA, nomorAntrean, slaAntrean, usiaAntreanTeks } from './queue.js';

export {
	antreanBuktiBelumLengkap,
	gerbangBuktiEsg,
	gerbangDataSensitif,
	gerbangFiturPublik
} from './gates.js';

export {
	BUTIR_BLOKIR,
	SENSITIVITY_GROUPS,
	SENSITIVITY_ITEMS,
	TOTAL_BUTIR_SENSITIF
} from './sensitivity-checklist.js';
