import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { errorIndex, errorPage, errors } from './scripts/error-pages.mjs';

// Same security headers as deploy/nginx-jotiglobe.conf, so `pnpm preview` shows CSP problems before deploying.
const CSP =
	"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function grafanaNotice(grafana: string): Plugin {
	const say = (log: (msg: string) => void) =>
		grafana
			? log(`Usage statistics on, Grafana: ${grafana}`)
			: log(
					'No Grafana configured (GRAFANA_URL), so usage statistics are not collected.\n' +
						'Country and group statistics are still shown: they come from public/data/<year>/ and are fetched with\n' +
						'scripts/scrape-directory.mjs, scripts/geocode-groups.mjs and scripts/scrape-profiles.mjs (pnpm data:groups, pnpm data:profiles).'
				);
	return {
		name: 'grafana-notice',
		configureServer: (s) => say((m) => s.config.logger.info(`\n${m}\n`)),
		configurePreviewServer: (s) => say((m) => s.config.logger.info(`\n${m}\n`))
	};
}

const appRoute = /^\/(?:stats|groups\/[^/]+|countries\/[A-Za-z]{2})?\/?$/;

function errorPages(): Plugin {
	const handler =
		(dirs: string[]): Connect.NextHandleFunction =>
		(req, res, next) => {
			const path = (req.url ?? '/').split('?')[0];
			if (/^\/errors\/?$/.test(path)) {
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
				return void res.end(errorIndex());
			}
			const forced = /^\/errors\/(\d{3})\/?$/.exec(path)?.[1];
			const lost = !forced && req.method === 'GET' && req.headers.accept?.includes('text/html') && !appRoute.test(path) && !dirs.some((d) => existsSync(join(d, path)));
			if (!forced && !lost) return next();
			const code = forced && forced in errors ? +forced : 404;
			res.statusCode = code;
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.end(errorPage(code));
		};
	return {
		name: 'error-pages',
		configureServer: (s) => void s.middlewares.use(handler([s.config.root, s.config.publicDir])),
		configurePreviewServer: (s) => void s.middlewares.use(handler([s.config.build.outDir])),
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: '_errors/index.html', source: errorIndex() });
			for (const code of Object.keys(errors)) this.emitFile({ type: 'asset', fileName: `_errors/${code}.html`, source: errorPage(+code) });
		}
	};
}

function precompress(): Plugin {
	let out = 'dist';
	const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
	return {
		name: 'precompress',
		apply: 'build',
		configResolved: (c) => void (out = c.build.outDir),
		closeBundle() {
			for (const f of walk(out)) {
				if (!['.html', '.js', '.css', '.json', '.svg', '.txt', '.xml'].includes(extname(f)) || statSync(f).size < 1024) continue;
				const data = readFileSync(f);
				writeFileSync(`${f}.gz`, gzipSync(data, { level: 9 }));
				writeFileSync(`${f}.br`, brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: data.length } }));
			}
		}
	};
}

export default defineConfig(({ mode }) => {
	const grafana = process.env.GRAFANA_URL ?? loadEnv(mode, process.cwd(), '').GRAFANA_URL ?? '';
	return {
		plugins: [tailwindcss(), svelte(), grafanaNotice(grafana), errorPages(), precompress()],
		define: { __USAGE_STATS__: JSON.stringify(!!grafana) },
		server: { port: 5180 },
		preview: {
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
