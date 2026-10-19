import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { YearInfo } from '#lib/data.ts';
import { countryName, distanceKm, groupPath, wosmRegions } from '#lib/data.ts';

const DATA = join(process.cwd(), 'static', 'data');
const read = <T>(f: string, fallback: T): T => (existsSync(join(DATA, f)) ? JSON.parse(readFileSync(join(DATA, f), 'utf8')) : fallback);

export type G = { id: number; key: number; name: string; city: string; cc: string; lat: number; lon: number; approx: boolean };
type P = { jid: string; participants: number | null; org: string };
type Year = { info: YearInfo; snapshot: string; groups: G[]; profiles: Map<number, P> };

let cache: Year[] | null = null;
/** Every year, newest first */
export function years(): Year[] {
	if (cache) return cache;
	const list: YearInfo[] = read<{ years: YearInfo[] }>('years.json', { years: [] }).years.sort((a, b) => b.year - a.year);
	cache = list.map((info) => {
		const g = read<{ snapshot: string; groups: [number, string, string, string, number, number, number][] }>(`${info.year}/groups.json`, { snapshot: '', groups: [] });
		const keys = read<Record<string, number>>(`${info.year}/keys.json`, {});
		const prof = read<{ groups: Record<string, [string, number | null, string]> }>(`${info.year}/profiles.json`, { groups: {} }).groups;
		return {
			info,
			snapshot: g.snapshot,
			groups: g.groups.map(([id, name, city, cc, lat, lon, approx]) => ({ id, key: keys[id] ?? id, name, city, cc, lat, lon, approx: !!approx })),
			profiles: new Map(Object.entries(prof).map(([id, [jid, participants, org]]) => [+id, { jid, participants, org }]))
		};
	});
	return cache;
}

/** The newest version of every group that ever took part, for the sitemap and prerendering */
export function allGroups() {
	const seen = new Map<number, G>();
	for (const y of years()) for (const g of y.groups) if (!seen.has(g.key)) seen.set(g.key, g);
	return [...seen.values()];
}
export const allCountries = () => [...new Set(years().flatMap((y) => y.groups.map((g) => g.cc)))].sort();

export function groupView(key: number) {
	const ys = years();
	const seen = ys.flatMap((y) => {
		const g = y.groups.find((x) => x.key === key);
		const p = g && y.profiles.get(g.id);
		return g ? [{ year: y.info, name: g.name, jid: p?.jid ?? '', participants: p?.participants ?? null, org: p?.org ?? '' }] : [];
	});
	if (!seen.length) return null;
	const y = ys.find((y) => y.groups.some((x) => x.key === key))!;
	const group = y.groups.find((x) => x.key === key)!;
	const nearby = y.groups
		.filter((g) => g.id !== group.id && !g.approx)
		.map((g) => ({ key: g.key, name: g.name, city: g.city, cc: g.cc, km: Math.round(distanceKm(group, g) * 10) / 10 }))
		.sort((a, b) => a.km - b.km)
		.slice(0, 8);
	return { group, path: groupPath(group), seen, nearby, wosm: seen[0].jid ? (wosmRegions[seen[0].jid[0]] ?? null) : null };
}

export function countryView(cc: string) {
	const y = years()[0];
	if (!y) return null;
	const n = (g: G) => y.profiles.get(g.id)?.participants ?? 0;
	const gs = y.groups.filter((g) => g.cc === cc);
	if (!gs.length) return null;
	const totals = new Map<string, number>();
	for (const g of y.groups) totals.set(g.cc, (totals.get(g.cc) ?? 0) + n(g));
	const places = new Map<string, number>();
	for (const g of gs) if (g.city && !g.approx && !/\d/.test(g.city)) places.set(g.city, (places.get(g.city) ?? 0) + 1);
	const participants = gs.reduce((a, g) => a + n(g), 0);
	return {
		cc,
		name: countryName(cc),
		year: y.info,
		groups: gs.length,
		participants,
		capped: gs.some((g) => n(g) >= 1000),
		rank: [...totals.values()].filter((v) => v > participants).length + 1,
		countries: totals.size,
		orgs: new Set(gs.map((g) => y.profiles.get(g.id)?.org).filter(Boolean)).size,
		largest: gs
			.map((g) => ({ key: g.key, name: g.name, city: g.city, cc: g.cc, n: n(g) }))
			.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
			.slice(0, 12),
		places: [...places].sort((a, b) => b[1] - a[1]).slice(0, 6)
	};
}

/** Headline numbers for the newest year, so /stats has real text before its charts load */
export function summary() {
	const y = years()[0];
	if (!y) return null;
	const byCc = new Map<string, { groups: number; participants: number }>();
	let participants = 0;
	for (const g of y.groups) {
		const n = y.profiles.get(g.id)?.participants ?? 0;
		participants += n;
		const c = byCc.get(g.cc) ?? byCc.set(g.cc, { groups: 0, participants: 0 }).get(g.cc)!;
		c.groups++;
		c.participants += n;
	}
	return {
		year: y.info,
		groups: y.groups.length,
		participants,
		countries: byCc.size,
		top: [...byCc]
			.sort((a, b) => b[1].participants - a[1].participants)
			.slice(0, 10)
			.map(([cc, v]) => ({ cc, name: countryName(cc), ...v }))
	};
}
