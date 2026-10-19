# JotiGlobe

A globe of the scout groups signed up for JOTA-JOTI, made by 1st Sandnes Scout Group. It runs in the browser
and stores nothing about visitors.

Website: https://jotiglobe.narluga-tuna.ts.net

The public website "JotiGlobe" is not updated solely from this repo. I update it manually, for security.

```sh
pnpm install
pnpm dev
```

Pages: `/` the globe (`/?country=NO` opens a country), `/stats` statistics with a year picker (`/stats?year=2026`),
`/groups/<name>-<id>` one group with its JID and a link to its profile on jotajoti.info.

## A new year

Each JOTA-JOTI year has its own folder in `public/data/<year>/`, listed in `public/data/years.json`. The globe shows
the newest year; `/stats` and the group pages use them all.

```sh
pnpm data:groups                    # directory → public/data/<this year>/groups.json, adds the year to years.json
pnpm data:jids                      # group JIDs → public/data/<this year>/jids.json (slow: one page per group)
python3 scripts/export-contacts.py /path/to/joti-kontakter.db 2026   # optional: contact totals per country
```

Check the weekend dates the script guessed in `years.json`. `contacts.json` is optional; without it `/stats` leaves
out the contacts part. It only holds totals per country (no group ids, patrols or notes).

Changes go through pull requests. Group list from the public directory on jotajoti.info; map data Natural Earth,
places GeoNames (CC BY 4.0), flags flag-icons (MIT). Code under the MIT licence.
