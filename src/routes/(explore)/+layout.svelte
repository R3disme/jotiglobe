<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ScoutGlobe, { type Group } from '#lib/scout-globe.svelte';
	import { loadYears, loadGroups, groupPath, countryName } from '#lib/data.ts';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChartBar from '@lucide/svelte/icons/chart-bar';

	let { children } = $props();

	let groups = $state<Group[]>([]);
	onMount(async () => {
		const y = (await loadYears())[0];
		if (y) groups = (await loadGroups(y.year)).groups;
	});
	const names = $derived(Object.fromEntries([...new Set(groups.map((g) => g.cc))].map((c) => [c, countryName(c)])));

	const groupKey = $derived((page.data.group as Group | undefined)?.key ?? null);
	const cc = $derived((page.data.country?.cc ?? page.data.group?.cc ?? null) as string | null);

	// the globe follows the page: it zooms to the group or the country
	let selected = $state<string | null>(null);
	let focused = $state<Group | null>(null);
	$effect(() => {
		const g = groupKey != null ? (groups.find((x) => x.key === groupKey) ?? null) : null;
		focused = g;
		selected = g?.cc ?? cc;
	});
</script>

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
		<div class="grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)]">
			<div class="min-w-0 space-y-5">
				{@render children()}
			</div>
			<div class="md:sticky md:top-20 md:self-start">
				<div class="relative aspect-square overflow-hidden rounded-xl border border-white/10">
					<ScoutGlobe
						{groups}
						{names}
						bind:selected
						bind:focused
						idleMs={2_000_000_000}
						controls={false}
						class="absolute inset-0"
						onpick={(g) => goto(groupPath(g))}
						oncountry={(c) => goto(`/countries/${c}`)}
					/>
				</div>
				<p class="text-sand/45 mt-2 text-center text-xs">Click a group or a country to see its numbers</p>
			</div>
		</div>
	</main>
</div>
