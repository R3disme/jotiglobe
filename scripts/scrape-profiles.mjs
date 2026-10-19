// Usage: node scripts/scrape-profiles.mjs [year]
import fs from 'fs';
const year = +(process.argv[2] ?? new Date().getUTCFullYear());
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36';
const ids = JSON.parse(fs.readFileSync(`public/data/${year}/groups.json`, 'utf8')).groups.map((g) => g[0]);
fs.mkdirSync('scripts/.cache', { recursive: true });
const CACHE = `scripts/.cache/profiles-${year}.json`;
const done = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function profile(id) {
	for (let a = 0; a < 3; a++) {
		try {
			const r = await fetch(`https://jotajoti.info/scouts_group/${id}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
			if (r.status === 404) return null;
			const t = (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').split('\n').map((s) => dec(s).trim()).filter(Boolean);
			const after = (label) => {
				const i = t.indexOf(label);
				return i >= 0 ? t[i + 1] : '';
			};
			const jid = after('Group JID').toUpperCase();
			const n = parseInt(after('Number of Group Participants'), 10);
			if (r.ok) return [/^[1-6][A-Z]{2}[0-9A-Z]{2,4}[A-Z]{2,3}$/.test(jid) ? jid : '', Number.isFinite(n) && n >= 0 ? n : null, after('Organization')];
		} catch {}
		await new Promise((r) => setTimeout(r, 4000));
	}
	return undefined; // try again next run
}

const todo = ids.filter((id) => done[id] === undefined);
console.log(year, 'groups', ids.length, 'to fetch', todo.length);
let n = 0;
const save = () => fs.writeFileSync(CACHE, JSON.stringify(done));
async function worker() {
	while (todo.length) {
		const id = todo.shift();
		const p = await profile(id);
		if (p !== undefined) done[id] = p;
		if (++n % 200 === 0) (save(), console.log(new Date().toISOString().slice(11, 19), Object.keys(done).length, '/', ids.length));
		await new Promise((r) => setTimeout(r, 700));
	}
}
await Promise.all([worker(), worker()]);
save();

const out = {};
for (const id of ids) if (done[id]) out[id] = done[id];
fs.writeFileSync(`public/data/${year}/profiles.json`, JSON.stringify({ fields: ['jid', 'participants', 'org'], groups: out }));
const vals = Object.values(out);
console.log('DONE', vals.length, 'profiles, with JID', vals.filter((v) => v[0]).length, 'participants', vals.reduce((a, v) => a + (v[1] ?? 0), 0));
