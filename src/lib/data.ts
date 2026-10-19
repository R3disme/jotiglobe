import type { Group } from './scout-globe.svelte';
import { countries } from './countries';

type GroupsFile = { snapshot: string; fields: string[]; groups: [number, string, string, string, number, number, number][] };

/** One JOTA-JOTI weekend. Listed in public/data/years.json; each year's files live in public/data/<year>/. */
export type YearInfo = { year: number; start: string; end: string };

/** Contacts logged in JOTI-kontakter, aggregated per country (scripts/export-contacts.py). Optional per year. */
export type ContactStats = {
	year: number;
	groups_registered: number;
	groups_logging: number;
	contacts: number;
	entries: number;
	modes: Record<string, number>;
	countries: Record<string, number>;
	pairs: [string, string, number][];
	days: Record<string, number>;
};

// Every file is same origin and cached per year, so moving between pages doesn't fetch it again.
const cache = new Map<string, Promise<unknown>>();
function get<T>(url: string, optional = false): Promise<T> {
	if (!cache.has(url))
		cache.set(
			url,
			fetch(url).then((r) => {
				if (r.ok) return r.json();
				if (optional && r.status === 404) return null;
				throw new Error(`${url}: ${r.status}`);
			})
		);
	return cache.get(url) as Promise<T>;
}

/** All years with data, newest first */
export async function loadYears() {
	const d = await get<{ years: YearInfo[] }>('/data/years.json');
	return [...d.years].sort((a, b) => b.year - a.year);
}

/** Loads a year's directory snapshot shipped with the site – same origin, nothing third-party. */
export async function loadGroups(year: number) {
	const d = await get<GroupsFile>(`/data/${year}/groups.json`);
	return {
		snapshot: d.snapshot,
		groups: d.groups.map(([id, name, city, cc, lat, lon, approx]) => ({ id, name, city, cc, lat, lon, approx: !!approx }) as Group)
	};
}

/** Group id → group JID, from the public group profiles. Missing for a year → empty. */
export const loadJids = async (year: number) => (await get<Record<string, string> | null>(`/data/${year}/jids.json`, true)) ?? {};

export const loadContacts = (year: number) => get<ContactStats | null>(`/data/${year}/contacts.json`, true);

/** Public profile of a group on jotajoti.info. Only a link – the site never fetches it. */
export const groupUrl = (id: number) => `https://jotajoti.info/scouts_group/${id}`;

/** Our own page for a group: /groups/<name>-<id>. The id at the end is what counts; the name is for people and search engines. */
export function groupPath(g: { id: number; name: string }) {
	const slug = g.name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/, '');
	return `/groups/${slug ? `${slug}-` : ''}${g.id}`;
}
export const groupIdFromPath = (path: string) => {
	const m = /^\/groups\/(?:.*-)?(\d+)\/?$/.exec(path);
	return m ? +m[1] : null;
};

/** WOSM region, from the first digit of a group JID */
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

export const fmt = (n: number) => n.toLocaleString('en-GB');
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
/** "16–18 October 2026" */
export function fmtWeekend(y: YearInfo) {
	const s = new Date(y.start),
		e = new Date(y.end);
	const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });
	return month(s) === month(e)
		? `${s.getDate()}–${e.getDate()} ${month(e)} ${y.year}`
		: `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${y.year}`;
}
