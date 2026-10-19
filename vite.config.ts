import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

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

export default defineConfig(({ mode }) => {
	const grafana = process.env.GRAFANA_URL ?? loadEnv(mode, process.cwd(), '').GRAFANA_URL ?? '';
	return {
		plugins: [tailwindcss(), svelte(), grafanaNotice(grafana)],
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
