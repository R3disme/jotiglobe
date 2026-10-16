import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Same security headers as deploy/nginx-jotiglobe.conf, so `pnpm preview` shows CSP problems before deploying.
const CSP =
	"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
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
});
