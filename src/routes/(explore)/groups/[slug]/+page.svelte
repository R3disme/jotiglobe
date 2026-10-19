<script lang="ts">
	import Seo from '#lib/Seo.svelte';
	import { countryName, fmtParticipants, fmtWeekend, groupPath } from '#lib/data.ts';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';

	let { data } = $props();
	const g = $derived(data.group);
	const now = $derived(data.seen[0]);
	const history = $derived([...data.seen].reverse());
	const maxP = $derived(Math.max(1, ...data.seen.map((s) => s.participants ?? 0)));
	const place = $derived(`${g.city ? `${g.city}, ` : ''}${countryName(g.cc)}`);

	const description = $derived(
		`${g.name} is a scout group from ${place}` +
			(now.participants != null ? ` with ${fmtParticipants(now.participants)} participants at JOTA-JOTI ${now.year.year}` : ` at JOTA-JOTI ${now.year.year}`) +
			(now.jid ? `. Group JID: ${now.jid}` : '') +
			(now.org ? `. ${now.org}.` : '.')
	);

	let copied = $state(false);
	async function copyJid(jid: string) {
		try {
			await navigator.clipboard.writeText(jid);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
	const fmtKm = (km: number) => (km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString('en-GB')} km`);
</script>

<Seo
	title="{g.name} – scout group in {countryName(g.cc)} | JotiGlobe"
	{description}
	path={data.path}
	jsonld={{
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: g.name,
		url: `https://jotiglobe.narluga-tuna.ts.net${data.path}`,
		address: { '@type': 'PostalAddress', addressLocality: g.city || undefined, addressCountry: g.cc },
		...(now.org ? { parentOrganization: { '@type': 'Organization', name: now.org } } : {})
	}}
/>

<div class="flex items-start gap-4">
	<a href="/countries/{g.cc}" title="About {countryName(g.cc)}" class="shrink-0">
		<span class="fi fi-{g.cc.toLowerCase()} !h-12 !w-16 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
	</a>
	<div class="min-w-0">
		<h1 class="text-2xl leading-tight font-semibold break-words sm:text-3xl">{g.name}</h1>
		<p class="text-sand/65 mt-1 flex items-center gap-1.5 text-sm">
			<MapPin class="size-4 shrink-0" />{g.city ? `${g.city}, ` : ''}<a href="/countries/{g.cc}" class="hover:underline">{countryName(g.cc)}</a>
		</p>
		{#if now.org}<p class="text-sand/50 mt-0.5 text-sm">{now.org}{data.wosm ? ` · ${data.wosm} Region` : ''}</p>{/if}
	</div>
</div>

<dl class="grid grid-cols-2 gap-3">
	<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
		<dt class="text-sand/55 text-xs">Participants in {now.year.year}</dt>
		<dd class="font-heading mt-1 text-2xl font-semibold tabular-nums">{now.participants != null ? fmtParticipants(now.participants) : '–'}</dd>
	</div>
	<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
		<dt class="text-sand/55 text-xs">Group JID in {now.year.year}</dt>
		<dd class="mt-1 flex items-center gap-1">
			{#if now.jid}
				<span class="font-heading text-xl font-semibold tracking-wide">{now.jid}</span>
				<button type="button" onclick={() => copyJid(now.jid)} class="text-sand/60 hover:text-sand grid size-8 place-items-center rounded-md hover:bg-white/10" aria-label="Copy the JID" title="Copy">
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
			{#each history as s (s.year.year)}
				<div class="flex h-full min-w-0 flex-1 flex-col items-center gap-1" title="{s.year.year}: {s.participants != null ? fmtParticipants(s.participants) : '?'} participants">
					<span class="text-xs tabular-nums">{s.participants != null ? fmtParticipants(s.participants) : '–'}</span>
					<div class="flex min-h-0 w-full flex-1 items-end justify-center">
						<div class="bg-moss w-full max-w-12 rounded-t" style:height="{((s.participants ?? 0) / maxP) * 100}%"></div>
					</div>
					<span class="text-sand/55 text-[11px]">{s.year.year}</span>
				</div>
			{/each}
		</div>
	{/if}
	<ul class="mt-2 divide-y divide-white/5 text-sm">
		{#each data.seen as s (s.year.year)}
			<li class="flex flex-wrap items-baseline gap-x-3 py-1.5">
				<a href="/stats?year={s.year.year}" class="font-medium hover:underline">{s.year.year}</a>
				<span class="text-sand/55 min-w-0 flex-1 truncate">{s.name !== g.name ? s.name : fmtWeekend(s.year)}</span>
				{#if s.jid}<span class="text-sand/60 font-mono text-xs">{s.jid}</span>{/if}
				<span class="tabular-nums">{s.participants != null ? `${fmtParticipants(s.participants)} participants` : ''}</span>
			</li>
		{/each}
	</ul>
</section>

<p class="text-sand/45 text-xs leading-relaxed">
	From the group directory on jotajoti.info. Groups sign up again each year, so JotiGlobe links the years by JID or by name.
	{#if g.approx}The town couldn't be found, so the group is shown somewhere in {countryName(g.cc)}.{:else}The location is guessed from the town name, so it may be a bit off.{/if}
</p>

{#if data.nearby.length}
	<section>
		<h2 class="text-lg font-semibold">Nearby groups</h2>
		<ul class="mt-3 grid gap-2 sm:grid-cols-2">
			{#each data.nearby as n (n.key)}
				<li>
					<a href={groupPath(n)} class="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2 transition-colors hover:bg-white/5">
						<span class="fi fi-{n.cc.toLowerCase()} shrink-0 rounded-[2px]" aria-hidden="true"></span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{n.name}</span>
							<span class="text-sand/55 block truncate text-xs">{n.city || countryName(n.cc)}</span>
						</span>
						<span class="text-sand/60 shrink-0 text-xs tabular-nums">{fmtKm(n.km)}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
