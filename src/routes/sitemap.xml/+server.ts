import { SITE, groupPath } from '#lib/data.ts';
import { allCountries, allGroups, years } from '#lib/server/data.ts';

export const prerender = true;

export function GET() {
	const lastmod = years()[0]?.snapshot || new Date().toISOString().slice(0, 10);
	const url = (path: string, priority: number) => `<url><loc>${SITE}${path}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`;
	const urls = [url('/', 1), url('/stats', 0.8), ...allCountries().map((cc) => url(`/countries/${cc}`, 0.6)), ...allGroups().map((g) => url(groupPath(g), 0.4))];
	return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
		headers: { 'Content-Type': 'application/xml' }
	});
}
