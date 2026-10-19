import { browser } from '$app/env';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { privacy, globePerf } from './privacy.svelte.ts';

export const route = {
	get path() {
		return page.url.pathname;
	},
	// query strings only exist in the browser; prerendered pages are built without them
	get search() {
		return browser ? page.url.search : '';
	}
};

export const navigate = (href: string, replace = false) => goto(href, { replace });

/** Updates the query string of the current page without adding a history entry */
export function setParams(params: Record<string, string | null>) {
	if (!browser) return;
	const u = new URL(page.url.href);
	for (const [k, v] of Object.entries(params)) v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v);
	if (u.search === page.url.search) return;
	goto(u, { replace: true, reset: false });
}

const send = (q: string) => {
	try {
		fetch(`/hit?${q}`, { method: 'GET', keepalive: true, cache: 'no-store' }).catch(() => {});
	} catch {}
};

// anonymous statistics, see the privacy notice: without opting in only "someone visited", never which pages
export function countView(path: string, entry = false) {
	if (!__USAGE_STATS__) return;
	if (!privacy.stats) {
		if (entry) send('e=1');
		return;
	}
	let first = entry;
	if (entry)
		try {
			// a note with today's date, so a second visit the same day isn't counted as a new one; it never leaves the browser
			const today = new Date().toISOString().slice(0, 10);
			first = localStorage.getItem('jotiglobe:counted') !== today;
			localStorage.setItem('jotiglobe:counted', today);
		} catch {}
	send(`p=${encodeURIComponent(path)}${first ? '&e=1' : ''}`);
}

let perfSent = false;
export function countPerf() {
	if (!__USAGE_STATS__ || perfSent || globePerf.frames < 60) return;
	perfSent = true;
	send(`perf=1&q=${globePerf.quality}&ms=${globePerf.cost.toFixed(1)}&fps=${Math.round(globePerf.fps)}`);
}
