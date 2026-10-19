// Usage: node scripts/link-years.mjs [year]
import fs from 'fs';
const year = +(process.argv[2] ?? new Date().getUTCFullYear());
const read = (f, fallback) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const years = read('public/data/years.json', { years: [] }).years.map((y) => y.year).filter((y) => y < year).sort((a, b) => b - a);

function load(y) {
	const groups = read(`public/data/${y}/groups.json`, { groups: [] }).groups;
	const profiles = read(`public/data/${y}/profiles.json`, { groups: {} }).groups;
	const keys = read(`public/data/${y}/keys.json`, {});
	return groups.map(([id, name, , cc]) => ({ id, key: keys[id] ?? id, name: `${cc}|${norm(name)}`, jid: profiles[id]?.[0] || '' }));
}
const unique = (list, f) => {
	const m = new Map();
	for (const g of list) m.set(f(g), m.has(f(g)) ? null : g);
	return m;
};

const now = load(year);
const nowByName = unique(now, (g) => g.name);
const out = {};
const taken = new Set();
for (const y of years) {
	const before = load(y);
	const byJid = new Map(before.filter((g) => g.jid).map((g) => [g.jid, g]));
	const byName = unique(before, (g) => g.name);
	for (const g of now) {
		if (out[g.id] !== undefined) continue;
		const m = (g.jid && byJid.get(g.jid)) || (nowByName.get(g.name) && byName.get(g.name));
		if (m && !taken.has(m.key)) {
			out[g.id] = m.key;
			taken.add(m.key);
		}
	}
}
fs.writeFileSync(`public/data/${year}/keys.json`, JSON.stringify(out));
console.log(`${year}/keys.json: ${Object.keys(out).length} of ${now.length} groups found in ${years.join(', ') || 'no earlier year'}`);
