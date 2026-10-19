import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import { errorIndex, errorPage, errors } from './src/lib/error-pages.js';

// Same security headers as deploy/nginx-jotiglobe.conf, so `pnpm preview` shows CSP problems before deploying.
// Inline scripts are further limited to SvelteKit's own, by hash, in each page's CSP meta tag.
const CSP =
	"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function grafanaNotice(grafana: string): Plugin {
	const say = (log: (msg: string) => void) =>
		grafana
			? log(`Usage statistics on, Grafana: ${grafana}`)
			: log(
					'No Grafana configured (GRAFANA_URL), so usage statistics are not collected.\n' +
						'Country and group statistics are still shown: they come from static/data/<year>/ and are fetched with\n' +
						'scripts/scrape-directory.mjs, scripts/geocode-groups.mjs and scripts/scrape-profiles.mjs (pnpm data:groups, pnpm data:profiles).'
				);
	return {
		name: 'grafana-notice',
		configureServer: (s) => say((m) => s.config.logger.info(`\n${m}\n`)),
		configurePreviewServer: (s) => say((m) => s.config.logger.info(`\n${m}\n`))
	};
}

// nginx serves these in production (deploy/nginx-jotiglobe.conf); this does the same for dev and preview
function errorPages(): Plugin {
	const handler: Connect.NextHandleFunction = (req, res, next) => {
		const path = (req.url ?? '/').split('?')[0];
		const forced = /^\/errors\/(\d{3})\/?$/.exec(path)?.[1];
		if (!forced && !/^\/errors\/?$/.test(path)) return next();
		res.statusCode = forced ? (forced in errors ? +forced : 404) : 200;
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.end(forced ? errorPage(res.statusCode) : errorIndex());
	};
	return {
		name: 'error-pages',
		configureServer: (s) => void s.middlewares.use(handler),
		configurePreviewServer: (s) => void s.middlewares.use(handler)
	};
}

export default defineConfig(({ mode }) => {
	const grafana = process.env.GRAFANA_URL ?? loadEnv(mode, process.cwd(), '').GRAFANA_URL ?? '';
	return {
		plugins: [
			tailwindcss(),
			errorPages(),
			grafanaNotice(grafana),
			sveltekit({
				adapter: adapter({ precompress: true }),
				csp: { mode: 'hash', directives: { 'script-src': ['self'] } },
				prerender: { handleHttpError: 'warn' }
			})
		],
		define: { __USAGE_STATS__: JSON.stringify(!!grafana) },
		server: { port: 5180 },
		preview: {
			port: 5180,
			headers: {
				'Content-Security-Policy': CSP,
				'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), interest-cohort=()',
				'Referrer-Policy': 'no-referrer',
				'X-Content-Type-Options': 'nosniff'
			}
		},
		build: { assetsInlineLimit: 0 }
	};
});
