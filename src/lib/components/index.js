/**
 * BARREL KOMPONEN — satu titik impor untuk seluruh komponen bersama.
 *
 * Halaman cukup menulis:
 *   import { PageHeader, Card, TierBadge } from '$lib/components';
 *
 * Berkas internal paket (`_visual.js`) sengaja TIDAK diekspor: ia pembantu
 * implementasi, bukan bagian dari kontrak lintas paket.
 *
 * Komponen editorial zona publik punya barrel-nya sendiri
 * (`$lib/components/editorial`) dan ikut di-reexport dari sini supaya halaman
 * yang memakai keduanya tidak butuh dua jalur impor. `EventListPanel` hidup di
 * direktori ini, BUKAN di `editorial/`, karena tiga dari lima pemakainya adalah
 * zona ter-login.
 *
 * @see docs/09-BUILD-CONTRACT.md — §4 WP-5, §5 kontrak komponen
 * @see docs/12-BUILD-CONTRACT-V2.md — §2.13 kontrak export komponen FINAL
 */

// ── Primitif ─────────────────────────────────────────────────────────────
export { default as Icon } from './Icon.svelte';
export { default as Button } from './Button.svelte';
export { default as Card } from './Card.svelte';
export { default as StatusBadge } from './StatusBadge.svelte';
export { default as Avatar } from './Avatar.svelte';
export { default as Skeleton } from './Skeleton.svelte';
export { default as ProgressBar } from './ProgressBar.svelte';

// ── Gamifikasi ───────────────────────────────────────────────────────────
export { default as TierBadge } from './TierBadge.svelte';
export { default as PointsChip } from './PointsChip.svelte';
export { default as TierProgress } from './TierProgress.svelte';
export { default as BadgeTile } from './BadgeTile.svelte';
export { default as LeaderboardRow } from './LeaderboardRow.svelte';
export { default as RewardCard } from './RewardCard.svelte';

// ── Kartu domain ─────────────────────────────────────────────────────────
export { default as AwardeeCard } from './AwardeeCard.svelte';
export { default as StoryCard } from './StoryCard.svelte';
export { default as EventCard } from './EventCard.svelte';
export { default as MovementCard } from './MovementCard.svelte';
export { default as KpiCard } from './KpiCard.svelte';
export { default as StatTile } from './StatTile.svelte';

// ── Masukan & data ───────────────────────────────────────────────────────
export { default as SearchInput } from './SearchInput.svelte';
export { default as FilterChips } from './FilterChips.svelte';
export { default as DataTable } from './DataTable.svelte';
export { default as Timeline } from './Timeline.svelte';
export { default as Tabs } from './Tabs.svelte';
export { default as RegistrationForm } from './RegistrationForm.svelte';
export { default as ProofPreview } from './ProofPreview.svelte';
export { default as RedemptionAdminPanel } from './RedemptionAdminPanel.svelte';
export { default as WhatsappLink } from './WhatsappLink.svelte';
export { default as DummyBadge } from './DummyBadge.svelte';
export { default as DummyRouteNotice } from './DummyRouteNotice.svelte';

// ── Umpan balik ──────────────────────────────────────────────────────────
export { default as Modal } from './Modal.svelte';
export { default as ToastHost } from './ToastHost.svelte';
export { default as EmptyState } from './EmptyState.svelte';

// ── Navigasi & kerangka ──────────────────────────────────────────────────
export { default as Header } from './Header.svelte';
export { default as Footer } from './Footer.svelte';
export { default as Sidebar } from './Sidebar.svelte';
export { default as BottomNav } from './BottomNav.svelte';
export { default as PageHeader } from './PageHeader.svelte';
export { default as ZoneGuard } from './ZoneGuard.svelte';

// ── Agenda ───────────────────────────────────────────────────────────────
// Satu komponen untuk lima tempat: /cerita, /cerita/[slug], / (E4), /awardee,
// /verifikator. Dilarang membuat kembarannya (docs/12 §2.13).
export { default as EventListPanel } from './EventListPanel.svelte';

// ── Chart ────────────────────────────────────────────────────────────────
export { default as EChart } from './EChart.svelte';

// ── Sistem visual editorial (zona publik) ────────────────────────────────
export { default as EditorialHero } from './editorial/EditorialHero.svelte';
export { default as DataBand } from './editorial/DataBand.svelte';
export { default as ImpactFigure } from './editorial/ImpactFigure.svelte';
export { default as PhotoFigure } from './editorial/PhotoFigure.svelte';
export { default as StorySpread } from './editorial/StorySpread.svelte';
export { default as SectionRule } from './editorial/SectionRule.svelte';
export { default as PullQuote } from './editorial/PullQuote.svelte';
export { default as MonthCalendar } from './editorial/MonthCalendar.svelte';

// ── Pemeta view-model lintas paket ───────────────────────────────────────
export { eventCardVM, storyVM } from './editorial/view-model.js';

// ── Manifes foto, agar halaman tidak perlu jalur impor ketiga ────────────
export { PHOTOS, foto, fotoCerita } from '$lib/data/photos.js';

// ── Registry ikon, agar halaman tidak perlu dua jalur impor ──────────────
export { ICONS, ikon } from '$lib/data/icons.js';
