<script lang="ts">
	import Seo from '#lib/Seo.svelte';
	import { fmt, fmtParticipants, fmtSum, fmtWeekend, groupPath } from '#lib/data.ts';
	import ChartBar from '@lucide/svelte/icons/chart-bar';

	let { data } = $props();
	const c = $derived(data.country);
	const description = $derived(
		`${fmt(c.groups)} scout groups and ${fmtSum(c.participants, c.capped)} participants from ${c.name} signed up for JOTA-JOTI ${c.year.year}` +
			(c.largest.length ? `. Largest: ${c.largest.slice(0, 3).map((g) => g.name).join(', ')}.` : '.')
	);
</script>

<Seo title="Scout groups in {c.name} at JOTA-JOTI {c.year.year} | JotiGlobe" {description} path="/countries/{c.cc}" />

<div class="flex items-start gap-4">
	<span class="fi fi-{c.cc.toLowerCase()} !h-12 !w-16 shrink-0 rounded-sm shadow-[0_0_0_1px_rgb(255_255_255/0.15)]" aria-hidden="true"></span>
	<div class="min-w-0">
		<h1 class="text-2xl leading-tight font-semibold sm:text-3xl">{c.name}</h1>
		<p class="text-sand/60 mt-1 text-sm">JOTA-JOTI {fmtWeekend(c.year)}</p>
	</div>
</div>

<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
	{#each [{ l: 'scout groups', v: fmt(c.groups) }, { l: 'participants', v: fmtSum(c.participants, c.capped) }, { l: `of ${c.countries} by participants`, v: `#${c.rank}` }, { l: 'organisations', v: fmt(c.orgs) }] as t (t.l)}
		<div class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
			<dd class="font-heading text-2xl font-semibold tabular-nums">{t.v}</dd>
			<dt class="text-sand/55 text-xs">{t.l}</dt>
		</div>
	{/each}
</dl>

<section class="rounded-xl border border-white/10 bg-white/[0.03] p-4">
	<h2 class="text-sand/55 text-xs font-normal">Largest groups · click one, or a dot on the globe</h2>
	<ol class="mt-2 space-y-1 text-sm">
		{#each c.largest as g, i (g.key)}
			<li>
				<a href={groupPath(g)} class="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-white/5">
					<span class="text-sand/40 w-5 text-right text-xs tabular-nums">{i + 1}</span>
					<span class="min-w-0 flex-1 truncate">{g.name}<span class="text-sand/45"> · {g.city || c.name}</span></span>
					{#if g.n}<span class="tabular-nums">{fmtParticipants(g.n)}</span>{/if}
				</a>
			</li>
		{/each}
	</ol>
</section>

{#if c.places.length}
	<p class="text-sand/60 text-sm">Most groups in: {c.places.map(([p, n]) => `${p} (${n})`).join(', ')}.</p>
{/if}

<a href="/stats?country={c.cc}" class="bg-moss text-forest-950 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold">
	<ChartBar class="size-4" /> All statistics for {c.name}
</a>
