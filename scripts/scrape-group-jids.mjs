// Usage: node scripts/scrape-group-jids.mjs  (needs scripts/.cache/groups-raw.json from scrape-directory.mjs; ~0.7 s per group)
// then: node scripts/build-group-jids.mjs
// Reads only the public "Group JID" field from each group's public profile page. Resumable.
import fs from 'fs';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36';
const raw = JSON.parse(fs.readFileSync('scripts/.cache/groups-raw.json', 'utf8'));
const groups = [...new Map(raw.map(g => [g.id, g])).values()];
const OUT = 'scripts/.cache/group-jids.json';
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
let n = 0;
for (const g of groups) {
  if (done[g.id] !== undefined) continue;
  let jid = null;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://jotajoti.info/scouts_group/${g.id}`, { headers: { 'user-agent': UA } });
      const t = (await r.text()).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
      const i = t.indexOf('Group JID'); jid = i >= 0 ? t[i + 1] : '';
      if (r.ok) break;
    } catch {}
    await new Promise(r => setTimeout(r, 4000));
  }
  done[g.id] = jid ?? '';
  if (++n % 100 === 0) { fs.writeFileSync(OUT, JSON.stringify(done)); console.log(new Date().toISOString().slice(11, 19), Object.keys(done).length, '/', groups.length); }
  await new Promise(r => setTimeout(r, 700));
}
fs.writeFileSync(OUT, JSON.stringify(done));
console.log('DONE', Object.keys(done).length, 'with JID:', Object.values(done).filter(Boolean).length);
