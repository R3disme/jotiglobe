<script lang="ts">
	import { onMount } from 'svelte';
	import type { Group } from './lib/scout-globe.svelte';
	import {
		loadYears,
		loadGroups,
		loadJids,
		loadContacts,
		countryName,
		countryRegion,
		wosmRegions,
		fmt,
		fmtDate,
		fmtWeekend,
		type YearInfo,
		type ContactStats
	} from './lib/data';
	import { route, setParams } from './lib/router.svelte';
	import { cn } from './lib/utils';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Search from '@lucide/svelte/icons/search';
	import Loader from '@lucide/svelte/icons/loader-circle';

	type Row = { key: string; label: string; value: number; cc?: string; href?: string; sub?: string };
	type YearData = { year: number; snapshot: string; groups: Group[]; jids: Record<string, string>; contacts: ContactStats | null };

	let years = $state<YearInfo[]>([]);
	let loadError = $state(false);
	onMount(async () => {
		try {
			years = await loadYears();
		} catch {
			loadError = true;
		}
	});

	const year = $derived.by(() => {
		const y = Number(new URLSearchParams(route.search).get('year'));
		return years.find((x) => x.year === y)?.year ?? years[0]?.year ?? null;
	});
	const yearInfo = $derived(years.find((y) => y.year === year) ?? null);
	const prevYear = $derived(years.find((y) => year != null && y.year < year)?.year ?? null);

	async function loadYear(y: number): Promise<YearData> {
		const [g, jids, contacts] = await Promise.all([loadGroups(y), loadJids(y), loadContacts(y)]);
		return { year: y, snapshot: g.snapshot, groups: g.groups, jids, contacts };
	}
	let cur = $state<YearData | null>(null);
	let prev = $state<YearData | null>(null);
	$effect(() => {
		const y = year,
			p = prevYear;
		if (y == null) return;
		let stale = false;
		Promise.all([loadYear(y), p != null ? loadYear(p) : null])
			.then(([c, pv]) => {
				if (stale) return;
				cur = c;
				prev = pv;
			})
			.catch(() => !stale && (loadError = true));
		return () => (stale = true);
	});
	const ready = $derived(cur != null && cur.year === year);

	// --- figures ------------------------------------------------------------------------------
	function summarise(d: YearData) {
		const byCc = new Map<string, number>();
		const byPlace = new Map<string, { city: string; cc: string; n: number }>();
		const byWosm = new Map<string, number>();
		const byContinent = new Map<string, number>();
		for (const g of d.groups) {
			byCc.set(g.cc, (byCc.get(g.cc) ?? 0) + 1);
			byContinent.set(countryRegion(g.cc), (byContinent.get(countryRegion(g.cc)) ?? 0) + 1);
			const r = d.jids[g.id]?.[0];
			if (r) byWosm.set(r, (byWosm.get(r) ?? 0) + 1);
			// places: only real town names (the directory also has postcodes and school names in that field)
			const city = g.city.trim();
			if (g.approx || !city || /\d/.test(city)) continue;
			const k = `${g.cc}|${city.toLowerCase()}`;
			const p = byPlace.get(k) ?? byPlace.set(k, { city, cc: g.cc, n: 0 }).get(k)!;
			p.n++;
		}
		return { total: d.groups.length, byCc, byPlace, byWosm, byContinent, withJid: [...byWosm.values()].reduce((a, b) => a + b, 0) };
	}
	const s = $derived(ready && cur ? summarise(cur) : null);
	const p = $derived(ready && prev ? summarise(prev) : null);

	const share = (n: number, total: number) => (total ? `${((n / total) * 100).toFixed(n / total < 0.01 ? 1 : 0)} %` : '');
	const delta = (now: number, before: number | undefined) => (before == null ? null : now - before);

	const tiles = $derived(
		s
			? [
					{ label: 'scout groups', value: s.total, before: p?.total },
					{ label: 'countries', value: s.byCc.size, before: p?.byCc.size },
					{ label: 'towns and cities', value: s.byPlace.size, before: p?.byPlace.size },
					{ label: 'WOSM regions', value: s.byWosm.size, before: p?.byWosm.size }
				]
			: []
	);

	const wosmRows = $derived<Row[]>(
		s
			? Object.entries(wosmRegions)
					.filter(([k]) => s.byWosm.has(k))
					.map(([k, label]) => ({ key: k, label, value: s.byWosm.get(k)!, sub: share(s.byWosm.get(k)!, s.withJid) }))
			: []
	);
	const continentRows = $derived<Row[]>(
		s
			? [...s.byContinent]
					.map(([k, v]) => ({ key: k, label: k, value: v, sub: share(v, s.total) }))
					.sort((a, b) => b.value - a.value)
			: []
	);
	const placeRows = $derived<Row[]>(
		s
			? [...s.byPlace.values()]
					.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city))
					.slice(0, 15)
					.map((x) => ({ key: `${x.cc}|${x.city}`, label: x.city, cc: x.cc, value: x.n, sub: countryName(x.cc) }))
			: []
	);

	// country table
	let countryQuery = $state('');
	let showAll = $state(false);
	let sortBy = $state<'groups' | 'name' | 'change'>('groups');
	const countryRows = $derived.by(() => {
		if (!s) return [];
		const ccs = new Set([...s.byCc.keys(), ...(p ? p.byCc.keys() : [])]);
		const rows = [...ccs].map((cc) => {
			const n = s.byCc.get(cc) ?? 0;
			return { cc, name: countryName(cc), n, change: delta(n, p ? (p.byCc.get(cc) ?? 0) : undefined) };
		});
		rows.sort((a, b) =>
			sortBy === 'name' ? a.name.localeCompare(b.name, 'en') : sortBy === 'change' ? (b.change ?? 0) - (a.change ?? 0) || b.n - a.n : b.n - a.n || a.name.localeCompare(b.name, 'en')
		);
		return rows;
	});
	const filteredCountries = $derived(countryRows.filter((c) => c.name.toLowerCase().includes(countryQuery.trim().toLowerCase())));
	const visibleCountries = $derived(showAll || countryQuery ? filteredCountries : filteredCountries.slice(0, 20));
	const maxCountry = $derived(Math.max(1, ...countryRows.map((c) => c.n)));

	// contacts (optional per year)
	const c = $derived(ready ? (cur?.contacts ?? null) : null);
	const modeLabels: Record<string, string> = { joti: 'JOTI (internet)', jota: 'JOTA (radio)', video: 'Video call', annet: 'Other' };
	const modeRows = $derived<Row[]>(
		c ? Object.entries(c.modes).map(([k, v]) => ({ key: k, label: modeLabels[k] ?? k, value: v, sub: share(v, c.entries) })).sort((a, b) => b.value - a.value) : []
	);
	const contactCountryRows = $derived<Row[]>(
		c
			? Object.entries(c.countries)
					.map(([cc, v]) => ({ key: cc, label: countryName(cc), cc, value: v }))
					.sort((a, b) => b.value - a.value)
					.slice(0, 15)
			: []
	);
	const dayRows = $derived(c ? Object.entries(c.days).sort(([a], [b]) => a.localeCompare(b)) : []);
	const maxDay = $derived(Math.max(1, ...dayRows.map(([, v]) => v)));

	const pickYear = (e: Event) => setParams({ year: (e.currentTarget as HTMLSelectElement).value === String(years[0]?.year) ? null : (e.currentTarget as HTMLSelectElement).value });
	const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '±0');
</script>

<svelte:head>
	<title>{year ? `JOTA-JOTI ${year} statistics` : 'Statistics'} – JotiGlobe</title>
</svelte:head>

{#snippet bars(rows: Row[], title: string, note = '')}
	{@const max = Math.max(1, ...rows.map((r) => r.value))}
	<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if note}<p class="text-sand/55 mt-1 text-xs">{note}</p>{/if}
		<ul class="mt-4 space-y-2.5">
			{#each rows as r (r.key)}
				<li class="text-sm" title="{r.label}: {fmt(r.value)}{r.sub ? ` (${r.sub})` : ''}">
					<div class="flex items-baseline gap-2">
						{#if r.cc}<span class="fi fi-{r.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>{/if}
						<span class="min-w-0 flex-1 truncate">{r.label}{#if r.sub}<span class="text-sand/45"> · {r.sub}</span>{/if}</span>
						<span class="font-medium tabular-nums">{fmt(r.value)}</span>
					</div>
					<div class="mt-1 h-1.5 rounded-full bg-white/[0.06]">
						<div class="bg-moss h-full rounded-full" style:width="{(r.value / max) * 100}%"></div>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/snippet}

<div class="min-h-dvh">
	<header class="bg-forest-950/85 sticky top-0 z-10 border-b border-white/10 backdrop-blur">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
			<a href={year && year !== years[0]?.year ? `/?year=${year}` : '/'} class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm"><ArrowLeft class="size-4" /> Globe</a>
			<h1 class="flex-1 text-xl font-semibold">Statistics</h1>
			<label class="flex items-center gap-2 text-sm">
				<span class="text-sand/60">Year</span>
				<select
					value={year ?? ''}
					onchange={pickYear}
					disabled={years.length < 2}
					class="focus:border-moss rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm outline-none disabled:opacity-100 [&>option]:bg-forest-900"
				>
					{#each years as y (y.year)}<option value={y.year}>{y.year}</option>{/each}
				</select>
			</label>
		</div>
	</header>

	<main class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
		{#if loadError}
			<p class="rounded-md bg-red-950/40 px-4 py-3 text-sm text-red-200">Could not load the statistics. Please reload the page.</p>
		{:else if !s || !yearInfo || !cur}
			<div class="text-sand/60 flex items-center gap-2 py-20 text-sm"><Loader class="size-4 animate-spin" /> Loading…</div>
		{:else}
			<div>
				<p class="text-sand/70 text-sm">JOTA-JOTI {fmtWeekend(yearInfo)}</p>
				<p class="text-sand/45 mt-1 text-xs">
					Groups signed up in the directory on jotajoti.info, as of {fmtDate(cur.snapshot)}{prev ? `, compared with ${prev.year}` : ''}.
				</p>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each tiles as t (t.label)}
					{@const d = delta(t.value, t.before)}
					<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<div class="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{fmt(t.value)}</div>
						<div class="text-sand/60 text-xs">{t.label}</div>
						{#if d != null}<div class={cn('mt-1 text-xs tabular-nums', d >= 0 ? 'text-moss' : 'text-red-300')}>{signed(d)} since {prev?.year}</div>{/if}
					</div>
				{/each}
			</div>

			<div class="grid gap-6 md:grid-cols-2">
				{@render bars(wosmRows, 'Groups by WOSM region', 'From the region digit of each group’s JID.')}
				{@render bars(continentRows, 'Groups by continent')}
			</div>

			<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
				<div class="flex flex-wrap items-center gap-3">
					<h2 class="flex-1 text-lg font-semibold">Countries</h2>
					<label class="relative block w-full sm:w-56">
						<Search class="text-sand/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<input bind:value={countryQuery} placeholder="Search countries" class="placeholder:text-sand/40 focus:border-moss w-full rounded-md border border-white/10 bg-white/5 py-1.5 pr-3 pl-9 text-sm outline-none" />
					</label>
				</div>
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-sand/55 text-left text-xs">
							<tr class="border-b border-white/10">
								<th class="py-2 pr-2 font-normal">
									<button type="button" onclick={() => (sortBy = 'name')} class={cn('hover:text-sand', sortBy === 'name' && 'text-sand')}>Country</button>
								</th>
								<th class="py-2 pr-2 text-right font-normal">
									<button type="button" onclick={() => (sortBy = 'groups')} class={cn('hover:text-sand', sortBy === 'groups' && 'text-sand')}>Groups</button>
								</th>
								<th class="hidden w-2/5 py-2 font-normal sm:table-cell"><span class="sr-only">Share</span></th>
								{#if p}
									<th class="py-2 pl-3 text-right font-normal">
										<button type="button" onclick={() => (sortBy = 'change')} class={cn('hover:text-sand', sortBy === 'change' && 'text-sand')}>vs {prev?.year}</button>
									</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each visibleCountries as r (r.cc)}
								<tr class="border-b border-white/5 hover:bg-white/[0.03]">
									<td class="py-1.5 pr-2">
										<a href="/?country={r.cc}" class="flex items-center gap-2 hover:underline" title="Show {r.name} on the globe">
											<span class="fi fi-{r.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
											<span class="truncate">{r.name}</span>
										</a>
									</td>
									<td class="py-1.5 pr-2 text-right tabular-nums">{fmt(r.n)}</td>
									<td class="hidden py-1.5 sm:table-cell">
										<div class="flex items-center gap-2" title="{share(r.n, s.total)} of all groups">
											<div class="h-1.5 flex-1 rounded-full bg-white/[0.06]"><div class="bg-moss h-full rounded-full" style:width="{(r.n / maxCountry) * 100}%"></div></div>
											<span class="text-sand/45 w-12 text-right text-xs tabular-nums">{share(r.n, s.total)}</span>
										</div>
									</td>
									{#if p}
										<td class={cn('py-1.5 pl-3 text-right text-xs tabular-nums', (r.change ?? 0) > 0 ? 'text-moss' : (r.change ?? 0) < 0 ? 'text-red-300' : 'text-sand/45')}>
											{signed(r.change ?? 0)}
										</td>
									{/if}
								</tr>
							{:else}
								<tr><td colspan="4" class="text-sand/50 py-6 text-center">No countries match your search.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if !countryQuery && filteredCountries.length > 20}
					<button type="button" onclick={() => (showAll = !showAll)} class="text-sand/70 hover:text-sand mt-3 text-sm underline underline-offset-4">
						{showAll ? 'Show the top 20' : `Show all ${filteredCountries.length} countries`}
					</button>
				{/if}
			</section>

			<div class="grid items-start gap-6 md:grid-cols-2">
				{@render bars(placeRows, 'Busiest towns and cities', 'Groups whose town could be placed on the map.')}
				{#if c}
					{@render bars(modeRows, 'How contacts were made', 'Log entries in JOTI-kontakter.')}
				{/if}
			</div>

			{#if c}
				<section class="space-y-6">
					<div>
						<h2 class="text-xl font-semibold">Contacts</h2>
						<p class="text-sand/55 mt-1 text-xs">
							Logged by Norwegian groups in JOTI-kontakter. Only totals per country are published, never which groups talked or what they wrote.
						</p>
					</div>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{#each [{ label: 'contacts between groups', value: c.contacts }, { label: 'log entries', value: c.entries }, { label: 'groups logging', value: c.groups_logging }, { label: 'countries reached', value: Object.keys(c.countries).length }] as t (t.label)}
							<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
								<div class="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{fmt(t.value)}</div>
								<div class="text-sand/60 text-xs">{t.label}</div>
							</div>
						{/each}
					</div>
					<div class="grid gap-6 md:grid-cols-2">
						{@render bars(contactCountryRows, 'Countries contacted', 'Contacts with a group in each country.')}
						<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
							<h2 class="text-lg font-semibold">Most common country pairs</h2>
							<ul class="mt-4 space-y-2 text-sm">
								{#each c.pairs.slice(0, 12) as [a, b, n] (a + b)}
									<li class="flex items-center gap-2">
										<span class="fi fi-{a.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
										<span class="truncate">{countryName(a)}</span>
										<span class="text-sand/40">↔</span>
										<span class="fi fi-{b.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
										<span class="min-w-0 flex-1 truncate">{countryName(b)}</span>
										<span class="font-medium tabular-nums">{fmt(n)}</span>
									</li>
								{/each}
							</ul>
						</section>
					</div>
					{#if dayRows.length}
						<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
							<h2 class="text-lg font-semibold">Log entries per day</h2>
							<div class="mt-4 flex h-40 items-end gap-2">
								{#each dayRows as [day, n] (day)}
									<div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title="{fmtDate(day)}: {fmt(n)}">
										<span class="text-xs tabular-nums">{fmt(n)}</span>
										<div class="flex min-h-0 w-full flex-1 items-end justify-center">
											<div class="bg-moss w-full max-w-16 rounded-t" style:height="{(n / maxDay) * 100}%"></div>
										</div>
										<span class="text-sand/55 text-[11px] whitespace-nowrap">{new Date(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</section>
			{/if}

			<p class="text-sand/40 pt-2 text-xs leading-relaxed">
				Not an official JOTA-JOTI site. Groups from the
				<a href="https://www.jotajoti.info/directory" target="_blank" rel="noopener noreferrer" class="hover:text-sand underline underline-offset-2">directory on jotajoti.info</a>.
				Continents from mledoze/countries (ODbL).
			</p>
		{/if}
	</main>
</div>
