<script lang="ts">
	import { onMount } from 'svelte';
	import { geoNaturalEarth1, geoPath } from 'd3-geo';
	import { feature } from 'topojson-client';
	import type { Feature, FeatureCollection, Geometry } from 'geojson';
	import type { Topology } from 'topojson-specification';
	import { countryName, fmt, fmtSum } from './data';

	type CountryFeature = Feature<Geometry, { cc: string | null }>;

	let {
		values,
		unit,
		selected = null,
		approx,
		onpick
	}: {
		values: Map<string, number>;
		unit: string;
		selected?: string | null;
		approx?: Set<string>;
		onpick?: (cc: string) => void;
	} = $props();

	const W = 960,
		H = 500;
	const projection = geoNaturalEarth1().fitExtent(
		[
			[4, 4],
			[W - 4, H - 4]
		],
		{ type: 'Sphere' }
	);
	const path = geoPath(projection);
	let shapes = $state<{ cc: string | null; d: string; dot?: [number, number] }[]>([]);

	onMount(async () => {
		const load = async (file: string) => {
			const t = (await (await fetch(file)).json()) as Topology;
			return (feature(t, t.objects.countries) as unknown as FeatureCollection<Geometry, { cc: string | null }>).features as CountryFeature[];
		};
		const [low, extra] = await Promise.all([load('/data/countries-110m.json'), fetch('/data/countries-extra.json').then((r) => r.json())]);
		shapes = [
			...low.map((f) => ({ cc: f.properties.cc, d: path(f) ?? '' })),
			...(extra.features as CountryFeature[]).map((f) => ({ cc: f.properties.cc, d: path(f) ?? '', dot: path.centroid(f) as [number, number] }))
		];
	});

	const max = $derived(Math.max(1, ...values.values()));
	const stops = [
		[0x2a, 0x4a, 0x35],
		[0x7f, 0xb4, 0x8d],
		[0xe4, 0xf4, 0xe6]
	];
	function color(v: number) {
		const t = Math.log1p(v) / Math.log1p(max);
		const [a, b, u] = t < 0.5 ? [stops[0], stops[1], t * 2] : [stops[1], stops[2], (t - 0.5) * 2];
		return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * u)).join(',')})`;
	}
	const legendTicks = $derived([1, Math.round(Math.sqrt(max)), max].filter((v, i, a) => a.indexOf(v) === i));

	let hover = $state<{ x: number; y: number; cc: string } | null>(null);
	let box: HTMLDivElement;
	function move(e: PointerEvent, cc: string | null) {
		if (!cc) return void (hover = null);
		const r = box.getBoundingClientRect();
		hover = { x: e.clientX - r.left, y: e.clientY - r.top, cc };
	}
</script>

<div bind:this={box} class="relative">
	<svg viewBox="0 0 {W} {H}" class="block h-auto w-full" role="img" aria-label="World map of {unit} per country">
		<path d={path({ type: 'Sphere' })} fill="#0e1b14" stroke="rgba(94,155,196,0.3)" />
		{#each shapes as s, i (i)}
			{@const v = s.cc ? (values.get(s.cc) ?? 0) : 0}
			<path
				d={s.d}
				fill={v ? color(v) : '#18291f'}
				stroke={s.cc && s.cc === selected ? '#fff' : 'rgba(14,27,20,0.9)'}
				stroke-width={s.cc && s.cc === selected ? 1.5 : 0.5}
				class={v ? 'cursor-pointer' : ''}
				onpointermove={(e) => move(e, s.cc)}
				onpointerleave={() => (hover = null)}
				onclick={() => v && s.cc && onpick?.(s.cc)}
				role="presentation"
			/>
			{#if s.dot && v}
				<circle cx={s.dot[0]} cy={s.dot[1]} r="3" fill={color(v)} stroke="rgba(14,27,20,0.9)" class="cursor-pointer" onpointermove={(e) => move(e, s.cc)} onpointerleave={() => (hover = null)} onclick={() => s.cc && onpick?.(s.cc)} role="presentation" />
			{/if}
		{/each}
	</svg>
	{#if hover}
		<div
			class="bg-fixed-light text-fixed-dark pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
			style:left="{hover.x}px"
			style:top="{hover.y}px"
		>
			<div class="font-semibold">{countryName(hover.cc)} | {hover.cc}</div>
			<div class="text-fixed-dark/65">{values.get(hover.cc) ? `${fmtSum(values.get(hover.cc)!, !!approx?.has(hover.cc))} ${unit}` : `No ${unit}`}</div>
		</div>
	{/if}
	<div class="text-sand/55 mt-2 flex items-center gap-2 text-[11px]">
		<span>Fewer</span>
		<div class="h-2 w-40 rounded-full" style:background="linear-gradient(to right, rgb(42,74,53), rgb(127,180,141), rgb(228,244,230))"></div>
		<span>More {unit}</span>
		<span class="text-sand/40 ml-2 hidden sm:inline">(log scale: {legendTicks.map(fmt).join(' · ')})</span>
	</div>
</div>
