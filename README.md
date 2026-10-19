# JotiGlobe

A globe of the scout groups signed up for JOTA-JOTI, made by 1st Sandnes Scout Group. It runs in the browser
and keeps only anonymous usage statistics (pages opened, no IP addresses or browser details, deleted after 30 days).

Website: https://jotiglobe.narluga-tuna.ts.net

The public website "JotiGlobe" is not updated solely from this repo. I update it manually, for security.

```sh
pnpm install
pnpm dev
```

SvelteKit with `adapter-static`: every page is prerendered to `build/` (`pnpm build`), so search engines get real HTML
and nginx serves plain files. `#lib/*` is `src/lib/*`.

Pages: `/` the globe (`/?year=2026`, `/?country=NO`), `/stats` (`?year=`, `?country=`, `?by=groups`),
`/countries/<CC>` one country, `/groups/<name>-<id>` one group across the years, `/sitemap.xml`, `/errors` all error pages.

## A new year

Each JOTA-JOTI year has its own folder in `static/data/<year>/`, listed in `static/data/years.json`. The globe shows
the newest year unless another is picked; `/stats` and the group pages use them all.

```sh
pnpm data:groups                    # directory → static/data/<this year>/groups.json, adds the year to years.json
pnpm data:profiles                  # JID, participants, organisation → profiles.json, then keys.json (slow: one page per group)
```

Check the weekend dates the script guessed in `years.json`. Groups sign up again every year with a new directory id
(and often a new JID), so `scripts/link-years.mjs` matches them to earlier years by JID, or by name in the same country,
and `keys.json` keeps their first id: the group page URL then stays the same.

## Usage statistics (optional)

Without `GRAFANA_URL` the site collects nothing and the privacy notice says nothing about it. With it (in `.env` when
building), each page view sends an anonymous `/hit` that nginx logs without IP, user agent or referrer.

```sh
bash deploy/monitoring/setup.sh   # on the server: Prometheus, Loki, Alloy, exporters (30 days)
GRAFANA_URL=… GRAFANA_TOKEN=… JG_IP=… OWNER=… deploy/monitoring/grafana.sh   # data sources, private folder, dashboard
```

Changes go through pull requests. Group list from the public directory on jotajoti.info; map data Natural Earth,
places GeoNames (CC BY 4.0), flags flag-icons (MIT). Code under the MIT licence.
