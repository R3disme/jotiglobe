# Development

You need Node.js 22 or newer and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev        # http://localhost:5180
pnpm check      # types and Svelte checks
pnpm build      # prerenders every page to build/
pnpm preview    # serves build/ with the same security headers as the server
```

Without `GRAFANA_URL` set, `pnpm dev` says so in the console: the site then collects no usage statistics, and the
privacy notice leaves that part out. Everything else works the same (see [deployment](deployment.md)).

## How it's built

SvelteKit 3 with `adapter-static`. Every page is prerendered at build time, so search engines and visitors without
JavaScript get real HTML, and the server only serves plain files. `#lib/*` imports point at `src/lib/*`.

| Path | What it is |
|---|---|
| `src/routes/+page.svelte` | The globe (`/?year=2026`, `/?country=NO`) |
| `src/routes/stats/` | Statistics (`?year=`, `?country=`, `?by=groups`) |
| `src/routes/(explore)/` | Country pages `/countries/<CC>` and group pages `/groups/<name>-<id>`, sharing the globe on the right |
| `src/routes/+error.svelte` | In-app errors, with the same scout scenes as the server's error pages |
| `src/routes/sitemap.xml/` | The sitemap, built from every country and group |
| `src/lib/scout-globe.svelte` | The canvas globe (flags, dots, quality that steps down on slow machines) |
| `src/lib/server/data.ts` | Reads `static/data` at build time for the prerendered pages |
| `src/lib/error-pages.js` | The error page texts and illustrations, used by the server pages and `+error.svelte` |
| `static/data/` | Groups, profiles and maps per year (see [data](data.md)) |
| `scripts/` | Data scripts, the flag atlas and the error pages |
| `deploy/` | nginx config, server setup and monitoring (see [deployment](deployment.md)) |

The globe has to run on old laptops too: it draws only when something changes, projects the group dots without
trigonometry, and lowers its quality (resolution, then plain dots and 30 fps) if frames are slow. Flags come from one
WebP atlas (`scripts/build-flags.mjs`) instead of an image per country.
