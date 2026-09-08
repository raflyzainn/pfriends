<script>
	import { goto } from '$app/navigation';
	import { Button, Card, EmptyState, FilterChips, PageHeader, SearchInput, StatTile, StatusBadge, ICONS } from '$lib/components';
	import { beginAwardeeImpersonation } from '$lib/infrastructure/pocketbase/adminAwardees.js';
	import { adminAwardees } from '$lib/stores/admin-awardees.svelte.js';
	import { session } from '$lib/stores/session.svelte.js';

	let query = $state(''); let accountStatus = $state(''); let membershipStatus = $state(''); let community = $state(''); let chapter = $state(''); let page = $state(1);
	let selected = $state(null); let dialog = $state(''); let targetStatus = $state(''); let reason = $state(''); let success = $state(''); let timer;
	const accountFilters = [{ id: 'AKTIF', label: 'Akun aktif' }, { id: 'TERKUNCI', label: 'Terkunci' }, { id: 'NONAKTIF', label: 'Akun nonaktif' }];
	const membershipFilters = [{ id: 'AKTIF', label: 'Anggota aktif' }, { id: 'NONAKTIF', label: 'Keanggotaan nonaktif' }];
	const communityFilters = [{ id: 'SOBI', label: 'Sobat Bumi' }, { id: 'WOMENPRENEUR', label: 'Womenpreneur' }];
	const chapterFilters = [{ id: 'PF10', label: 'PF10' }, { id: 'PF11', label: 'PF11' }, { id: 'PF12', label: 'PF12' }];
	function load() { return adminAwardees.load({ page, query, accountStatus, membershipStatus, community, chapter }); }
	$effect(() => { query; accountStatus; membershipStatus; community; chapter; page; clearTimeout(timer); timer = setTimeout(load, query ? 350 : 0); return () => clearTimeout(timer); });
	function openStatus(item, kind) { selected = item; dialog = kind; reason = ''; targetStatus = kind === 'account' ? (item.accountStatus === 'AKTIF' ? 'TERKUNCI' : 'AKTIF') : (item.membershipStatus === 'AKTIF' ? 'NONAKTIF' : 'AKTIF'); }
	async function saveStatus() { const result = await adminAwardees.changeStatus(selected.id, dialog, targetStatus, reason); if (!result) return; success = 'Status berhasil diperbarui.'; dialog = ''; selected = null; await load(); }
	async function openHistory(item) { selected = item; dialog = 'history'; await adminAwardees.loadHistory(item.id); }
	async function impersonate(item) { adminAwardees.working = true; adminAwardees.error = ''; try { const result = await beginAwardeeImpersonation(item.id); await session.beginImpersonation(result); await goto('/awardee'); } catch (error) { adminAwardees.error = error instanceof Error ? error.message : 'Sesi Awardee gagal dibuka.'; } finally { adminAwardees.working = false; } }
	const dateTime = (value) => value ? String(value).slice(0, 16).replace('T', ' ') : 'Belum pernah';
</script>

<svelte:head><title>Kontrol Awardee · PFriends</title></svelte:head>
<PageHeader eyebrow="Konsol Corporate Secretary" title="Kontrol Awardee" subtitle="Pantau keanggotaan, kendalikan akses akun, dan buka sesi Awardee dengan jejak audit yang jelas." />
{#if adminAwardees.error}<p class="mb-5 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">{adminAwardees.error}</p>{/if}
{#if success}<p class="mb-5 rounded-control border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>{/if}

<div class="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
	<StatTile label="Total Awardee" value={adminAwardees.stats.total} hint="Seluruh penerima manfaat terdaftar" iconPath={ICONS.users} color="var(--color-pertamina-blue)" />
	<StatTile label="Akun aktif" value={adminAwardees.stats.activeAccounts} hint="Dapat masuk ke PFriends" iconPath={ICONS.checkCircle} color="var(--color-success)" />
	<StatTile label="Keanggotaan nonaktif" value={adminAwardees.stats.inactiveMemberships} hint="Tidak masuk agregat anggota aktif" iconPath={ICONS.user} color="var(--color-warning)" />
	<StatTile label="Pernah masuk" value={adminAwardees.stats.everLoggedIn} hint="Memiliki waktu masuk terakhir" iconPath={ICONS.clock} color="var(--color-pertamina-navy)" />
</div>

<Card padding="sm">
	<SearchInput bind:value={query} label="Cari Awardee" placeholder="Cari nama, surel, identitas, kota, komunitas, atau chapter" />
	<div class="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4"><FilterChips options={accountFilters} bind:selected={accountStatus} label="Status akun" /><FilterChips options={membershipFilters} bind:selected={membershipStatus} label="Status keanggotaan" /><FilterChips options={communityFilters} bind:selected={community} label="Komunitas" /><FilterChips options={chapterFilters} bind:selected={chapter} label="Chapter" /></div>
</Card>
<p class="mt-4 text-sm text-ink-500">{adminAwardees.page.totalItems} Awardee ditemukan.</p>

{#if adminAwardees.loading && adminAwardees.items.length === 0}<p class="mt-6 text-sm text-ink-500">Memuat Awardee...</p>
{:else if adminAwardees.items.length === 0}<div class="mt-6"><EmptyState title="Awardee tidak ditemukan" message="Coba longgarkan pencarian atau pilihan filter." /></div>
{:else}<div class="mt-5 grid gap-3">{#each adminAwardees.items as item (item.id)}<Card><div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><StatusBadge label={item.accountStatus === 'AKTIF' ? 'Akun aktif' : item.accountStatus === 'TERKUNCI' ? 'Akun terkunci' : 'Akun nonaktif'} color={item.accountStatus === 'AKTIF' ? 'green' : item.accountStatus === 'TERKUNCI' ? 'amber' : 'slate'} withDot /><StatusBadge label={item.membershipStatus === 'AKTIF' ? 'Anggota aktif' : 'Keanggotaan nonaktif'} color={item.membershipStatus === 'AKTIF' ? 'blue' : 'slate'} /></div><h2 class="mt-2 font-semibold text-heading">{item.name}</h2><p class="mt-1 text-sm text-ink-600">{item.email} · {item.legacyId}</p><p class="mt-1 text-xs text-ink-500">{item.community} · {item.chapterId} · {item.city || 'Kota belum diisi'} · Masuk terakhir {dateTime(item.lastLoginAt)}</p></div><div class="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="secondary" onclick={() => openHistory(item)}>Riwayat</Button><Button size="sm" variant="outline" onclick={() => openStatus(item, 'membership')}>Keanggotaan</Button><Button size="sm" variant="outline" onclick={() => openStatus(item, 'account')}>Akses akun</Button><Button size="sm" disabled={item.accountStatus !== 'AKTIF' || adminAwardees.working} onclick={() => impersonate(item)}>Masuk sebagai</Button></div></div></Card>{/each}</div>{/if}

{#if adminAwardees.page.totalPages > 1}<div class="mt-5 flex items-center justify-between"><Button variant="secondary" disabled={page <= 1} onclick={() => page--}>Sebelumnya</Button><span class="text-sm text-ink-500">Halaman {page} dari {adminAwardees.page.totalPages}</span><Button variant="secondary" disabled={page >= adminAwardees.page.totalPages} onclick={() => page++}>Berikutnya</Button></div>{/if}

{#if dialog}<div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div class="w-full max-w-lg rounded-card bg-white p-6 shadow-xl">
	{#if dialog === 'history'}<h2 class="text-xl font-semibold text-heading">Riwayat {selected.name}</h2>{#if adminAwardees.history.length === 0}<p class="mt-4 text-sm text-ink-500">Belum ada tindakan Admin.</p>{:else}<div class="mt-4 max-h-96 space-y-3 overflow-y-auto">{#each adminAwardees.history as item}<div class="rounded-control bg-ink-50 p-3"><p class="text-sm font-semibold text-ink-800">{item.action.replaceAll('_', ' ')}</p><p class="mt-1 text-xs text-ink-500">{item.actorName} · {dateTime(item.occurredAt)}</p>{#if item.reason}<p class="mt-2 text-sm text-ink-700">{item.reason}</p>{/if}</div>{/each}</div>{/if}<div class="mt-5"><Button variant="secondary" onclick={() => dialog = ''}>Tutup</Button></div>
	{:else}<h2 class="text-xl font-semibold text-heading">Ubah {dialog === 'account' ? 'akses akun' : 'status keanggotaan'}</h2><p class="mt-1 text-sm text-ink-600">{selected.name}</p><label class="mt-5 block text-sm font-semibold text-ink-700">Status tujuan<select class="mt-1 w-full rounded-control border border-ink-200 p-2 font-normal" bind:value={targetStatus}>{#if dialog === 'account'}<option value="AKTIF">Aktif</option><option value="TERKUNCI">Terkunci</option><option value="NONAKTIF">Nonaktif</option>{:else}<option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option>{/if}</select></label><label class="mt-4 block text-sm font-semibold text-ink-700">Alasan<textarea class="mt-1 w-full rounded-control border border-ink-200 p-3 font-normal" rows="4" bind:value={reason} placeholder="Jelaskan alasan perubahan status"></textarea></label><div class="mt-5 flex gap-2"><Button disabled={adminAwardees.working || reason.trim().length < 10} onclick={saveStatus}>{adminAwardees.working ? 'Menyimpan...' : 'Simpan perubahan'}</Button><Button variant="secondary" disabled={adminAwardees.working} onclick={() => dialog = ''}>Batal</Button></div>{/if}
</div></div>{/if}
