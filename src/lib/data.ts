import type { Group } from './scout-globe.svelte';
import { countries } from './countries';

type GroupsFile = { snapshot: string; fields: string[]; groups: [number, string, string, string, number, number, number][] };

/** Loads the directory snapshot shipped with the site (public/data/groups.json) – same origin, nothing third-party. */
export async function loadGroups() {
	const d = (await (await fetch('/data/groups.json')).json()) as GroupsFile;
	return {
		snapshot: d.snapshot,
		groups: d.groups.map(([id, name, city, cc, lat, lon, approx]) => ({ id, name, city, cc, lat, lon, approx: !!approx }) as Group)
	};
}

/** Public profile of a group on jotajoti.info. Only a link – the site never fetches it. */
export const groupUrl = (id: number) => `https://jotajoti.info/scouts_group/${id}`;

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
