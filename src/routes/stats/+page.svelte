<script lang="ts">
	import { onMount } from 'svelte';
	import type { Group } from '#lib/scout-globe.svelte';
	import WorldMap from '#lib/WorldMap.svelte';
	import Seo from '#lib/Seo.svelte';
	import {
		loadYears,
		loadGroups,
		loadProfiles,
		countryName,
		countryRegion,
		groupPath,
		wosmRegions,
		fmt,
		fmtParticipants,
		fmtSum,
		fmtDate,
		fmtWeekend,
		type YearInfo,
		type Profile
	} from '#lib/data.ts';
	import { route, setParams } from '#lib/router.svelte.ts';
	import { cn } from '#lib/utils.ts';

	let { data } = $props();
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Search from '@lucide/svelte/icons/search';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import Maximize from '@lucide/svelte/icons/maximize-2';
	import X from '@lucide/svelte/icons/x';

	type Row = { key: string; label: string; value: number; capped?: boolean; approx?: boolean; cc?: string; href?: string; sub?: string };
	type YearData = { year: number; snapshot: string; groups: Group[]; profiles: Map<number, Profile> };
	type Metric = 'groups' | 'participants';

	let years = $state<YearInfo[]>([]);
	let loadError = $state(false);
	onMount(async () => {
		try {
			years = await loadYears();
		} catch {
			loadError = true;
		}
	});
	const params = $derived(new URLSearchParams(route.search));
	const year = $derived(years.find((x) => String(x.year) === params.get('year'))?.year ?? years[0]?.year ?? null);
	const yearInfo = $derived(years.find((y) => y.year === year) ?? null);
	const prevYear = $derived(years.find((y) => year != null && y.year < year)?.year ?? null);
	const country = $derived(params.get('country')?.toUpperCase() ?? null);
	const metric = $derived<Metric>(params.get('by') === 'groups' ? 'groups' : 'participants');

	async function loadYear(y: number): Promise<YearData> {
		const [g, profiles] = await Promise.all([loadGroups(y), loadProfiles(y)]);
		return { year: y, snapshot: g.snapshot, groups: g.groups, profiles };
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

	let trend = $state<{ year: number; groups: number; participants: number; countries: number }[]>([]);
	$effect(() => {
		const ys = years.map((y) => y.year);
		const cc = country;
		if (ys.length < 2) return void (trend = []);
		Promise.all(ys.map(loadYear)).then((all) => {
			trend = all
				.map((d) => {
					const gs = cc ? d.groups.filter((g) => g.cc === cc) : d.groups;
					return { year: d.year, groups: gs.length, participants: gs.reduce((a, g) => a + (d.profiles.get(g.id)?.participants ?? 0), 0), countries: new Set(gs.map((g) => g.cc)).size };
				})
				.sort((a, b) => a.year - b.year);
		});
	});

	const sizeBuckets: [number, number, string][] = [
		[1, 1, '1'],
		[2, 5, '2–5'],
		[6, 10, '6–10'],
		[11, 20, '11–20'],
		[21, 50, '21–50'],
		[51, 100, '51–100'],
		[101, 500, '101–500'],
		[501, Infinity, '500+']
	];
	function summarise(gs: Group[], profiles: Map<number, Profile>) {
		const byCc = new Map<string, { groups: number; participants: number; capped: number }>();
		const byPlace = new Map<string, { city: string; cc: string; groups: number; participants: number; capped: number }>();
		const byWosm = new Map<string, { groups: number; participants: number; capped: number }>();
		const byContinent = new Map<string, { groups: number; participants: number; capped: number }>();
		const byOrg = new Map<string, { org: string; cc: string; groups: number; participants: number; capped: number }>();
		const sizes = sizeBuckets.map(() => 0);
		let participants = 0;
		const add = <K,>(m: Map<K, { groups: number; participants: number; capped: number }>, k: K, n: number) => {
			const x = m.get(k) ?? m.set(k, { groups: 0, participants: 0, capped: 0 }).get(k)!;
			if (n >= 1000) x.capped++;
			x.groups++;
			x.participants += n;
		};
		for (const g of gs) {
			const p = profiles.get(g.id);
			const n = p?.participants ?? 0;
			participants += n;
			add(byCc, g.cc, n);
			add(byContinent, countryRegion(g.cc), n);
			if (p?.jid) add(byWosm, p.jid[0], n);
			if (p?.org) {
				const k = `${g.cc}|${p.org.toLowerCase()}`;
				const o = byOrg.get(k) ?? byOrg.set(k, { org: p.org, cc: g.cc, groups: 0, participants: 0, capped: 0 }).get(k)!;
				if (n >= 1000) o.capped++;
				o.groups++;
				o.participants += n;
			}
			if (p?.participants) sizes[sizeBuckets.findIndex(([lo, hi]) => n >= lo && n <= hi)]++;
			const city = g.city.trim();
			if (g.approx || !city || /\d/.test(city)) continue;
			const k = `${g.cc}|${city.toLowerCase()}`;
			const pl = byPlace.get(k) ?? byPlace.set(k, { city, cc: g.cc, groups: 0, participants: 0, capped: 0 }).get(k)!;
			if (n >= 1000) pl.capped++;
			pl.groups++;
			pl.participants += n;
		}
		const largest = gs
			.map((g) => ({ g, n: profiles.get(g.id)?.participants ?? 0 }))
			.filter((x) => x.n)
			.sort((a, b) => b.n - a.n);
		return { groups: gs.length, participants, capped: largest.filter((x) => x.n >= 1000).length, byCc, byPlace, byWosm, byContinent, byOrg, sizes, largest };
	}
	const hasP = $derived(ready && cur ? cur.profiles.size > 0 : false);
	const m = $derived<Metric>(hasP ? metric : 'groups');
	const unit = $derived(m === 'groups' ? 'groups' : 'participants');
	const all = $derived(ready && cur ? summarise(cur.groups, cur.profiles) : null);
	const allPrev = $derived(ready && prev ? summarise(prev.groups, prev.profiles) : null);
	const inCountry = (d: YearData | null, cc: string) => (d ? summarise(d.groups.filter((g) => g.cc === cc), d.profiles) : null);
	const s = $derived(country && all ? (all.byCc.has(country) ? inCountry(cur, country) : null) : all);
	const p = $derived(country && allPrev ? inCountry(prev, country) : allPrev);

	function share(n: number, total: number) {
		if (!total) return '';
		const pct = (n / total) * 100;
		const s = pct >= 1 || pct === 0 ? Math.round(pct).toString() : pct.toLocaleString('en-GB', { maximumSignificantDigits: 2 });
		return `${s} %`;
	}
	const delta = (now: number, before: number | undefined) => (before == null ? null : now - before);
	const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '±0');
	const total = $derived(s ? s[m] : 0);
	const byValue = (a: Row, b: Row) => b.value - a.value || a.label.localeCompare(b.label);

	const tiles = $derived(
		s
			? [
					{ label: 'scout groups', value: s.groups, before: p?.groups },
					...(hasP ? [{ label: 'participants', value: s.participants, before: p?.participants, approx: s.capped > 0 }] : []),
					country
						? { label: 'towns and cities', value: s.byPlace.size, before: p?.byPlace.size }
						: { label: 'countries', value: s.byCc.size, before: p?.byCc.size },
					country && hasP
						? { label: 'participants per group', value: Math.round(s.participants / Math.max(1, s.largest.length)), before: undefined }
						: { label: country ? 'organisations' : 'towns and cities', value: country ? s.byOrg.size : s.byPlace.size, before: country ? undefined : p?.byPlace.size }
				]
			: []
	);

	const wosmRows = $derived<Row[]>(
		s
			? [...s.byWosm].map(([k, v]) => ({ key: k, label: wosmRegions[k] ?? k, value: v[m], approx: m === 'participants' && v.capped > 0, sub: share(v[m], [...s.byWosm.values()].reduce((a, x) => a + x[m], 0)) })).sort(byValue)
			: []
	);
	const continentRows = $derived<Row[]>(s ? [...s.byContinent].map(([k, v]) => ({ key: k, label: k, value: v[m], approx: m === 'participants' && v.capped > 0, sub: share(v[m], total) })).sort(byValue) : []);
	const placeRows = $derived<Row[]>(
		s
			? [...s.byPlace.values()]
					.map((x) => ({ key: `${x.cc}|${x.city}`, label: x.city, cc: country ? undefined : x.cc, value: x[m], approx: m === 'participants' && x.capped > 0, sub: country ? undefined : countryName(x.cc) }))
					.sort(byValue)
			: []
	);
	const orgRows = $derived<Row[]>(
		s
			? [...s.byOrg.values()]
					.map((x) => ({ key: `${x.cc}|${x.org}`, label: x.org, cc: country ? undefined : x.cc, value: x[m], approx: m === 'participants' && x.capped > 0 }))
					.sort(byValue)
			: []
	);
	const largestRows = $derived<Row[]>(s ? s.largest.map(({ g, n }) => ({ key: String(g.id), label: g.name, value: n, capped: n >= 1000, cc: country ? undefined : g.cc, href: groupPath(g) })) : []);

	/** competition ranking: equal values share a rank (1, 2, 2, 4) */
	function ranked(rows: Row[]) {
		const out: { r: Row; rank: number }[] = [];
		rows.forEach((r, i) => out.push({ r, rank: i && rows[i - 1].value === r.value ? out[i - 1].rank : i + 1 }));
		return out;
	}
	let expanded = $state<{ title: string; note: string; rows: Row[]; total: number } | null>(null);
	let expandQuery = $state('');
	const expandedRows = $derived(expanded ? ranked(expanded.rows).filter(({ r }) => (r.label + ' ' + (r.sub ?? '')).toLowerCase().includes(expandQuery.trim().toLowerCase())) : []);
	const open = (title: string, note: string, rows: Row[], total: number) => ((expandQuery = ''), (expanded = { title, note, rows, total }));
	$effect(() => {
		document.body.style.overflow = expanded ? 'hidden' : '';
	});

	const maxSize = $derived(Math.max(1, ...(s?.sizes ?? [])));

	let countryQuery = $state('');
	let showAll = $state(false);
	let sortBy = $state<'name' | 'groups' | 'participants' | 'avg' | 'change'>('participants');
	const countryRows = $derived.by(() => {
		if (!all) return [];
		const ccs = new Set([...all.byCc.keys(), ...(allPrev ? allPrev.byCc.keys() : [])]);
		const rows = [...ccs].map((cc) => {
			const x = all.byCc.get(cc) ?? { groups: 0, participants: 0, capped: 0 };
			return {
				cc,
				name: countryName(cc),
				...x,
				avg: x.groups ? x.participants / x.groups : 0,
				change: delta(x[m], allPrev ? (allPrev.byCc.get(cc)?.[m] ?? 0) : undefined)
			};
		});
		const key = sortBy === 'participants' && !hasP ? 'groups' : sortBy;
		rows.sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name, 'en') : ((b[key] ?? 0) as number) - ((a[key] ?? 0) as number) || b.groups - a.groups));
		return rows;
	});
	const filteredCountries = $derived(countryRows.filter((c) => c.name.toLowerCase().includes(countryQuery.trim().toLowerCase())));
	const visibleCountries = $derived(showAll || countryQuery ? filteredCountries : filteredCountries.slice(0, 20));
	const rankOf = $derived.by(() => {
		const v = all ? [...all.byCc].map(([cc, x]) => [cc, x[m]] as const) : [];
		return new Map(v.map(([cc, n]) => [cc, v.filter(([, o]) => o > n).length + 1]));
	});
	const countryRank = $derived(country ? (rankOf.get(country) ?? 0) : 0);
	const mapValues = $derived(new Map(all ? [...all.byCc].map(([cc, v]) => [cc, v[m]]) : []));

	let groupQuery = $state('');
	let showAllGroups = $state(false);
	const countryGroups = $derived.by(() => {
		if (!country || !cur) return [];
		return cur.groups
			.filter((g) => g.cc === country && (g.name + ' ' + g.city).toLowerCase().includes(groupQuery.trim().toLowerCase()))
			.map((g) => ({ g, n: cur!.profiles.get(g.id)?.participants ?? null }))
			.sort((a, b) => (b.n ?? -1) - (a.n ?? -1) || a.g.name.localeCompare(b.g.name));
	});


	const pickYear = (e: Event) => {
		const v = (e.currentTarget as HTMLSelectElement).value;
		setParams({ year: v === String(years[0]?.year) ? null : v });
	};
	const pickCountry = (cc: string | null) => {
		setParams({ country: cc });
		groupQuery = '';
		showAllGroups = false;
		window.scrollTo({ top: 0 });
	};
	const pickMetric = (v: Metric) => setParams({ by: v === 'participants' ? null : v });
</script>

<Seo
	title="{country ? `${countryName(country)} – ` : ''}JOTA-JOTI {year ?? data.summary?.year.year ?? ''} statistics | JotiGlobe"
	description={data.summary
		? `JOTA-JOTI ${data.summary.year.year} in numbers: ${fmt(data.summary.groups)} scout groups and ${fmt(data.summary.participants)} participants in ${data.summary.countries} countries, by country, region, town and organisation.`
		: 'JOTA-JOTI statistics: scout groups and participants by country, region, town and organisation.'}
	path="/stats"
/>

{#snippet card(title: string, note: string, body: import('svelte').Snippet)}
	<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
		<h2 class="text-lg font-semibold">{title}</h2>
		{#if note}<p class="text-sand/55 mt-1 text-xs">{note}</p>{/if}
		{@render body()}
	</section>
{/snippet}

{#snippet rowItem(r: Row, rank: number, max: number)}
	<li class="text-sm" title="{r.label}: {fmt(r.value)}{r.sub ? ` (${r.sub})` : ''}">
		<div class="flex items-baseline gap-2">
			<span class="text-sand/40 w-6 shrink-0 text-right text-xs tabular-nums">{rank}</span>
			{#if r.cc}<span class="fi fi-{r.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>{/if}
			{#if r.href}
				<a href={r.href} onclick={() => (expanded = null)} class="min-w-0 flex-1 truncate hover:underline">{r.label}{#if r.sub}<span class="text-sand/45"> · {r.sub}</span>{/if}</a>
			{:else}
				<span class="min-w-0 flex-1 truncate">{r.label}{#if r.sub}<span class="text-sand/45"> · {r.sub}</span>{/if}</span>
			{/if}
			<span class="font-medium tabular-nums">{r.capped ? fmtParticipants(r.value) : fmtSum(r.value, !!r.approx)}</span>
		</div>
		<div class="mt-1 ml-8 h-1.5 rounded-full bg-white/[0.06]">
			<div class="bg-moss h-full rounded-full" style:width="{(r.value / max) * 100}%"></div>
		</div>
	</li>
{/snippet}

{#snippet bars(rows: Row[], title: string, note = '', total = 0, limit = 12)}
	{@const max = total || Math.max(1, ...rows.map((r) => r.value))}
	<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
		<div class="flex items-start gap-2">
			<button type="button" onclick={() => open(title, note, rows, total)} class="min-w-0 flex-1 text-left">
				<h2 class="text-lg font-semibold hover:underline">{title}</h2>
				{#if note}<p class="text-sand/55 mt-1 text-xs">{note}</p>{/if}
			</button>
			<button type="button" onclick={() => open(title, note, rows, total)} class="text-sand/50 hover:text-sand -mt-1 -mr-2 grid size-8 place-items-center rounded-md hover:bg-white/10" aria-label="Show {title} full screen" title="Full screen">
				<Maximize class="size-4" />
			</button>
		</div>
		<ul class="mt-4 space-y-2.5">
			{#each ranked(rows).slice(0, limit) as { r, rank } (r.key)}
				{@render rowItem(r, rank, max)}
			{:else}
				<li class="text-sand/45 text-sm">Nothing to show.</li>
			{/each}
		</ul>
		{#if rows.length > limit}
			<button type="button" onclick={() => open(title, note, rows, total)} class="text-sand/70 hover:text-sand mt-3 text-sm underline underline-offset-4">Show all {fmt(rows.length)}</button>
		{/if}
	</section>
{/snippet}

{#snippet columns(cols: { key: string; label: string; value: number; title: string }[], height = 'h-40')}
	{@const max = Math.max(1, ...cols.map((x) => x.value))}
	<div class="mt-4 flex {height} items-end gap-1.5 sm:gap-2">
		{#each cols as x (x.key)}
			<div class="flex h-full min-w-0 flex-1 flex-col items-center gap-1" title={x.title}>
				<span class="text-[11px] tabular-nums sm:text-xs">{fmt(x.value)}</span>
				<div class="flex min-h-0 w-full flex-1 items-end justify-center">
					<div class="bg-moss w-full max-w-16 rounded-t" style:height="{(x.value / max) * 100}%"></div>
				</div>
				<span class="text-sand/55 text-[10px] whitespace-nowrap sm:text-[11px]">{x.label}</span>
			</div>
		{/each}
	</div>
{/snippet}

<div class="min-h-dvh">
	<header class="bg-forest-950/85 sticky top-0 z-20 border-b border-white/10 backdrop-blur">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
			<a href={year && year !== years[0]?.year ? `/?year=${year}` : '/'} class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm"><ArrowLeft class="size-4" /> Globe</a>
			<h1 class="flex-1 text-xl font-semibold">Statistics</h1>
			{#if hasP}
				<div class="flex rounded-md border border-white/15 p-0.5 text-sm" role="group" aria-label="Count">
					{#each [{ v: 'participants', l: 'Participants' }, { v: 'groups', l: 'Groups' }] as o (o.v)}
						<button type="button" onclick={() => pickMetric(o.v as Metric)} aria-pressed={m === o.v} class={cn('rounded px-2.5 py-1', m === o.v ? 'bg-white/10 text-sand' : 'text-sand/60 hover:text-sand')}>{o.l}</button>
					{/each}
				</div>
			{/if}
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
		{:else if !all || !yearInfo || !cur}
			{#if data.summary}
				{@const sm = data.summary}
				<div class="space-y-3">
					<h2 class="text-xl font-semibold">JOTA-JOTI {sm.year.year} in numbers</h2>
					<p class="text-sand/75">
						{fmt(sm.groups)} scout groups with {fmt(sm.participants)} participants in {sm.countries} countries signed up for JOTA-JOTI {fmtWeekend(sm.year)}.
					</p>
					<ol class="text-sand/70 grid gap-x-6 text-sm sm:grid-cols-2">
						{#each sm.top as t, i (t.cc)}
							<li><a href="/countries/{t.cc}" class="hover:underline">{i + 1}. {t.name}</a>: {fmt(t.participants)} participants in {fmt(t.groups)} groups</li>
						{/each}
					</ol>
					<p class="text-sand/50 flex items-center gap-2 pt-4 text-sm"><Loader class="size-4 animate-spin" /> Loading the charts…</p>
				</div>
			{:else}
				<div class="text-sand/60 flex items-center gap-2 py-20 text-sm"><Loader class="size-4 animate-spin" /> Loading…</div>
			{/if}
		{:else if country && !s}
			<div class="py-10">
				<p class="text-sand/70">No groups from {countryName(country)} in {year}.</p>
				<button type="button" onclick={() => pickCountry(null)} class="text-sand/70 hover:text-sand mt-3 inline-flex items-center gap-1.5 text-sm underline underline-offset-4">
					<ArrowLeft class="size-4" /> All countries
				</button>
			</div>
		{:else if s}
			{#if country}
				<div>
					<button type="button" onclick={() => pickCountry(null)} class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm"><ArrowLeft class="size-4" /> All countries</button>
					<div class="mt-3 flex items-center gap-4">
						<span class="fi fi-{country.toLowerCase()} !h-12 !w-16 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
						<div>
							<h2 class="text-2xl font-semibold sm:text-3xl">{countryName(country)}</h2>
							<p class="text-sand/60 text-sm">
								JOTA-JOTI {fmtWeekend(yearInfo)} · number {countryRank} of {all.byCc.size} countries by {unit} ·
								<a href="/?country={country}{year !== years[0]?.year ? `&year=${year}` : ''}" class="hover:text-sand underline underline-offset-2">show on the globe</a>
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div>
					<p class="text-sand/70 text-sm">JOTA-JOTI {fmtWeekend(yearInfo)}</p>
					<p class="text-sand/45 mt-1 text-xs">
						Groups signed up in the directory on jotajoti.info, as of {fmtDate(cur.snapshot)}{prev ? `, compared with ${prev.year}` : ''}.
						{#if hasP}Participants are the numbers groups gave on their profiles; the directory doesn't take more than 1,000.{/if}
					</p>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each tiles as t (t.label)}
					{@const d = delta(t.value, t.before)}
					<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<div class="font-heading text-2xl font-semibold tabular-nums sm:text-3xl">{fmtSum(t.value, !!('approx' in t && t.approx))}</div>
						<div class="text-sand/60 text-xs">{t.label}</div>
						{#if d != null}<div class={cn('mt-1 text-xs tabular-nums', d >= 0 ? 'text-moss' : 'text-red-300')}>{signed(d)} since {prev?.year}</div>{/if}
					</div>
				{/each}
			</div>

			{#if !country}
				{#snippet mapBody()}
					<div class="mt-4"><WorldMap values={mapValues} {unit} approx={m === 'participants' ? new Set([...all.byCc].filter(([, v]) => v.capped).map(([cc]) => cc)) : undefined} onpick={pickCountry} /></div>
				{/snippet}
				{@render card(`${m === 'groups' ? 'Groups' : 'Participants'} per country`, 'Click a country for its own statistics.', mapBody)}
			{/if}

			{#if trend.length > 1}
				<div class="grid gap-6 md:grid-cols-2">
					{#snippet trendGroups()}{@render columns(trend.map((t) => ({ key: String(t.year), label: String(t.year), value: t.groups, title: `${t.year}: ${fmt(t.groups)} groups` })))}{/snippet}
					{#snippet trendPeople()}{@render columns(trend.map((t) => ({ key: String(t.year), label: String(t.year), value: t.participants, title: `${t.year}: ${fmt(t.participants)} participants` })))}{/snippet}
					{@render card('Groups over the years', '', trendGroups)}
					{#if hasP}{@render card('Participants over the years', '', trendPeople)}{/if}
				</div>
			{/if}

			{#if !country}
				<div class="grid items-start gap-6 md:grid-cols-2">
					{@render bars(wosmRows, `${m === 'groups' ? 'Groups' : 'Participants'} by WOSM region`, 'From the region digit of each group’s JID.', wosmRows.reduce((a, r) => a + r.value, 0))}
					{@render bars(continentRows, `${m === 'groups' ? 'Groups' : 'Participants'} by continent`, '', total)}
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
									{#snippet th(key: typeof sortBy, label: string, cls = 'text-right')}
										<th class="py-2 pr-2 font-normal {cls}">
											<button type="button" onclick={() => (sortBy = key)} class={cn('hover:text-sand', sortBy === key && 'text-sand')}>{label}{sortBy === key && key !== 'name' ? ' ↓' : ''}</button>
										</th>
									{/snippet}
									<th class="text-sand/40 w-8 py-2 pr-2 text-right font-normal">#</th>
									{@render th('name', 'Country', 'text-left')}
									{@render th('groups', 'Groups')}
									{#if hasP}{@render th('participants', 'Participants')}{@render th('avg', 'Per group', 'hidden text-right sm:table-cell')}{/if}
									<th class="hidden w-1/4 py-2 font-normal md:table-cell"><span class="sr-only">Share of {unit}</span></th>
									{#if allPrev}{@render th('change', `vs ${prev?.year}`)}{/if}
								</tr>
							</thead>
							<tbody>
								{#each visibleCountries as r (r.cc)}
									<tr class="cursor-pointer border-b border-white/5 hover:bg-white/[0.04]" onclick={() => pickCountry(r.cc)}>
										<td class="text-sand/40 py-1.5 pr-2 text-right text-xs tabular-nums">{rankOf.get(r.cc) ?? ''}</td>
										<td class="py-1.5 pr-2">
											<a href="/stats?country={r.cc}" onclick={(e) => (e.preventDefault(), pickCountry(r.cc))} class="flex items-center gap-2 hover:underline">
												<span class="fi fi-{r.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
												<span class="truncate">{r.name}</span>
											</a>
										</td>
										<td class="py-1.5 pr-2 text-right tabular-nums">{fmt(r.groups)}</td>
										{#if hasP}
											<td class="py-1.5 pr-2 text-right tabular-nums">{fmtSum(r.participants, r.capped > 0)}</td>
											<td class="text-sand/60 hidden py-1.5 pr-2 text-right tabular-nums sm:table-cell">{r.avg ? r.avg.toFixed(1) : '–'}</td>
										{/if}
										<td class="hidden py-1.5 md:table-cell">
											<div class="flex items-center gap-2" title="{share(r[m], total)} of all {unit}">
												<div class="h-1.5 flex-1 rounded-full bg-white/[0.06]"><div class="bg-moss h-full rounded-full" style:width="{(r[m] / total) * 100}%"></div></div>
												<span class="text-sand/45 w-12 text-right text-xs tabular-nums">{share(r[m], total)}</span>
											</div>
										</td>
										{#if allPrev}
											<td class={cn('py-1.5 pr-2 text-right text-xs tabular-nums', (r.change ?? 0) > 0 ? 'text-moss' : (r.change ?? 0) < 0 ? 'text-red-300' : 'text-sand/45')}>{signed(r.change ?? 0)}</td>
										{/if}
									</tr>
								{:else}
									<tr><td colspan="7" class="text-sand/50 py-6 text-center">No countries match your search.</td></tr>
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
			{/if}

			{#if hasP}
				<div class="grid items-start gap-6 md:grid-cols-2">
					{#snippet sizesBody()}
						{@render columns(sizeBuckets.map(([, , label], i) => ({ key: label, label, value: s.sizes[i], title: `${fmt(s.sizes[i])} groups with ${label} participants` })))}
						<p class="text-sand/45 mt-2 text-center text-[11px]">participants per group</p>
					{/snippet}
					{@render card('Group sizes', 'Number of groups by how many participants they signed up.', sizesBody)}
					{@render bars(largestRows, 'Largest groups', `By participants signed up in ${year}.`)}
				</div>
			{/if}

			<div class="grid items-start gap-6 md:grid-cols-2">
				{@render bars(placeRows, 'Busiest towns and cities', 'Groups whose town could be placed on the map.')}
				{#if orgRows.length}{@render bars(orgRows, 'Scout organisations', 'As given on the group profiles.')}{/if}
			</div>

			{#if country}
				<section class="rounded-xl border border-white/10 bg-white/[0.03] p-5">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="flex-1 text-lg font-semibold">Groups in {countryName(country)}</h2>
						<label class="relative block w-full sm:w-56">
							<Search class="text-sand/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
							<input bind:value={groupQuery} placeholder="Search groups or places" class="placeholder:text-sand/40 focus:border-moss w-full rounded-md border border-white/10 bg-white/5 py-1.5 pr-3 pl-9 text-sm outline-none" />
						</label>
					</div>
					<ul class="mt-3 grid gap-x-6 sm:grid-cols-2">
						{#each showAllGroups || groupQuery ? countryGroups : countryGroups.slice(0, 30) as { g, n } (g.id)}
							<li class="border-b border-white/5">
								<a href={groupPath(g)} class="flex items-baseline gap-2 py-1.5 text-sm hover:underline">
									<span class="min-w-0 flex-1 truncate">{g.name}<span class="text-sand/45"> · {g.city || countryName(g.cc)}</span></span>
									{#if n != null}<span class="tabular-nums">{fmtParticipants(n)}</span>{/if}
								</a>
							</li>
						{:else}
							<li class="text-sand/50 py-4 text-sm">No groups match your search.</li>
						{/each}
					</ul>
					{#if !groupQuery && countryGroups.length > 30}
						<button type="button" onclick={() => (showAllGroups = !showAllGroups)} class="text-sand/70 hover:text-sand mt-3 text-sm underline underline-offset-4">
							{showAllGroups ? 'Show fewer' : `Show all ${countryGroups.length} groups`}
						</button>
					{/if}
				</section>
			{/if}

			<p class="text-sand/40 pt-2 text-xs leading-relaxed">
				Not an official JOTA-JOTI site. Groups from the
				<a href="https://www.jotajoti.info/directory" target="_blank" rel="noopener noreferrer" class="hover:text-sand underline underline-offset-2">directory on jotajoti.info</a>.
				Continents from mledoze/countries (ODbL). Map: Natural Earth.
			</p>
		{/if}
	</main>
</div>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (expanded = null)} />
{#if expanded}
	{@const max = expanded.total || Math.max(1, ...expanded.rows.map((r) => r.value))}
	<div class="bg-forest-950/98 fixed inset-0 z-50 flex flex-col backdrop-blur" role="dialog" aria-modal="true" aria-label={expanded.title}>
		<div class="border-b border-white/10">
			<div class="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
				<div class="min-w-0 flex-1">
					<h2 class="truncate text-xl font-semibold">{expanded.title}</h2>
					<p class="text-sand/55 text-xs">{fmt(expanded.rows.length)} in total{expanded.note ? ` · ${expanded.note}` : ''}</p>
				</div>
				<label class="relative block w-full sm:w-56">
					<Search class="text-sand/40 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<!-- svelte-ignore a11y_autofocus -->
					<input bind:value={expandQuery} autofocus placeholder="Search" class="placeholder:text-sand/40 focus:border-moss w-full rounded-md border border-white/10 bg-white/5 py-1.5 pr-3 pl-9 text-sm outline-none" />
				</label>
				<button type="button" onclick={() => (expanded = null)} class="text-sand/70 hover:text-sand grid size-9 place-items-center rounded-md hover:bg-white/10" aria-label="Close" title="Close (Esc)">
					<X class="size-5" />
				</button>
			</div>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<ul class="mx-auto max-w-3xl space-y-2.5 px-4 py-5 sm:px-6">
				{#each expandedRows as { r, rank } (r.key)}
					{@render rowItem(r, rank, max)}
				{:else}
					<li class="text-sand/50 py-6 text-center text-sm">Nothing matches your search.</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
