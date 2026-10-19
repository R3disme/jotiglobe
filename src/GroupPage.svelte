<script lang="ts">
	import { onMount } from 'svelte';
	import ScoutGlobe, { type Group } from './lib/scout-globe.svelte';
	import { loadYears, loadGroups, loadJids, groupUrl, groupPath, countryName, distanceKm, fmtWeekend, type YearInfo } from './lib/data';
	import { navigate } from './lib/router.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import ChartBar from '@lucide/svelte/icons/chart-bar';

	let { id }: { id: number | null } = $props();

	let status = $state<'loading' | 'found' | 'missing' | 'error'>('loading');
	let group = $state<Group | null>(null);
	let groups = $state<Group[]>([]); // everyone in the year the group was last seen, for the globe and "nearby"
	let year = $state<YearInfo | null>(null);
	let jid = $state('');
	let seenIn = $state<number[]>([]);

	onMount(async () => {
		if (id == null) return void (status = 'missing');
		try {
			const years = await loadYears();
			const all = await Promise.all(years.map(async (y) => ({ y, d: await loadGroups(y.year) })));
			const hits = all.filter(({ d }) => d.groups.some((g) => g.id === id));
			if (!hits.length) return void (status = 'missing');
			const latest = hits[0]; // years are newest first
			group = latest.d.groups.find((g) => g.id === id)!;
			groups = latest.d.groups;
			year = latest.y;
			seenIn = hits.map((h) => h.y.year);
			jid = (await loadJids(latest.y.year))[id] ?? '';
			status = 'found';
			// fix up an outdated or missing name part of the URL
			if (location.pathname !== groupPath(group)) navigate(groupPath(group) + location.search, true);
		} catch {
			status = 'error';
		}
	});

	const nearby = $derived(
		group
			? groups
					.filter((g) => g.id !== group!.id && !g.approx)
					.map((g) => ({ g, km: distanceKm(group!, g) }))
					.sort((a, b) => a.km - b.km)
					.slice(0, 8)
			: []
	);
	const names = $derived(Object.fromEntries([...new Set(groups.map((g) => g.cc))].map((cc) => [cc, countryName(cc)])));
	const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-GB')} km`);

	// the globe zooms to the group and stays there
	let selected = $state<string | null>(null);
	let focused = $state<Group | null>(null);
	$effect(() => {
		if (group) {
			focused = group;
			selected = group.cc;
		}
	});

	let copied = $state(false);
	async function copyJid() {
		try {
			await navigator.clipboard.writeText(jid);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
</script>

<svelte:head>
	<title>{group ? `${group.name} – ${countryName(group.cc)}` : 'Scout group'} – JotiGlobe</title>
</svelte:head>

<div class="min-h-dvh">
	<header class="bg-forest-950/85 sticky top-0 z-10 border-b border-white/10 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
			<a href={group ? `/?country=${group.cc}` : '/'} class="text-sand/70 hover:text-sand inline-flex flex-1 items-center gap-1.5 text-sm">
				<ArrowLeft class="size-4" /> {group ? countryName(group.cc) : 'Globe'}
			</a>
			<a href="/stats" class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm"><ChartBar class="size-4" /> Statistics</a>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
		{#if status === 'loading'}
			<div class="text-sand/60 flex items-center gap-2 py-20 text-sm"><Loader class="size-4 animate-spin" /> Loading…</div>
		{:else if status === 'error'}
			<p class="rounded-md bg-red-950/40 px-4 py-3 text-sm text-red-200">Could not load the group list. Please reload the page.</p>
		{:else if status === 'missing' || !group || !year}
			<div class="py-16">
				<h1 class="text-2xl font-semibold">Group not found</h1>
				<p class="text-sand/60 mt-2 text-sm">This group isn't in any of the JOTA-JOTI years we have. It may have left the directory.</p>
				<a href="/" class="bg-moss text-forest-950 mt-5 inline-flex rounded-md px-4 py-2.5 text-sm font-semibold">Back to the globe</a>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
				<div class="space-y-5">
					<div class="flex items-start gap-4">
						<span class="fi fi-{group.cc.toLowerCase()} !h-12 !w-16 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
						<div class="min-w-0">
							<h1 class="text-2xl leading-tight font-semibold break-words sm:text-3xl">{group.name}</h1>
							<p class="text-sand/65 mt-1 flex items-center gap-1.5 text-sm">
								<MapPin class="size-4 shrink-0" />{group.city ? `${group.city}, ` : ''}{countryName(group.cc)}
							</p>
						</div>
					</div>

					<dl class="grid gap-3 sm:grid-cols-2">
						{#if jid}
							<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
								<dt class="text-sand/55 text-xs">Group JID</dt>
								<dd class="mt-1 flex items-center gap-2">
									<span class="font-heading text-xl font-semibold tracking-wide">{jid}</span>
									<button type="button" onclick={copyJid} class="text-sand/60 hover:text-sand grid size-8 place-items-center rounded-md hover:bg-white/10" aria-label="Copy the JID" title="Copy">
										{#if copied}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}
									</button>
								</dd>
							</div>
						{/if}
						<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<dt class="text-sand/55 text-xs">Signed up for JOTA-JOTI</dt>
							<dd class="mt-1 flex flex-wrap gap-1.5">
								{#each seenIn as y (y)}<a href="/stats?year={y}" class="bg-moss/15 text-sand rounded-full px-2.5 py-0.5 text-sm hover:bg-moss/25">{y}</a>{/each}
							</dd>
						</div>
					</dl>

					<a
						href={groupUrl(group.id)}
						target="_blank"
						rel="noopener noreferrer"
						class="bg-moss text-forest-950 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-lg transition hover:brightness-110"
					>
						Profile on jotajoti.info <ExternalLink class="size-4" />
					</a>
					<p class="text-sand/45 text-xs leading-relaxed">
						From the directory for JOTA-JOTI {fmtWeekend(year)}.
						{#if group.approx}The town couldn't be found, so the group is shown somewhere in {countryName(group.cc)}.{:else}The location is guessed from the town name, so it may be a bit off.{/if}
					</p>
				</div>

				<div class="relative aspect-square overflow-hidden rounded-xl border border-white/10">
					<ScoutGlobe {groups} {names} bind:selected bind:focused idleMs={2_000_000_000} controls={false} class="absolute inset-0" onopen={(g) => navigate(groupPath(g))} />
				</div>
			</div>

			{#if nearby.length}
				<section class="mt-8">
					<h2 class="text-lg font-semibold">Nearby groups</h2>
					<ul class="mt-3 grid gap-2 sm:grid-cols-2">
						{#each nearby as { g, km } (g.id)}
							<li>
								<a href={groupPath(g)} class="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2 transition-colors hover:bg-white/5">
									<span class="fi fi-{g.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-medium">{g.name}</span>
										<span class="text-sand/55 block truncate text-xs">{g.city || countryName(g.cc)}</span>
									</span>
									<span class="text-sand/60 shrink-0 text-xs tabular-nums">{fmtKm(km)}</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</main>
</div>
