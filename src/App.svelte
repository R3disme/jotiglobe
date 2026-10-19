<script lang="ts">
	import { onMount, tick } from 'svelte';
	import ScoutGlobe, { type Group } from './lib/scout-globe.svelte';
	import PrivacyNotice from './lib/PrivacyNotice.svelte';
	import { loadYears, loadGroups, loadProfiles, groupPath, fmt, fmtParticipants, countryName, countryRegion, distanceKm, fmtDate, fmtWeekend, type YearInfo } from './lib/data';
	import { route, navigate, setParams } from './lib/router.svelte';
	import { cn } from './lib/utils';
	import Search from '@lucide/svelte/icons/search';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChartBar from '@lucide/svelte/icons/chart-bar';
	import LocateFixed from '@lucide/svelte/icons/locate-fixed';
	import X from '@lucide/svelte/icons/x';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import GitFork from '@lucide/svelte/icons/git-fork';
	import List from '@lucide/svelte/icons/list';

	// --- data ---------------------------------------------------------------------------------
	let groups = $state<Group[]>([]);
	let snapshot = $state('');
	let loading = $state(true);
	let loadError = $state(false);
	let years = $state<YearInfo[]>([]);
	const year = $derived(years.find((y) => String(y.year) === new URLSearchParams(route.search).get('year')) ?? years[0] ?? null);
	onMount(async () => {
		try {
			years = await loadYears();
		} catch {
			loadError = true;
			loading = false;
		}
	});
	let participants = $state(new Map<number, number>()); // directory id → participants, when the year has profiles
	let firstLoad = true;
	$effect(() => {
		const y = year?.year;
		if (y == null) return;
		let stale = false;
		loading = true;
		loadProfiles(y).then((p) => !stale && (participants = new Map([...p].map(([id, x]) => [id, x.participants ?? 0]))));
		loadGroups(y)
			.then((d) => {
				if (stale) return;
				groups = d.groups;
				snapshot = fmtDate(d.snapshot);
				const cc = firstLoad ? new URLSearchParams(route.search).get('country')?.toUpperCase() : (selected ?? undefined);
				focused = null;
				selected = null;
				if (cc && groups.some((g) => g.cc === cc)) pickCountry(cc);
				firstLoad = false;
				loading = false;
			})
			.catch(() => {
				if (stale) return;
				loadError = true;
				loading = false;
			});
		return () => (stale = true);
	});
	const pickYear = (e: Event) => {
		const v = (e.currentTarget as HTMLSelectElement).value;
		setParams({ year: v === String(years[0]?.year) ? null : v });
	};
	const yearQuery = $derived(year && year !== years[0] ? `?year=${year.year}` : '');

	const perCountry = $derived.by(() => {
		const m = new Map<string, Group[]>();
		for (const g of groups) (m.get(g.cc) ?? m.set(g.cc, []).get(g.cc)!).push(g);
		return m;
	});
	const names = $derived(Object.fromEntries([...perCountry.keys()].map((cc) => [cc, countryName(cc)])));
	const countryList = $derived(
		[...perCountry.entries()]
			.map(([cc, gs]) => ({ cc, name: names[cc], region: countryRegion(cc), count: gs.length }))
			.sort((a, b) => a.name.localeCompare(b.name, 'en'))
	);

	// --- selection ----------------------------------------------------------------------------
	const regions = ['All', 'Europe', 'Africa', 'Asia', 'Americas', 'Oceania'];
	let region = $state('All');
	let query = $state('');
	let groupQuery = $state('');
	let selected = $state<string | null>(null);
	let focused = $state<Group | null>(null);
	let view = $state<'countries' | 'near'>('countries');
	let sheetOpen = $state(false); // mobile bottom sheet: expanded or not
	let panelOpen = $state(true); // closed = just the globe

	const countryParticipants = $derived(selected ? (perCountry.get(selected) ?? []).reduce((a, g) => a + (participants.get(g.id) ?? 0), 0) : 0);

	// picking a country on the globe brings the list back
	$effect(() => {
		if (selected) panelOpen = true;
	});

	const filteredCountries = $derived(
		countryList.filter((c) => (region === 'All' || c.region === region) && c.name.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const countryGroups = $derived(
		(selected ? (perCountry.get(selected) ?? []) : [])
			.filter((g) => (g.name + ' ' + g.city).toLowerCase().includes(groupQuery.trim().toLowerCase()))
			.sort((a, b) => a.name.localeCompare(b.name, 'en'))
	);
	$effect(() => {
		void selected;
		groupQuery = '';
	});

	const openGroup = (g: Group) => navigate(groupPath(g));
	$effect(() => {
		if (!loading) setParams({ country: selected });
	});
	function pickCountry(cc: string) {
		focused = null;
		selected = cc;
		sheetOpen = true;
	}
	function backToCountries() {
		focused = null;
		selected = null;
	}
	// a dot clicked on the globe: reveal it in the list
	$effect(() => {
		const id = focused?.id;
		if (id == null) return;
		tick().then(() => document.getElementById(`g-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
	});

	// --- location (memory only) ---------------------------------------------------------------
	let me = $state<{ lat: number; lon: number; accuracy: number } | null>(null);
	let locating = $state(false);
	let locError = $state('');
	const nearest = $derived(
		me
			? groups
					.map((g) => ({ g, km: distanceKm(me!, g) }))
					.sort((a, b) => a.km - b.km)
					.slice(0, 30)
			: []
	);

	function findMe() {
		locError = '';
		if (!('geolocation' in navigator)) {
			locError = 'Your browser does not support location.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				// Kept in this variable only – never stored or sent anywhere.
				me = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
				locating = false;
				focused = null;
				selected = null;
				view = 'near';
				sheetOpen = true;
				panelOpen = true;
			},
			(err) => {
				locating = false;
				locError =
					err.code === err.PERMISSION_DENIED
						? 'Location access was blocked. You can still browse by country.'
						: "Couldn't get your location. Try again, or browse by country.";
			},
			{ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
		);
	}
	function forgetMe() {
		me = null;
		view = 'countries';
	}

	const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-GB')} km`);

	let privacyOpen = $state(false);
	let aboutOpen = $state(false);
</script>

<svelte:head>
	<title>{selected ? `${names[selected]} – ` : ''}JotiGlobe</title>
</svelte:head>

<div class="relative h-dvh w-full overflow-hidden">
	<ScoutGlobe {groups} {names} {me} bind:selected bind:focused onopen={openGroup} class="absolute inset-0" />

	<!-- Title + stats -->
	<header class="pointer-events-none absolute top-0 left-0 z-10 max-w-[calc(100%-2rem)] p-4 sm:p-6">
		<h1 class="text-3xl leading-tight font-semibold sm:text-4xl">JotiGlobe</h1>
		<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
			<p class="text-sand/70 text-sm">Scout groups signed up for JOTA-JOTI{year ? `, ${fmtWeekend(year)}` : ''}</p>
			{#if years.length}
				<label class="pointer-events-auto">
					<span class="sr-only">Year</span>
					<select
						value={year?.year ?? ''}
						onchange={pickYear}
						class="focus:border-moss rounded-md border border-white/20 bg-black/25 px-2 py-0.5 text-sm backdrop-blur outline-none [&>option]:bg-forest-900"
					>
						{#each years as y (y.year)}<option value={y.year}>{y.year}</option>{/each}
					</select>
				</label>
			{/if}
		</div>
		<div class="mt-4 flex gap-6">
			{#if loading}
				<div class="h-10 w-52 animate-pulse rounded-md bg-white/10"></div>
			{:else if !loadError}
				<div>
					<div class="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{groups.length.toLocaleString('en-GB')}</div>
					<div class="text-sand/60 text-xs">scout groups</div>
				</div>
				<div>
					<div class="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{perCountry.size}</div>
					<div class="text-sand/60 text-xs">countries</div>
				</div>
			{/if}
		</div>
		<button
			type="button"
			onclick={findMe}
			disabled={locating || loading}
			class="bg-moss text-forest-950 pointer-events-auto mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-lg transition hover:brightness-110 disabled:opacity-60"
		>
			{#if locating}<Loader class="size-4 animate-spin" />{:else}<LocateFixed class="size-4" />{/if}
			Find groups near me
		</button>
		{#if me}
			<button type="button" onclick={forgetMe} class="text-sand/70 hover:text-sand pointer-events-auto mt-2 ml-1 block text-xs underline underline-offset-4">
				Forget my location
			</button>
		{/if}
		<a
			href="/stats{yearQuery}"
			class="text-sand pointer-events-auto mt-3 flex w-fit items-center gap-2 rounded-md border border-white/20 bg-black/25 px-3 py-2 text-sm backdrop-blur transition hover:border-white/40 hover:bg-black/40"
		>
			<ChartBar class="size-4" /> Statistics
		</a>
		<a
			href="https://github.com/R3disme/jotiglobe"
			target="_blank"
			rel="noopener noreferrer"
			class="text-sand pointer-events-auto mt-3 flex w-fit items-center gap-2 rounded-md border border-white/20 bg-black/25 px-3 py-2 text-sm backdrop-blur transition hover:border-white/40 hover:bg-black/40"
		>
			<GitFork class="size-4" /> Open source on GitHub
		</a>
		{#if locError}
			<p class="pointer-events-auto mt-2 max-w-xs rounded-md bg-black/40 px-3 py-2 text-xs text-red-200 backdrop-blur">{locError}</p>
		{/if}
	</header>

	<!-- Side panel (desktop) / bottom sheet (mobile) -->
	<aside
		class={cn(
			'bg-forest-900/92 absolute z-20 flex flex-col border-white/10 shadow-2xl backdrop-blur-md transition-transform duration-300',
			'inset-x-0 bottom-0 h-[55dvh] rounded-t-2xl border-t',
			'md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:h-auto md:w-[23rem] md:translate-y-0 md:rounded-xl md:border',
			sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]',
			!panelOpen && 'pointer-events-none translate-y-full opacity-0 md:translate-x-[calc(100%+2rem)] md:translate-y-0'
		)}
		inert={!panelOpen}
		aria-label="Countries and groups"
	>
		<div class="flex h-14 shrink-0 items-center gap-1 border-white/10 pr-2 pl-5 md:h-11 md:border-b md:pl-4">
			<button
				type="button"
				class="flex h-full flex-1 items-center justify-between gap-2 text-left md:pointer-events-none"
				onclick={() => (sheetOpen = !sheetOpen)}
				aria-expanded={sheetOpen}
			>
				<span class="font-heading font-semibold md:text-sm">
					{selected ? names[selected] : view === 'near' && me ? 'Groups near you' : 'Browse countries'}
				</span>
				<ChevronUp class={cn('size-5 transition-transform md:hidden', sheetOpen && 'rotate-180')} />
			</button>
			<button
				type="button"
				onclick={() => (panelOpen = false)}
				class="text-sand/60 hover:text-sand grid size-9 place-items-center rounded-md hover:bg-white/10"
				aria-label="Hide the list"
				title="Hide the list"
			>
				<X class="size-4" />
			</button>
		</div>

		{#if selected}
			<!-- Country detail -->
			<div class="space-y-3 border-b border-white/10 p-4">
				<button type="button" onclick={backToCountries} class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm">
					<ArrowLeft class="size-4" /> All countries
				</button>
				<div class="flex items-center gap-3">
					<span class="fi fi-{selected.toLowerCase()} !h-9 !w-12 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]"></span>
					<div>
						<h2 class="text-xl font-semibold">{names[selected]}</h2>
						<p class="text-sand/60 text-sm">
							{perCountry.get(selected)?.length ?? 0} registered groups{#if countryParticipants} · {fmt(countryParticipants)} participants{/if}
						</p>
					</div>
				</div>
				<p class="text-sand/50 text-xs">Click a group to find it on the map, then open its page for the JID and a link to jotajoti.info.</p>
				<label class="relative block">
					<Search class="text-sand/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<input bind:value={groupQuery} placeholder="Search groups or places" class="placeholder:text-sand/40 focus:border-moss w-full rounded-md border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm outline-none" />
				</label>
			</div>
			<ul class="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
				{#each countryGroups as g (g.id)}
					<li id="g-{g.id}">
						<div
							role="button"
							tabindex="0"
							onclick={() => (focused = g)}
							ondblclick={() => openGroup(g)}
							onkeydown={(e) => {
								if (e.key === 'Enter') focused?.id === g.id ? openGroup(g) : (focused = g);
								if (e.key === ' ') (e.preventDefault(), (focused = g));
							}}
							title="Double-click to open the group page"
							class={cn(
								'group/row flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 transition-colors outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-moss/60',
								focused?.id === g.id && 'bg-moss/15'
							)}
						>
							<span class="min-w-0 flex-1">
								<span class="block text-sm leading-snug font-medium">{g.name}</span>
								<span class="text-sand/55 flex items-center gap-1 text-xs">
									<MapPin class="size-3" />{g.city || 'Unknown place'}{#if participants.get(g.id)} · {fmtParticipants(participants.get(g.id)!)} participants{/if}{#if g.approx}<span class="opacity-70"> · approximate on the map</span>{/if}
								</span>
							</span>
							<a
								href={groupPath(g)}
								onclick={(e) => e.stopPropagation()}
								class={cn(
									'text-sand/45 hover:text-sand -my-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs hover:bg-white/10',
									focused?.id === g.id && 'bg-moss text-forest-950 hover:bg-moss hover:text-forest-950 font-semibold'
								)}
								aria-label="Open the page of {g.name}"
							>
								{#if focused?.id === g.id}Group page{/if}<ChevronRight class="size-4" />
							</a>
						</div>
					</li>
				{:else}
					<li class="text-sand/50 px-3 py-8 text-center text-sm">No groups match your search.</li>
				{/each}
			</ul>
		{:else}
			<!-- Tabs -->
			<div class="flex gap-1 border-b border-white/10 p-2">
				{#each [{ id: 'countries', label: 'Countries' }, { id: 'near', label: 'Near me' }] as t (t.id)}
					<button
						type="button"
						onclick={() => (t.id === 'near' && !me ? findMe() : (view = t.id as typeof view))}
						class={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === t.id ? 'bg-white/10 text-sand' : 'text-sand/60 hover:text-sand')}
					>
						{t.label}
					</button>
				{/each}
			</div>

			{#if view === 'near' && me}
				<div class="border-b border-white/10 p-4 text-xs">
					<p class="text-sand/70">
						The {nearest.length} closest groups. Your location isn't saved.
					</p>
					<button type="button" onclick={forgetMe} class="text-sand/70 hover:text-sand mt-2 inline-flex items-center gap-1 underline underline-offset-4">
						<X class="size-3" /> Forget my location
					</button>
				</div>
				<ul class="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
					{#each nearest as { g, km } (g.id)}
						<li>
							<div
								role="button"
								tabindex="0"
								onclick={() => (focused = g)}
								ondblclick={() => openGroup(g)}
								onkeydown={(e) => e.key === 'Enter' && (focused?.id === g.id ? openGroup(g) : (focused = g))}
								title="Double-click to open the group page"
								class={cn(
									'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-moss/60',
									focused?.id === g.id && 'bg-moss/15'
								)}
							>
								<span class="fi fi-{g.cc.toLowerCase()} shrink-0 rounded-[2px]"></span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-medium">{g.name}</span>
									<span class="text-sand/55 block truncate text-xs">{g.city || names[g.cc]}{g.approx ? ' · approximate' : ''}</span>
								</span>
								<span class="text-sand/60 shrink-0 text-xs tabular-nums">{fmtKm(km)}</span>
								<a
									href={groupPath(g)}
									onclick={(e) => e.stopPropagation()}
									class="text-sand/45 hover:text-sand -my-1 grid shrink-0 place-items-center rounded-md p-1 hover:bg-white/10"
									aria-label="Open the page of {g.name}"
								>
									<ChevronRight class="size-4" />
								</a>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="space-y-3 border-b border-white/10 p-4">
					<label class="relative block">
						<Search class="text-sand/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<input bind:value={query} placeholder="Search countries" class="placeholder:text-sand/40 focus:border-moss w-full rounded-md border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm outline-none" />
					</label>
					<div class="flex flex-wrap gap-1">
						{#each regions as r (r)}
							<button
								type="button"
								onclick={() => (region = r)}
								class={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors', region === r ? 'border-moss bg-moss text-forest-950 font-semibold' : 'text-sand/70 hover:text-sand border-white/15')}
							>
								{r}
							</button>
						{/each}
					</div>
				</div>
				<ul class="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
					{#if loading}
						{#each Array(10) as _, i (i)}<li class="mx-2 my-2 h-6 animate-pulse rounded bg-white/5"></li>{/each}
					{:else if loadError}
						<li class="px-3 py-8 text-center text-sm text-red-200">Could not load the group list. Please reload the page.</li>
					{:else}
						{#each filteredCountries as c (c.cc)}
							<li>
								<button type="button" onclick={() => pickCountry(c.cc)} class="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/5">
									<span class="fi fi-{c.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
									<span class="flex-1 truncate">{c.name}</span>
									<span class="text-sand/50 text-xs tabular-nums">{c.count}</span>
								</button>
							</li>
						{:else}
							<li class="text-sand/50 px-3 py-8 text-center text-sm">No countries match your search.</li>
						{/each}
					{/if}
				</ul>
			{/if}
		{/if}

		<footer class="text-sand/45 shrink-0 border-t border-white/10 px-4 py-3 text-[11px] leading-relaxed">
			Not an official JOTA-JOTI site. Groups from the
			<a href="https://www.jotajoti.info/directory" target="_blank" rel="noopener noreferrer" class="hover:text-sand underline underline-offset-2">directory on jotajoti.info</a>{snapshot ? ` (${snapshot})` : ''}.
			Locations are guessed from the town name, so some dots are a bit off.
			<button type="button" onclick={() => (privacyOpen = true)} class="hover:text-sand underline underline-offset-2">Privacy</button> ·
			<a href="/stats{yearQuery}" class="hover:text-sand underline underline-offset-2">Statistics</a> ·
			<a href="https://github.com/R3disme/jotiglobe" target="_blank" rel="noopener noreferrer" class="hover:text-sand underline underline-offset-2">Source code</a> ·
			<a href="#about" onclick={(e) => (e.preventDefault(), (aboutOpen = !aboutOpen))} class="hover:text-sand underline underline-offset-2">Credits</a>
			{#if aboutOpen}
				<span class="mt-1 block">
					Map: Natural Earth via world-atlas · Places: GeoNames (CC BY 4.0) · Countries: mledoze/countries (ODbL) · Flags: flag-icons (MIT).
					Made by 1st Sandnes Scout Group, Norway. Not affiliated with WOSM or the JOTA-JOTI organisers.
				</span>
			{/if}
		</footer>
	</aside>
	{#if !panelOpen}
		<button
			type="button"
			onclick={() => ((panelOpen = true), (sheetOpen = true))}
			class="bg-forest-900/90 text-sand absolute right-4 bottom-4 z-20 flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur hover:bg-forest-800 md:top-4 md:bottom-auto"
		>
			<List class="size-4" /> Show list
		</button>
	{/if}
</div>

<PrivacyNotice bind:open={privacyOpen} />
