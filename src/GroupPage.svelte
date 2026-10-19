<script lang="ts">
	import { onMount } from 'svelte';
	import ScoutGlobe, { type Group } from './lib/scout-globe.svelte';
	import { loadYears, loadGroups, loadProfiles, groupPath, groupKeyFromPath, countryName, distanceKm, fmt, fmtParticipants, fmtWeekend, type YearInfo, type Profile } from './lib/data';
	import { route, navigate } from './lib/router.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-circle';
	import ChartBar from '@lucide/svelte/icons/chart-bar';

	type YearData = { y: YearInfo; groups: Group[]; profiles: Map<number, Profile> };
	let data = $state<YearData[]>([]); // newest year first
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	onMount(async () => {
		try {
			const years = await loadYears();
			data = await Promise.all(years.map(async (y) => ({ y, groups: (await loadGroups(y.year)).groups, profiles: await loadProfiles(y.year) })));
			status = 'ready';
		} catch {
			status = 'error';
		}
	});

	const countryParam = $derived(/^\/countries\/([a-z]{2})\/?$/i.exec(route.path)?.[1].toUpperCase() ?? null);
	const groupKey = $derived(countryParam ? null : groupKeyFromPath(route.path));
	const latest = $derived(data[0]);
	const groups = $derived(latest?.groups ?? []); // the globe and "nearby" use the newest year

	const seen = $derived(
		groupKey == null
			? []
			: data.flatMap((d) => {
					const g = d.groups.find((x) => x.key === groupKey);
					return g ? [{ y: d.y, g, p: d.profiles.get(g.id) }] : [];
				})
	);
	const now = $derived(seen[0]);
	const group = $derived(now?.g ?? null);
	$effect(() => {
		if (group && !countryParam && location.pathname !== groupPath(group)) navigate(groupPath(group) + location.search, true);
	});
	const nearby = $derived(
		group
			? groups
					.filter((g) => g.id !== group.id && !g.approx)
					.map((g) => ({ g, km: distanceKm(group, g) }))
					.sort((a, b) => a.km - b.km)
					.slice(0, 8)
			: []
	);
	const history = $derived([...seen].reverse()); // oldest first, for the chart
	const maxP = $derived(Math.max(1, ...seen.map((s) => s.p?.participants ?? 0)));

	const cc = $derived(countryParam ?? group?.cc ?? null);
	const country = $derived.by(() => {
		if (!countryParam || !latest) return null;
		const p = (g: Group) => latest.profiles.get(g.id)?.participants ?? 0;
		const gs = latest.groups.filter((g) => g.cc === countryParam);
		if (!gs.length) return null;
		const totals = new Map<string, number>();
		for (const g of latest.groups) totals.set(g.cc, (totals.get(g.cc) ?? 0) + p(g));
		const places = new Map<string, number>();
		for (const g of gs) if (g.city && !g.approx && !/\d/.test(g.city)) places.set(g.city, (places.get(g.city) ?? 0) + 1);
		const participants = gs.reduce((a, g) => a + p(g), 0);
		return {
			groups: gs.length,
			participants,
			rank: [...totals.values()].filter((v) => v > participants).length + 1,
			countries: totals.size,
			largest: gs
				.map((g) => ({ g, n: p(g) }))
				.sort((a, b) => b.n - a.n || a.g.name.localeCompare(b.g.name))
				.slice(0, 12),
			places: [...places].sort((a, b) => b[1] - a[1]).slice(0, 6),
			orgs: [...new Set(gs.map((g) => latest.profiles.get(g.id)?.org).filter(Boolean))].length
		};
	});

	const names = $derived(Object.fromEntries([...new Set(groups.map((g) => g.cc))].map((c) => [c, countryName(c)])));
	let selected = $state<string | null>(null);
	let focused = $state<Group | null>(null);
	$effect(() => {
		const g = group && !countryParam ? (groups.find((x) => x.key === group.key) ?? group) : null;
		focused = g;
		selected = g?.cc ?? countryParam;
	});
	const pick = (g: Group) => navigate(groupPath(g));
	const pickCountry = (c: string) => navigate(`/countries/${c}`);

	let copied = $state(false);
	async function copyJid(jid: string) {
		try {
			await navigator.clipboard.writeText(jid);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
	const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-GB')} km`);
	const missing = $derived(status === 'ready' && (countryParam ? !country : !group));
</script>

<svelte:head>
	<title>{group && !countryParam ? `${group.name} – ${countryName(group.cc)}` : countryParam ? `Scout groups in ${countryName(countryParam)}` : 'Scout group'} – JotiGlobe</title>
</svelte:head>

<div class="min-h-dvh">
	<header class="bg-forest-950/85 sticky top-0 z-10 border-b border-white/10 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
			<a href={cc ? `/?country=${cc}` : '/'} class="text-sand/70 hover:text-sand inline-flex flex-1 items-center gap-1.5 text-sm">
				<ArrowLeft class="size-4" /> Globe
			</a>
			<a href={cc ? `/stats?country=${cc}` : '/stats'} class="text-sand/70 hover:text-sand inline-flex items-center gap-1.5 text-sm"><ChartBar class="size-4" /> Statistics</a>
		</div>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
		{#if status === 'loading'}
			<div class="text-sand/60 flex items-center gap-2 py-20 text-sm"><Loader class="size-4 animate-spin" /> Loading…</div>
		{:else if status === 'error'}
			<p class="rounded-md bg-red-950/40 px-4 py-3 text-sm text-red-200">Could not load the group list. Please reload the page.</p>
		{:else if missing}
			<div class="py-16">
				<h1 class="text-2xl font-semibold">{countryParam ? 'No groups from this country' : 'Group not found'}</h1>
				<p class="text-sand/60 mt-2 text-sm">{countryParam ? `No groups from ${countryName(countryParam)} in ${latest?.y.year}.` : "This group isn't in any of the JOTA-JOTI years we have."}</p>
				<a href="/" class="bg-moss text-forest-950 mt-5 inline-flex rounded-md px-4 py-2.5 text-sm font-semibold">Back to the globe</a>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
				<div class="min-w-0 space-y-5">
					{#if country && countryParam}
						<div class="flex items-start gap-4">
							<span class="fi fi-{countryParam.toLowerCase()} !h-12 !w-16 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
							<div class="min-w-0">
								<h1 class="text-2xl leading-tight font-semibold sm:text-3xl">{countryName(countryParam)}</h1>
								<p class="text-sand/60 mt-1 text-sm">JOTA-JOTI {fmtWeekend(latest.y)}</p>
							</div>
						</div>
						<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{#each [{ l: 'scout groups', v: fmt(country.groups) }, { l: 'participants', v: fmt(country.participants) }, { l: `of ${country.countries} by participants`, v: `#${country.rank}` }, { l: 'organisations', v: fmt(country.orgs) }] as t (t.l)}
								<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
									<dd class="font-heading text-2xl font-semibold tabular-nums">{t.v}</dd>
									<dt class="text-sand/55 text-xs">{t.l}</dt>
								</div>
							{/each}
						</dl>
						<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<h2 class="text-sand/55 text-xs font-normal">Largest groups · click one, or a dot on the globe</h2>
							<ol class="mt-2 space-y-1 text-sm">
								{#each country.largest as { g, n }, i (g.id)}
									<li>
										<a href={groupPath(g)} class="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-white/5">
											<span class="text-sand/40 w-5 text-right text-xs tabular-nums">{i + 1}</span>
											<span class="min-w-0 flex-1 truncate">{g.name}<span class="text-sand/45"> · {g.city || countryName(g.cc)}</span></span>
											{#if n}<span class="tabular-nums">{fmtParticipants(n)}</span>{/if}
										</a>
									</li>
								{/each}
							</ol>
						</section>
						{#if country.places.length}
							<p class="text-sand/60 text-sm">Most groups in: {country.places.map(([c, n]) => `${c} (${n})`).join(', ')}.</p>
						{/if}
						<a href="/stats?country={countryParam}" class="bg-moss text-forest-950 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold">
							<ChartBar class="size-4" /> All statistics for {countryName(countryParam)}
						</a>
					{:else if group && now}
						<div class="flex items-start gap-4">
							<a href="/countries/{group.cc}" title="About {countryName(group.cc)}" class="shrink-0">
								<span class="fi fi-{group.cc.toLowerCase()} !h-12 !w-16 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
							</a>
							<div class="min-w-0">
								<h1 class="text-2xl leading-tight font-semibold break-words sm:text-3xl">{group.name}</h1>
								<p class="text-sand/65 mt-1 flex items-center gap-1.5 text-sm">
									<MapPin class="size-4 shrink-0" />{group.city ? `${group.city}, ` : ''}<a href="/countries/{group.cc}" class="hover:underline">{countryName(group.cc)}</a>
								</p>
								{#if now.p?.org}<p class="text-sand/50 mt-0.5 text-sm">{now.p.org}</p>{/if}
							</div>
						</div>

						<dl class="grid grid-cols-2 gap-3">
							<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
								<dt class="text-sand/55 text-xs">Participants in {now.y.year}</dt>
								<dd class="font-heading mt-1 text-2xl font-semibold tabular-nums">{now.p?.participants != null ? fmtParticipants(now.p.participants) : '–'}</dd>
							</div>
							<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
								<dt class="text-sand/55 text-xs">Group JID in {now.y.year}</dt>
								<dd class="mt-1 flex items-center gap-1">
									{#if now.p?.jid}
										<span class="font-heading text-xl font-semibold tracking-wide">{now.p.jid}</span>
										<button type="button" onclick={() => copyJid(now.p!.jid)} class="text-sand/60 hover:text-sand grid size-8 place-items-center rounded-md hover:bg-white/10" aria-label="Copy the JID" title="Copy">
											{#if copied}<Check class="size-4" />{:else}<Copy class="size-4" />{/if}
										</button>
									{:else}<span class="font-heading text-xl">–</span>{/if}
								</dd>
							</div>
						</dl>

						<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<h2 class="text-sand/55 text-xs font-normal">JOTA-JOTI years</h2>
							{#if history.length > 1}
								<div class="mt-3 flex h-32 items-end gap-3" role="img" aria-label="Participants per year">
									{#each history as s (s.y.year)}
										<div class="flex h-full min-w-0 flex-1 flex-col items-center gap-1" title="{s.y.year}: {s.p?.participants != null ? fmtParticipants(s.p.participants) : '?'} participants">
											<span class="text-xs tabular-nums">{s.p?.participants != null ? fmtParticipants(s.p.participants) : '–'}</span>
											<div class="flex min-h-0 w-full flex-1 items-end justify-center">
												<div class="bg-moss w-full max-w-12 rounded-t" style:height="{((s.p?.participants ?? 0) / maxP) * 100}%"></div>
											</div>
											<span class="text-sand/55 text-[11px]">{s.y.year}</span>
										</div>
									{/each}
								</div>
							{/if}
							<ul class="mt-2 divide-y divide-white/5 text-sm">
								{#each seen as s (s.y.year)}
									<li class="flex flex-wrap items-baseline gap-x-3 py-1.5">
										<a href="/stats?year={s.y.year}" class="font-medium hover:underline">{s.y.year}</a>
										<span class="text-sand/55 min-w-0 flex-1 truncate">{s.g.name !== group.name ? s.g.name : fmtWeekend(s.y)}</span>
										{#if s.p?.jid}<span class="text-sand/60 font-mono text-xs">{s.p.jid}</span>{/if}
										<span class="tabular-nums">{s.p?.participants != null ? `${fmtParticipants(s.p.participants)} participants` : ''}</span>
									</li>
								{/each}
							</ul>
						</section>

						<p class="text-sand/45 text-xs leading-relaxed">
							From the group directory on jotajoti.info. Groups sign up again each year, so JotiGlobe links the years by JID or by name.
							{#if group.approx}The town couldn't be found, so the group is shown somewhere in {countryName(group.cc)}.{:else}The location is guessed from the town name, so it may be a bit off.{/if}
						</p>
					{/if}
				</div>

				<div class="md:sticky md:top-20 md:self-start">
					<div class="relative aspect-square overflow-hidden rounded-xl border border-white/10">
						<ScoutGlobe {groups} {names} bind:selected bind:focused idleMs={2_000_000_000} controls={false} class="absolute inset-0" onpick={pick} oncountry={pickCountry} />
					</div>
					<p class="text-sand/45 mt-2 text-center text-xs">Click a group or a country to see its numbers</p>
				</div>
			</div>

			{#if group && !countryParam && nearby.length}
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
