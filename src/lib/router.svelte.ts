// A tiny client-side router: a few pages, plain <a href> links. nginx (and Vite) serve index.html for any path.
export const route = $state({ path: location.pathname, search: location.search });

export function navigate(href: string, replace = false) {
	const u = new URL(href, location.href);
	if (replace) history.replaceState(null, '', u);
	else history.pushState(null, '', u);
	route.path = u.pathname;
	route.search = u.search;
	if (!replace) window.scrollTo(0, 0);
}

/** Updates the query string of the current page without adding a history entry */
export function setParams(params: Record<string, string | null>) {
	const u = new URL(location.href);
	for (const [k, v] of Object.entries(params)) v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v);
	if (u.search === location.search) return;
	history.replaceState(null, '', u);
	route.search = u.search;
}

addEventListener('popstate', () => {
	route.path = location.pathname;
	route.search = location.search;
});

// Same-origin page links are handled here instead of reloading the page (and its data)
addEventListener('click', (e) => {
	if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	const a = (e.target as Element | null)?.closest?.('a');
	if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
	if (/^\/(data|flags)\//.test(a.pathname) || /\.\w+$/.test(a.pathname)) return;
	e.preventDefault();
	navigate(a.href);
});
