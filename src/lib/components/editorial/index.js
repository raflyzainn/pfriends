/**
 * BARREL KOMPONEN EDITORIAL — satu titik impor untuk sistem visual zona publik.
 *
 * Halaman cukup menulis:
 *   import { EditorialHero, SectionRule, StorySpread } from '$lib/components/editorial';
 *
 * `EventListPanel` sengaja TIDAK ada di sini: ia hidup di `src/lib/components/`
 * karena juga dipakai tiga zona ter-login (`/awardee`, `/verifikator`, dan panel
 * `/cerita`), sehingga menaruhnya di subdirektori "editorial" akan salah alamat.
 *
 * Pemeta `view-model.js` ikut di-reexport supaya pemanggil tidak perlu dua jalur
 * impor untuk satu daftar cerita — dan supaya hanya ada SATU implementasi
 * `eventCardVM`/`storyVM` di seluruh proyek.
 *
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak export komponen FINAL
 * @see docs/11-VISUAL-DIRECTION.md — §8 komponen visual baru
 */

export { default as EditorialHero } from './EditorialHero.svelte';
export { default as DataBand } from './DataBand.svelte';
export { default as ImpactFigure } from './ImpactFigure.svelte';
export { default as PhotoFigure } from './PhotoFigure.svelte';
export { default as StorySpread } from './StorySpread.svelte';
export { default as SectionRule } from './SectionRule.svelte';
export { default as PullQuote } from './PullQuote.svelte';
export { default as MonthCalendar } from './MonthCalendar.svelte';

export { eventCardVM, storyVM } from './view-model.js';
