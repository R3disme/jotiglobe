// Writes public/data/<year>/jids.json ({ "<gid>": "<group JID>" }) from scripts/.cache/group-jids.json
// (scraped from the public group profiles). Shown on the group pages and used for the WOSM regions on /stats.
// Usage: node scripts/build-group-jids.mjs [year] [path/to/group-jids.json]
import fs from 'fs';
const src = JSON.parse(fs.readFileSync(process.argv[3] ?? 'scripts/.cache/group-jids.json', 'utf8'));
const out = {};
for (const [gid, jid] of Object.entries(src)) {
	const j = String(jid ?? '').trim().toUpperCase();
	if (/^[1-6][A-Z]{2}[0-9A-Z]{2,4}[A-Z]{2,3}$/.test(j)) out[gid] = j;
}
const year = +(process.argv[2] ?? new Date().getUTCFullYear());
fs.mkdirSync(`public/data/${year}`, { recursive: true });
fs.writeFileSync(`public/data/${year}/jids.json`, JSON.stringify(out));
console.log(`${year}/jids.json: ${Object.keys(out).length} groups`);
