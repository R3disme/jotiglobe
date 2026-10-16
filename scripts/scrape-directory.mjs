import fs from 'fs';
// Scrapes the public JOTA-JOTI Scout Group Directory (name, location, country only).
// Usage: node scripts/scrape-directory.mjs   → scripts/.cache/groups-raw.json
fs.mkdirSync('scripts/.cache', { recursive: true });
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36';
const out = [];
const dec = s => s.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
// find the last page by binary search
const rowsOn = async (pg) => (await (await fetch(`https://jotajoti.info/directory?page=${pg}`, { headers: { 'user-agent': UA } })).text()).split('<td headers="view-title').length - 1;
let lo = 0, hi = 8192;
while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await rowsOn(mid)) lo = mid; else hi = mid; }
console.log('pages:', lo + 1);
for (let page = 0; page <= lo; page++) {
  let html = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = await fetch(`https://jotajoti.info/directory?page=${page}`, { headers: { 'user-agent': UA } }); html = await r.text(); if (r.ok) break; } catch {}
    await new Promise(r => setTimeout(r, 3000));
  }
  const rowRe = /<tr>\s*<td headers="view-title-table-column">[\s\S]*?href="\/scouts_group\/(\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?views-field-location-1">([\s\S]*?)<\/td>[\s\S]*?views-field-country">([\s\S]*?)<\/td>/g;
  let m, n = 0;
  while ((m = rowRe.exec(html))) { out.push({ id: +m[1], name: dec(m[2]), location: dec(m[3]), country: dec(m[4]) }); n++; }
  if (page % 25 === 0) { console.log('page', page, 'rows', n, 'total', out.length); fs.writeFileSync('scripts/.cache/groups-raw.json', JSON.stringify(out)); }
  await new Promise(r => setTimeout(r, 600));
}
fs.writeFileSync('scripts/.cache/groups-raw.json', JSON.stringify(out));
console.log('DONE', out.length);
