import { browser } from '$app/env';
import { goto } from '$app/navigation';
import { page } from '$app/state';

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

// anonymous page view count, see the privacy notice
export function countView(path: string, entry = false) {
	if (!__USAGE_STATS__) return;
	try {
		fetch(`/hit?p=${encodeURIComponent(path)}${entry ? '&e=1' : ''}`, { method: 'GET', keepalive: true, cache: 'no-store' }).catch(() => {});
	} catch {}
}
