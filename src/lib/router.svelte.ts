export const route = $state({ path: location.pathname, search: location.search });

// anonymous page view count, see the privacy notice
function countView(path: string, entry = false) {
	if (!__USAGE_STATS__) return;
	try {
		fetch(`/hit?p=${encodeURIComponent(path)}${entry ? '&e=1' : ''}`, { method: 'GET', keepalive: true, cache: 'no-store' }).catch(() => {});
	} catch {}
}
countView(location.pathname, true);

export function navigate(href: string, replace = false) {
	const u = new URL(href, location.href);
	if (replace) history.replaceState(null, '', u);
	else history.pushState(null, '', u);
	if (u.pathname !== route.path && !replace) countView(u.pathname);
	route.path = u.pathname;
	route.search = u.search;
	if (!replace) window.scrollTo(0, 0);
}

export function setParams(params: Record<string, string | null>) {
	const u = new URL(location.href);
	for (const [k, v] of Object.entries(params)) v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v);
	if (u.search === location.search) return;
	history.replaceState(null, '', u);
	route.search = u.search;
}

addEventListener('popstate', () => {
	if (location.pathname !== route.path) countView(location.pathname);
	route.path = location.pathname;
	route.search = location.search;
});

addEventListener('click', (e) => {
	if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	const a = (e.target as Element | null)?.closest?.('a');
	if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
	if (/^\/(data|flags)\//.test(a.pathname) || /\.\w+$/.test(a.pathname)) return;
	e.preventDefault();
	navigate(a.href);
});
