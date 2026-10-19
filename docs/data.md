# Data

Each JOTA-JOTI year has its own folder in `static/data/<year>/`, listed in `static/data/years.json`. The globe shows
the newest year unless another is picked; the statistics and the group pages use them all.

| File | Contents |
|---|---|
| `groups.json` | Every group in the public directory: id, name, town, country, position |
| `profiles.json` | From each group's public profile: JID, number of participants, organisation |
| `keys.json` | Groups found in an earlier year, so they keep the same page |

Only these fields are read from the directory. E-mail addresses, social media links and other contact details on the
profiles are left alone.

## A new year

```sh
pnpm data:groups     # directory → static/data/<this year>/groups.json, adds the year to years.json, rebuilds the flags
pnpm data:profiles   # JID, participants and organisation → profiles.json, then keys.json (slow: one page per group)
```

Then check the weekend dates the script guessed in `years.json`.

Groups sign up again every year with a new directory id (and often a new JID). `scripts/link-years.mjs` matches them to
earlier years by JID, or by name in the same country, and `keys.json` keeps their first id, so a group's page URL stays
the same from year to year.

## Locations

`scripts/geocode-groups.mjs` places each group from its town name with GeoNames (city, then region, then
municipality). Groups whose town can't be found are put at a random spot inside their country and shown as
"approximate".
