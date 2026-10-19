#!/usr/bin/env python3
"""Exports the contacts logged in JOTI-kontakter as totals per country -> public/data/<year>/contacts.json for /stats.

Only counts leave the database: no group ids, patrols, notes or times of day.
Usage: python3 scripts/export-contacts.py path/to/joti-kontakter.db [year]   (default year: this year)
Run it in the jotiglobe repo; groups come from public/data/<year>/groups.json.
"""
import json
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

db = sys.argv[1]
year = int(sys.argv[2]) if len(sys.argv) > 2 else datetime.now(timezone.utc).year
out = Path(f"public/data/{year}/contacts.json")
cc_of = {g[0]: g[3] for g in json.loads(Path(f"public/data/{year}/groups.json").read_text())["groups"]}


def cc(gid):
    # "no group" entries in JOTI-kontakter: gid = 900000 + letter1 * 26 + letter2 of the country code
    if gid >= 900000:
        n = gid - 900000
        return chr(65 + n // 26) + chr(65 + n % 26)
    return cc_of.get(gid)


con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
contacts = con.execute("SELECT id, a, b FROM contacts WHERE year=?", (year,)).fetchall()
entries = con.execute(
    "SELECT e.by_gid, e.mode, substr(e.created_at, 1, 10) FROM entries e JOIN contacts c ON c.id = e.contact_id WHERE c.year=?",
    (year,)).fetchall()

countries, pairs = Counter(), Counter()
for _, a, b in contacts:
    ca, cb = cc(a), cc(b)
    if not ca or not cb:
        continue
    for x in {ca, cb}:
        countries[x] += 1
    pairs[tuple(sorted((ca, cb)))] += 1

stats = {
    "year": year,
    "groups_registered": con.execute("SELECT COUNT(*) FROM groups WHERE year=?", (year,)).fetchone()[0],
    "groups_logging": len({e[0] for e in entries}),
    "contacts": len(contacts),
    "entries": len(entries),
    "modes": dict(Counter(e[1] for e in entries).most_common()),
    "countries": dict(countries.most_common()),
    "pairs": [[a, b, n] for (a, b), n in pairs.most_common(50)],
    "days": dict(sorted(Counter(e[2] for e in entries).items())),
}
out.write_text(json.dumps(stats, ensure_ascii=False) + "\n")
print(f"{out}: {stats['contacts']} contacts, {stats['entries']} entries, {len(countries)} countries")
