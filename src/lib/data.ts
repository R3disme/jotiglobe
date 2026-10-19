import type { Group } from './scout-globe.svelte';
import { countries } from './countries';

type GroupsFile = { snapshot: string; fields: string[]; groups: [number, string, string, string, number, number, number][] };

export type YearInfo = { year: number; start: string; end: string };


const cache = new Map<string, Promise<unknown>>();
function get<T>(url: string, optional = false): Promise<T> {
	if (!cache.has(url))
		cache.set(
			url,
			fetch(url).then((r) => {
				if (optional && (r.status === 404 || !r.headers.get('content-type')?.includes('json'))) return null;
				if (r.ok) return r.json();
				throw new Error(`${url}: ${r.status}`);
			})
		);
	return cache.get(url) as Promise<T>;
}

export async function loadYears() {
	const d = await get<{ years: YearInfo[] }>('/data/years.json');
	return [...d.years].sort((a, b) => b.year - a.year);
}

export async function loadGroups(year: number) {
	const [d, key] = await Promise.all([get<GroupsFile>(`/data/${year}/groups.json`), loadKeys(year)]);
	return {
		snapshot: d.snapshot,
		groups: d.groups.map(([id, name, city, cc, lat, lon, approx]) => ({ id, key: key(id), name, city, cc, lat, lon, approx: !!approx }) as Group)
	};
}

export type Profile = { jid: string; participants: number | null; org: string };
export async function loadProfiles(year: number) {
	const d = await get<{ groups: Record<string, [string, number | null, string]> } | null>(`/data/${year}/profiles.json`, true);
	const m = new Map<number, Profile>();
	for (const [id, [jid, participants, org]] of Object.entries(d?.groups ?? {})) m.set(+id, { jid, participants, org });
	return m;
}

async function loadKeys(year: number) {
	const d = (await get<Record<string, number> | null>(`/data/${year}/keys.json`, true)) ?? {};
	return (id: number) => d[id] ?? id;
}


export function groupPath(g: { key: number; name: string }) {
	const slug = g.name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/, '');
	return `/groups/${slug ? `${slug}-` : ''}${g.key}`;
}
export const groupKeyFromPath = (path: string) => {
	const m = /^\/groups\/(?:.*-)?(\d+)\/?$/.exec(path);
	return m ? +m[1] : null;
};

export const wosmRegions: Record<string, string> = {
	'1': 'Africa',
	'2': 'Arab',
	'3': 'Asia-Pacific',
	'4': 'Eurasia',
	'5': 'European',
	'6': 'Interamerican'
};

const display = new Intl.DisplayNames(['en'], { type: 'region' });
const meta = new Map(countries.map((c) => [c.code, c]));
export const countryName = (cc: string) => {
	if (cc === 'TW') return 'Taiwan';
	try {
		return display.of(cc) ?? cc;
	} catch {
		return cc;
	}
};
export const countryRegion = (cc: string) => meta.get(cc)?.region ?? 'Other';

/** Great-circle distance in km */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
	const r = Math.PI / 180;
	const dφ = (b.lat - a.lat) * r,
		dλ = (b.lon - a.lon) * r;
	const h = Math.sin(dφ / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dλ / 2) ** 2;
	return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const SITE = 'https://jotiglobe.narluga-tuna.ts.net';
export const fmt = (n: number) => n.toLocaleString('en-GB');
// the directory doesn't take more than 1,000 participants per group
export const fmtParticipants = (n: number) => (n >= 1000 ? '1,000+' : fmt(n));
/** a sum that includes a group at the maximum, so the real number may be higher */
export const fmtSum = (n: number, approx: boolean) => (approx ? `~${fmt(n)}` : fmt(n));
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export function fmtWeekend(y: YearInfo) {
	const s = new Date(y.start),
		e = new Date(y.end);
	const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });
	return month(s) === month(e)
		? `${s.getDate()}–${e.getDate()} ${month(e)} ${y.year}`
		: `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${y.year}`;
}
