<script lang="ts" module>
	export type Group = { id: number; key: number; name: string; city: string; cc: string; lat: number; lon: number; approx?: boolean };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoCentroid, geoBounds, geoDistance, geoArea } from 'd3-geo';
	import { feature } from 'topojson-client';
	import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';
	import type { Topology } from 'topojson-specification';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { cn } from './utils';
	import { countryName } from './data';
	import atlasUrl from '../assets/flags.webp';
	import atlas from './flag-atlas.json';

	type CountryFeature = Feature<Geometry, { cc: string | null }>;

	let {
		groups = [],
		names = {},
		selected = $bindable(null),
		focused = $bindable(null),
		onopen,
		onpick,
		oncountry,
		idleMs = 10000,
		controls = true,
		autoSpin = true,
		spinSpeed = 6,
		highlight = null,
		me = null,
		class: className = ''
	}: {
		/** The viewer's own position (kept in memory only) – drawn as a blue dot; setting it flies there */
		me?: { lat: number; lon: number; accuracy?: number } | null;
		/** Name of a group to draw as a red pin */
		highlight?: string | null;
		groups?: Group[];
		/** ISO2 → display name */
		names?: Record<string, string>;
		/** Focused country (ISO2), bindable. Cleared after `idleMs` without interaction. */
		selected?: string | null;
		/** Focused group (bindable): the globe zooms to it and marks it with a pulsing ring */
		focused?: Group | null;
		/** Called on double-click on a group dot */
		onopen?: (g: Group) => void;
		/** Called when a group dot is clicked */
		onpick?: (g: Group) => void;
		/** Called when a country with groups is clicked */
		oncountry?: (cc: string) => void;
		idleMs?: number;
		controls?: boolean;
		autoSpin?: boolean;
		/** degrees per second */
		spinSpeed?: number;
		class?: string;
	} = $props();

	let wrap: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let hover = $state<{ x: number; y: number; title: string; sub?: string } | null>(null);
	let ready = $state(false);
	let detailed = $state(false); // the 50m map has loaded (small countries like Malta only exist there)

	// --- geometry -------------------------------------------------------------------------------
	let low: CountryFeature[] = [];
	let high: CountryFeature[] = [];
	const graticule = geoGraticule10();
	const sphere = { type: 'Sphere' } as const;

	const groupsByCc = $derived.by(() => {
		const m = new Map<string, number>();
		for (const g of groups) m.set(g.cc, (m.get(g.cc) ?? 0) + 1);
		return m;
	});

	// Unit vectors for fast hemisphere culling
	const rad = Math.PI / 180;
	const dots = $derived(
		groups.map((g) => {
			const φ = g.lat * rad,
				λ = g.lon * rad;
			return { g, x: Math.cos(φ) * Math.cos(λ), y: Math.cos(φ) * Math.sin(λ), z: Math.sin(φ), px: 0, py: 0, vis: false };
		})
	);

	// --- view state (current → target, eased every frame) ---------------------------------------
	const view = { λ: -10, φ: -25, k: 1 };
	const target = { λ: -10, φ: -25, k: 1 };
	let flagAlpha = 0;
	let dragging = false;
	let reducedMotion = false;

	// Flags are rasterised once (drawing a scaled SVG every frame is slow)
	const flagCache = new Map<string, HTMLCanvasElement | null>();
	function flag(cc: string) {
		if (!flagCache.has(cc)) {
			flagCache.set(cc, null);
			const img = new Image();
			img.onload = () => {
				const c = document.createElement('canvas');
				c.width = 800;
				c.height = 600;
				c.getContext('2d')!.drawImage(img, 0, 0, 800, 600);
				flagCache.set(cc, c);
			};
			img.src = `/flags/${cc.toLowerCase()}.svg`;
		}
		return flagCache.get(cc) ?? null;
	}

	// Per-feature centroid + angular radius, for culling countries outside the view
	const featInfo = new WeakMap<CountryFeature, { c: [number, number]; r: number }>();
	function info(f: CountryFeature) {
		let i = featInfo.get(f);
		if (!i) {
			const c = geoCentroid(f);
			const [[w, s], [e, n]] = geoBounds(f);
			const east = e < w ? e + 360 : e;
			const r = Math.max(...([[w, s], [w, n], [east, s], [east, n]] as [number, number][]).map((p) => geoDistance(c, p)));
			i = { c, r };
			featInfo.set(f, i);
		}
		return i;
	}

	const loadTopo = (file: string) =>
		fetch(file)
			.then((r) => r.json())
			.then((t: Topology) => (feature(t, t.objects.countries) as unknown as FeatureCollection<Geometry, { cc: string | null }>).features as CountryFeature[]);
	let highRequested = false;
	function loadHigh() {
		highRequested = true;
		loadTopo('/data/countries-50m.json').then((f) => {
			high = f;
			detailed = true;
		});
	}

	let atlasImg: HTMLImageElement | null = null;
	const [tileW, tileH] = atlas.tile;
	const atlasIndex: Record<string, number> = atlas.index;
	// where to look on the flag when it's cropped: [x, y] in 0..1
	const flagFit: Record<string, [number, number]> = {
		NO: [0.37, 0.5], SE: [0.37, 0.5], FI: [0.36, 0.5], DK: [0.37, 0.5], IS: [0.36, 0.5], FO: [0.36, 0.5],
		CL: [0.17, 0.25], US: [0.5, 0.3], GR: [0.2, 0.3], MY: [0.25, 0.3], TW: [0.25, 0.25]
	};
	function coverRect(cc: string, [[x0, y0], [x1, y1]]: [[number, number], [number, number]]) {
		const bw = x1 - x0,
			bh = y1 - y0;
		const sc = Math.max(bw / 4, bh / 3);
		const W = 4 * sc,
			H = 3 * sc;
		const [fx, fy] = flagFit[cc] ?? [0.5, 0.5];
		const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
		return { x: clamp(x0 + bw / 2 - fx * W, x1 - W, x0), y: clamp(y0 + bh / 2 - fy * H, y1 - H, y0), w: W, h: H };
	}

	// 0 = full, 1 = lower resolution, 2 = plain dots, no background flags, 30 fps
	let quality = 0;

	function findFeature(cc: string | null) {
		if (!cc) return undefined;
		return (high.length ? high : low).find((f) => f.properties.cc === cc);
	}

	/** The country's main parts only (drops small far-flung territories like Svalbard or French Guiana) */
	function mainParts(f: CountryFeature): CountryFeature {
		if (f.geometry.type !== 'MultiPolygon') return f;
		const polys = f.geometry.coordinates.map((c) => ({ c, a: geoArea({ type: 'Polygon', coordinates: c }) }));
		const max = Math.max(...polys.map((p) => p.a));
		return { ...f, geometry: { type: 'MultiPolygon', coordinates: polys.filter((p) => p.a >= max * 0.2).map((p) => p.c) } };
	}

	const flagAreasCache = new WeakMap<CountryFeature, { main: CountryFeature; rest: CountryFeature[] }>();
	function flagAreas(f: CountryFeature) {
		let a = flagAreasCache.get(f);
		if (a) return a;
		const main = mainParts(f);
		const rest: CountryFeature[] = [];
		if (f.geometry.type === 'MultiPolygon' && main.geometry.type === 'MultiPolygon') {
			const inMain = new Set(main.geometry.coordinates);
			const clusters: { polys: Position[][][]; cs: [number, number][] }[] = [];
			for (const poly of f.geometry.coordinates) {
				if (inMain.has(poly)) continue;
				const c = geoCentroid({ type: 'Polygon', coordinates: poly });
				const near = clusters.filter((k) => k.cs.some((x) => geoDistance(x, c) < 0.05));
				const into = near[0] ?? { polys: [], cs: [] };
				if (!near.length) clusters.push(into);
				for (const other of near.slice(1)) {
					into.polys.push(...other.polys);
					into.cs.push(...other.cs);
					clusters.splice(clusters.indexOf(other), 1);
				}
				into.polys.push(poly);
				into.cs.push(c);
			}
			for (const k of clusters) rest.push({ ...f, geometry: { type: 'MultiPolygon', coordinates: k.polys } });
		}
		a = { main, rest };
		flagAreasCache.set(f, a);
		return a;
	}

	/** Zoom so the country's angular extent fills most of the view */
	function fitZoom(f: CountryFeature) {
		const c = geoCentroid(f);
		const [[w, s], [e, n]] = geoBounds(f);
		const east = e < w ? e + 360 : e;
		const pts: [number, number][] = [
			[w, s], [w, n], [east, s], [east, n], [(w + east) / 2, s], [(w + east) / 2, n], [w, (s + n) / 2], [east, (s + n) / 2]
		];
		const a = Math.max(...pts.map((p) => geoDistance(c, p)));
		return Math.min(28, Math.max(1.15, 0.78 / Math.sin(Math.min(a, 1.3))));
	}

	function shortest(from: number, to: number) {
		let d = ((to - from + 180) % 360 + 360) % 360 - 180;
		return from + d;
	}

	$effect(() => {
		void detailed;
		const f = findFeature(selected);
		const fg = focused;
		if (ready && fg) {
			target.λ = shortest(view.λ, -fg.lon);
			target.φ = Math.max(-75, Math.min(75, -fg.lat));
			target.k = Math.max(f ? fitZoom(mainParts(f)) : 1, 12);
		} else if (ready && f) {
			const main = mainParts(f);
			const [lon, lat] = geoCentroid(main);
			target.λ = shortest(view.λ, -lon);
			target.φ = Math.max(-75, Math.min(75, -lat));
			target.k = fitZoom(main);
		} else if (ready && !selected) {
			target.k = 1;
		}
	});

	// --- idle handling --------------------------------------------------------------------------
	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	let lastInteraction = 0;
	function poke() {
		lastInteraction = performance.now();
		clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			focused = null;
			selected = null;
			target.k = 1;
		}, idleMs);
	}
	$effect(() => {
		void selected;
		void focused;
		if (selected || focused) poke();
	});
	// fly to the viewer's position when it is set
	$effect(() => {
		const m = me;
		if (ready && m && !focused) {
			target.λ = shortest(view.λ, -m.lon);
			target.φ = Math.max(-75, Math.min(75, -m.lat));
			target.k = Math.max(target.k, 5);
			poke();
		}
	});
	// focusing a group also selects its country (so its flag is shown)
	$effect(() => {
		if (focused && focused.cc !== selected) selected = focused.cc;
	});


	// --- interaction ----------------------------------------------------------------------------
	const pointers = new Map<number, { x: number; y: number }>();
	let downAt = { x: 0, y: 0 };
	let moved = false;
	let pinchStart = 0;
	let pinchK = 1;

	const projection = geoOrthographic().clipAngle(90).precision(0.6);
	let size = { w: 0, h: 0 };

	function local(e: PointerEvent | WheelEvent) {
		const r = canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function onDown(e: PointerEvent) {
		canvas.setPointerCapture(e.pointerId);
		const p = local(e);
		pointers.set(e.pointerId, p);
		downAt = p;
		moved = false;
		dragging = true;
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
			pinchK = target.k;
		}
		poke();
	}

	function onMove(e: PointerEvent) {
		const p = local(e);
		if (!pointers.has(e.pointerId)) {
			updateHover(p);
			return;
		}
		const prev = pointers.get(e.pointerId)!;
		pointers.set(e.pointerId, p);
		if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > 4) moved = true;
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			if (pinchStart) target.k = clampK(pinchK * (d / pinchStart));
		} else {
			const sens = 0.25 / Math.max(1, view.k * 0.6);
			target.λ += (p.x - prev.x) * sens;
			target.φ = Math.max(-80, Math.min(80, target.φ - (p.y - prev.y) * sens));
			view.λ = target.λ;
			view.φ = target.φ;
		}
		hover = null;
		poke();
	}

	function onUp(e: PointerEvent) {
		pointers.delete(e.pointerId);
		if (pointers.size === 0) dragging = false;
		if (!moved && pointers.size === 0) {
			const p = local(e);
			const dot = dotAt(p);
			if (dot) {
				focused = dot.g;
				onpick?.(dot.g);
			} else {
				const cc = countryAt(p);
				if (cc && groupsByCc.has(cc)) {
					focused = null;
					selected = cc;
					oncountry?.(cc);
				}
			}
		}
		pinchStart = 0;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		target.k = clampK(target.k * Math.exp(-e.deltaY * 0.0015));
		poke();
	}

	const clampK = (k: number) => Math.max(0.85, Math.min(40, k));
	const zoomBy = (f: number) => {
		target.k = clampK(target.k * f);
		poke();
	};
	const reset = () => {
		focused = null;
		selected = null;
		target.k = 1;
	};

	function countryAt(p: { x: number; y: number }) {
		const ll = projection.invert?.([p.x, p.y]);
		if (!ll) return null;
		// invert() also returns points on the far side; only accept points within the visible disc
		const r = projection.scale();
		if (Math.hypot(p.x - size.w / 2, p.y - size.h / 2) > r) return null;
		const f = low.find((f) => geoContains(f, ll));
		return f?.properties.cc ?? null;
	}

	/** Nearest visible group dot under the pointer (only when zoomed in enough to tell dots apart) */
	function dotAt(p: { x: number; y: number }) {
		if (view.k <= 2.2) return null;
		let best: (typeof dots)[number] | null = null;
		let bestD = 10;
		for (const d of dots) {
			if (!d.vis) continue;
			const dist = Math.hypot(d.px - p.x, d.py - p.y);
			if (dist < bestD) {
				bestD = dist;
				best = d;
			}
		}
		return best;
	}

	function onDblClick(e: MouseEvent) {
		const r = canvas.getBoundingClientRect();
		const dot = dotAt({ x: e.clientX - r.left, y: e.clientY - r.top });
		if (dot) onopen?.(dot.g);
	}

	function updateHover(p: { x: number; y: number }) {
		// nearest visible group dot first (when zoomed in), otherwise the country
		const best = dotAt(p);
		if (best) {
			hover = { x: p.x, y: p.y, title: best.g.name, sub: `${best.g.city}${best.g.approx ? ' (approximate location)' : ''} · double-click for the group page` };
			return;
		}
		const cc = countryAt(p);
		if (cc) {
			const n = groupsByCc.get(cc) ?? 0;
			hover = { x: p.x, y: p.y, title: `${names[cc] ?? countryName(cc)} | ${cc}`, sub: n ? `${n} ${n === 1 ? 'group' : 'groups'}` : 'No registered groups' };
		} else hover = null;
		hoverCc = cc;
	}
	let hoverCc: string | null = null;

	// --- rendering ------------------------------------------------------------------------------
	let glow: HTMLCanvasElement;
	function makeGlow() {
		glow = document.createElement('canvas');
		glow.width = glow.height = 32;
		const g = glow.getContext('2d')!;
		const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
		grad.addColorStop(0, 'rgba(255, 226, 150, 1)');
		grad.addColorStop(0.25, 'rgba(236, 193, 90, 0.85)');
		grad.addColorStop(1, 'rgba(236, 193, 90, 0)');
		g.fillStyle = grad;
		g.fillRect(0, 0, 32, 32);
	}

	let lastKey = '';
	function draw(ctx: CanvasRenderingContext2D, dt: number) {
		const _selected = selected;
		const _focused = focused;
		const _groupsByCc = groupsByCc;
		const _dots = dots;
		const _me = me;
		const _highlight = highlight;
		const _autoSpin = autoSpin;
		const _spinSpeed = spinSpeed;
		const _idleMs = idleMs;
		const { w, h } = size;
		if (!highRequested && (target.k > 2 || _selected)) loadHigh();
		const spinning = _autoSpin && !_selected && !dragging && !reducedMotion && performance.now() - lastInteraction > 2500;
		if (spinning) target.λ += _spinSpeed * dt;
		if (!_selected && !dragging && performance.now() - lastInteraction > _idleMs) target.k = 1;

		const ease = 1 - Math.exp(-dt * (reducedMotion ? 30 : 3.2));
		view.λ += (target.λ - view.λ) * ease;
		view.φ += (target.φ - view.φ) * ease;
		view.k += (target.k - view.k) * ease;
		flagAlpha += ((_selected ? (_focused ? 0.45 : 0.9) : 0) - flagAlpha) * (1 - Math.exp(-dt * 4));
		// nothing moved or changed: keep the last frame
		const key = `${spinning || dragging} ${view.λ.toFixed(2)} ${view.φ.toFixed(2)} ${view.k.toFixed(3)} ${w}x${h} ${hoverCc} ${_selected} ${flagAlpha.toFixed(2)} ${_dots.length} ${!!atlasImg} ${high.length} ${low.length} ${quality}`;
		if (key === lastKey && !_focused && !_me) return false;
		lastKey = key;

		const r0 = Math.min(w, h) * 0.44;
		projection.translate([w / 2, h / 2]).scale(r0 * view.k).rotate([view.λ, view.φ]);
		const path = geoPath(projection, ctx);
		// visible angular radius of the view around the centre, used to cull off-screen countries
		const center: [number, number] = [-view.λ, -view.φ];
		const viewAngle = Math.min(Math.PI / 2, Math.asin(Math.min(1, Math.hypot(w, h) / 2 / (r0 * view.k))));
		const features = (view.k > 2.4 && high.length ? high : low).filter((f) => {
			const i = info(f);
			return geoDistance(center, i.c) - i.r < viewAngle + 0.05;
		});

		ctx.clearRect(0, 0, w, h);

		// soft atmosphere
		const R = projection.scale();
		if (R < Math.max(w, h) * 1.5) {
			const key = `${w}x${h}x${Math.round(R)}`;
			if (atmKey !== key) {
				atmKey = key;
				atm = ctx.createRadialGradient(w / 2, h / 2, R * 0.92, w / 2, h / 2, R * 1.12);
				atm.addColorStop(0, 'rgba(94, 155, 196, 0.22)');
				atm.addColorStop(1, 'rgba(94, 155, 196, 0)');
			}
			ctx.fillStyle = atm!;
			ctx.fillRect(0, 0, w, h);
		}

		// ocean
		ctx.beginPath();
		path(sphere);
		ctx.fillStyle = '#0e1b14';
		ctx.fill();

		ctx.beginPath();
		path(graticule);
		ctx.strokeStyle = 'rgba(255,255,255,0.045)';
		ctx.lineWidth = 0.6;
		ctx.stroke();

		// countries – batched into three paths (others / participating / hovered) to keep fill calls low
		const others = new Path2D(),
			active = new Path2D(),
			hovered = new Path2D();
		const pathP = geoPath(projection);
		const shapes: [CountryFeature, Path2D][] = [];
		for (const f of features) {
			const cc = f.properties.cc;
			const d = pathP(f);
			if (!d) continue;
			const p2 = new Path2D(d);
			shapes.push([f, p2]);
			(cc && cc === hoverCc ? hovered : cc && _groupsByCc.has(cc) ? active : others).addPath(p2);
		}
		ctx.fillStyle = '#18291f';
		ctx.fill(others);
		ctx.fillStyle = '#22402d';
		ctx.fill(active);
		ctx.fillStyle = '#2f5a3f';
		ctx.fill(hovered);
		ctx.strokeStyle = 'rgba(160, 200, 170, 0.18)';
		ctx.lineWidth = 0.6;
		ctx.stroke(others);
		ctx.stroke(active);
		ctx.stroke(hovered);

		const settled = !spinning && !dragging && Math.abs(target.λ - view.λ) + Math.abs(target.φ - view.φ) < 0.05 && Math.abs(target.k - view.k) < 0.01;
		if (atlasImg && (quality < 2 || settled)) {
			const bounds = pathP.bounds;
			ctx.globalAlpha = _selected ? 0.18 : view.k > 2 ? 0.6 : 0.42;
			for (const [f, p2] of shapes) {
				const cc = f.properties.cc;
				if (!cc || cc === _selected || !_groupsByCc.has(cc) || atlasIndex[cc] == null) continue;
				const b = bounds(flagAreas(f).main);
				if (!isFinite(b[0][0]) || b[1][0] - b[0][0] < 4) continue;
				const r = coverRect(cc, b);
				const i = atlasIndex[cc];
				ctx.save();
				ctx.clip(p2);
				ctx.drawImage(atlasImg, (i % atlas.cols) * tileW, Math.floor(i / atlas.cols) * tileH, tileW, tileH, r.x, r.y, r.w, r.h);
				ctx.restore();
			}
			ctx.globalAlpha = 1;
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
			ctx.lineWidth = 1;
			ctx.stroke(hovered);
		}

		// _selected country: flag clipped to its outline
		const sel = findFeature(_selected) ?? (flagAlpha > 0.01 ? findFeature(lastSelected) : undefined);
		if (_selected) lastSelected = _selected;
		if (sel && flagAlpha > 0.01) {
			const img = flag(sel.properties.cc!);
			if (img) {
				const areas = flagAreas(sel);
				const bounds = geoPath(projection).bounds;
				const drawFlag = (shape: CountryFeature, b: [[number, number], [number, number]]) => {
					const r = coverRect(sel.properties.cc!, b);
					ctx.save();
					ctx.beginPath();
					path(shape);
					ctx.clip();
					ctx.drawImage(img, r.x, r.y, r.w, r.h);
					ctx.restore();
					return r;
				};
				ctx.globalAlpha = flagAlpha;
				const m = drawFlag(sel, bounds(areas.main));
				for (const area of areas.rest) {
					const b = bounds(area);
					if (!isFinite(b[0][0])) continue; // on the far side
					const inside = b[0][0] >= m.x && b[0][1] >= m.y && b[1][0] <= m.x + m.w && b[1][1] <= m.y + m.h;
					if (!inside && b[1][0] - b[0][0] + b[1][1] - b[0][1] > 1) drawFlag(area, b);
				}
				ctx.globalAlpha = 1;
			}
			ctx.beginPath();
			path(sel);
			ctx.strokeStyle = `rgba(255,255,255,${0.8 * flagAlpha})`;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		// group _dots (front hemisphere only)
		// same as projection() for each dot, without the trigonometry
		const cl = Math.cos(view.λ * rad),
			sl = Math.sin(view.λ * rad),
			cp = Math.cos(view.φ * rad),
			sp = Math.sin(view.φ * rad);
		const [tx, ty] = projection.translate(),
			sc = projection.scale();
		const base = Math.max(5, Math.min(14, 4 + view.k * 1.2));
		ctx.globalCompositeOperation = 'lighter';
		for (const d of _dots) {
			const x0 = d.x * cl - d.y * sl,
				y0 = d.x * sl + d.y * cl;
			const facing = x0 * cp - d.z * sp;
			d.vis = facing > 0.03;
			if (!d.vis) continue;
			d.px = tx + sc * y0;
			d.py = ty - sc * (d.z * cp + x0 * sp);
			if (d.px < -20 || d.py < -20 || d.px > w + 20 || d.py > h + 20) continue;
			if (_selected && d.g.cc === _selected) continue; // drawn solid below, on top of the flag
			ctx.globalAlpha = _selected ? 0.25 : 0.95;
			if (quality >= 2) {
				ctx.fillStyle = '#ecc15a';
				ctx.fillRect(d.px - 1, d.py - 1, 2, 2);
				continue;
			}
			const s = (_selected ? base * 0.6 : base) * (0.55 + 0.45 * Math.min(1, facing * 3));
			ctx.drawImage(glow, d.px - s / 2, d.py - s / 2, s, s);
		}
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';

		// groups in the _selected country: solid pins with a dark ring so they read on top of any flag
		if (_selected) {
			const pr = Math.max(2.5, Math.min(5, 1.5 + view.k * 0.25));
			ctx.fillStyle = '#ecc15a';
			ctx.strokeStyle = 'rgba(14, 27, 20, 0.85)';
			ctx.lineWidth = 1.5;
			for (const d of _dots) {
				if (!d.vis || d.g.cc !== _selected) continue;
				ctx.beginPath();
				ctx.arc(d.px, d.py, pr, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}
		}

		// _focused group: pulsing ring
		if (_focused) {
			const p = projection([_focused.lon, _focused.lat]);
			const front = geoDistance([_focused.lon, _focused.lat], [-view.λ, -view.φ]) < Math.PI / 2;
			if (p && front) {
				const t = (performance.now() / 1000) % 1.6 / 1.6;
				ctx.beginPath();
				ctx.arc(p[0], p[1], 6 + t * 18, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - t)})`;
				ctx.lineWidth = 2;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
				ctx.fillStyle = '#ffffff';
				ctx.strokeStyle = 'rgba(14, 27, 20, 0.9)';
				ctx.fill();
				ctx.stroke();
			}
		}

		// the viewer's position: blue dot + accuracy halo
		if (_me) {
			const p = projection([_me.lon, _me.lat]);
			const front = geoDistance([_me.lon, _me.lat], [-view.λ, -view.φ]) < Math.PI / 2;
			if (p && front) {
				const t = ((performance.now() / 1000) % 2) / 2;
				ctx.beginPath();
				ctx.arc(p[0], p[1], 7 + t * 16, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(96, 165, 250, ${0.35 * (1 - t)})`;
				ctx.fill();
				ctx.beginPath();
				ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
				ctx.fillStyle = '#3b82f6';
				ctx.strokeStyle = '#ffffff';
				ctx.lineWidth = 2;
				ctx.fill();
				ctx.stroke();
			}
		}

		// highlighted group
		if (_highlight) {
			for (const d of _dots) {
				if (!d.vis || d.g.name !== _highlight) continue;
				const pr = Math.max(4, Math.min(7, 3 + view.k * 0.3));
				ctx.beginPath();
				ctx.arc(d.px, d.py, pr + 3, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(229, 83, 61, 0.25)';
				ctx.fill();
				ctx.beginPath();
				ctx.arc(d.px, d.py, pr, 0, Math.PI * 2);
				ctx.fillStyle = '#e5533d';
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = 1.5;
				ctx.fill();
				ctx.stroke();
			}
		}

		// rim
		ctx.beginPath();
		path(sphere);
		ctx.strokeStyle = 'rgba(94, 155, 196, 0.45)';
		ctx.lineWidth = 1;
		ctx.stroke();
		return true;
	}
	let lastSelected: string | null = null;
	let atm: CanvasGradient | null = null;
	let atmKey = '';

	onMount(() => {
		reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		makeGlow();
		const ctx = canvas.getContext('2d')!;
		let raf = 0,
			prev = performance.now(),
			alive = true;

		const resize = () => {
			projection.precision(quality >= 1 ? 1.5 : 0.6);
			lastKey = '';
			const r = wrap.getBoundingClientRect();
			const dpr = quality >= 1 ? 1 : Math.min(2, devicePixelRatio || 1);
			size = { w: r.width, h: r.height };
			canvas.width = Math.round(r.width * dpr);
			canvas.height = Math.round(r.height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		const ro = new ResizeObserver(resize);
		ro.observe(wrap);

		Promise.all([loadTopo('/data/countries-110m.json'), fetch('/data/countries-extra.json').then((r) => r.json() as Promise<FeatureCollection<Geometry, { cc: string | null }>>)]).then(
			([f, extra]) => {
				low = [...f, ...(extra.features as CountryFeature[])];
				ready = true;
			}
		);
		const img = new Image();
		img.onload = () => (atlasImg = img);
		img.src = atlasUrl;

		let onScreen = true;
		const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
		io.observe(wrap);
		// slow machine: step the quality down, and back up once it keeps up again
		let cost = 0,
			interval = 16,
			changed = 0,
			started = performance.now(),
			odd = false;
		const loop = (now: number) => {
			if (!alive) return;
			raf = requestAnimationFrame(loop);
			if (quality >= 2 && (odd = !odd)) return;
			const dt = Math.min(0.1, (now - prev) / 1000);
			prev = now;
			if (!size.w || !low.length || !onScreen || document.hidden) return;
			const t0 = performance.now();
			if (!draw(ctx, Math.min(dt, 0.05))) return;
			cost = cost * 0.95 + (performance.now() - t0) * 0.05;
			interval = interval * 0.95 + dt * 1000 * 0.05;
			canvas.dataset.cost = cost.toFixed(1);
			// only steps down, and not while the first frames build their caches, so it never flips back and forth
			if (now - started < 6000) return;
			if ((cost > 20 || interval > (quality >= 2 ? 80 : 50)) && quality < 2 && now - changed > 4000) {
				quality++;
				changed = now;
				cost = 0;
				interval = 16;
				resize();
				canvas.dataset.quality = String(quality);
			}
		};
		raf = requestAnimationFrame(loop);
		canvas.addEventListener('wheel', onWheel, { passive: false });

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			clearTimeout(idleTimer);
			canvas.removeEventListener('wheel', onWheel);
		};
	});
</script>

<div bind:this={wrap} class={cn('bg-fixed-dark relative touch-none overflow-hidden select-none', className)}>
	<canvas
		bind:this={canvas}
		class="absolute inset-0 size-full cursor-grab active:cursor-grabbing"
		onpointerdown={onDown}
		onpointermove={onMove}
		onpointerup={onUp}
		ondblclick={onDblClick}
		onpointercancel={onUp}
		onpointerleave={() => ((hover = null), (hoverCc = null))}
		aria-label="Interactive globe of registered scout groups"
	></canvas>

	{#if hover}
		<div
			class="bg-fixed-light text-fixed-dark pointer-events-none absolute z-10 max-w-64 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md px-2.5 py-1.5 text-xs shadow-md"
			style:left="{hover.x}px"
			style:top="{hover.y}px"
		>
			<div class="truncate font-semibold">{hover.title}</div>
			{#if hover.sub}<div class="text-fixed-dark/65 truncate">{hover.sub}</div>{/if}
		</div>
	{/if}

	{#if controls}
		<div class="absolute right-3 bottom-[4.5rem] flex flex-col gap-1 md:bottom-3">
			{#each [{ icon: Plus, label: 'Zoom in', fn: () => zoomBy(1.6) }, { icon: Minus, label: 'Zoom out', fn: () => zoomBy(1 / 1.6) }, { icon: RotateCcw, label: 'Reset view', fn: reset }] as b (b.label)}
				<button
					type="button"
					onclick={b.fn}
					aria-label={b.label}
					title={b.label}
					class="text-fixed-light grid size-9 place-items-center rounded-md border border-white/10 bg-white/5 backdrop-blur transition-colors hover:bg-white/15"
				>
					<b.icon class="size-4" />
				</button>
			{/each}
		</div>
		<p class="text-fixed-light/60 pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs backdrop-blur sm:block">
			Drag to spin · scroll to zoom · click a country
		</p>
	{/if}
</div>
