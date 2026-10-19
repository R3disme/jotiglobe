import fs from 'fs';
import { execSync } from 'child_process';
// Geocodes scripts/.cache/groups-raw.json with GeoNames (CC-BY 4.0) → public/data/<year>/groups.json, and lists the year
// in public/data/years.json. Usage: node scripts/geocode-groups.mjs [year]   (default: this year)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { geoContains, geoBounds, geoCentroid, geoArea } = require('d3-geo');
const { feature } = require('topojson-client');
const T = 'scripts/.cache/';
const get = (url, file) => { if (!fs.existsSync(T + file)) { console.log('downloading', url); execSync(`curl -sL -o ${T + file} ${url}`); } };
get('https://download.geonames.org/export/dump/cities1000.zip', 'cities1000.zip');
if (!fs.existsSync(T + 'cities1000.txt')) execSync(`unzip -o -q ${T}cities1000.zip -d ${T}`);
get('https://download.geonames.org/export/dump/admin1CodesASCII.txt', 'admin1CodesASCII.txt');
get('https://download.geonames.org/export/dump/admin2Codes.txt', 'admin2Codes.txt');
get('https://raw.githubusercontent.com/mledoze/countries/master/countries.json', 'countries.json');
const raw = [...new Map(JSON.parse(fs.readFileSync(T + 'groups-raw.json', 'utf8')).map(g => [g.id, g])).values()];
const all = JSON.parse(fs.readFileSync(T + 'countries.json', 'utf8'));
const topo = JSON.parse(fs.readFileSync('public/data/countries-50m.json', 'utf8'));
const feats = feature(topo, topo.objects.countries).features;
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const idx = new Map();
for (const c of all) for (const n of [c.name.common, c.name.official, ...(c.altSpellings || [])]) idx.set(norm(n), c.cca2);
const special = { 'scouts of china': 'TW', 'republic of korea': 'KR', 'korea republic of': 'KR', 'state of palestine': 'PS', 'bolivarian republic of venezuela': 'VE', 'venezuela bolivarian republic of': 'VE', 'plurinational state of bolivia': 'BO', 'bolivia plurinational state of': 'BO', 'viet nam': 'VN', 'united republic of tanzania': 'TZ', 'tanzania united republic of': 'TZ', 'syrian arab republic': 'SY', 'democratic republic of the congo': 'CD', 'congo the democratic republic of the': 'CD', 'congo': 'CG', 'cote d ivoire': 'CI', 'curacao': 'CW', 'czechia': 'CZ', 'turkey': 'TR', 'turkiye': 'TR', 'brunei darussalam': 'BN', 'cabo verde': 'CV', 'hong kong': 'HK', 'united states of america': 'US', 'united kingdom': 'GB', 'russian federation': 'RU', 'iran islamic republic of': 'IR', 'moldova republic of': 'MD', 'lao people s democratic republic': 'LA' };
const ccOf = name => special[norm(name)] ?? idx.get(norm(name)) ?? null;

// GeoNames: geonameid name asciiname alternatenames lat lon fclass fcode cc cc2 admin1 admin2 admin3 admin4 population ...
const cities = new Map(); // cc|normname -> {lat,lon,pop}
for (const line of fs.readFileSync(T + 'cities1000.txt', 'utf8').split('\n')) {
  const f = line.split('\t'); if (f.length < 15) continue;
  const cc = f[8], pop = +f[14], lat = +f[4], lon = +f[5];
  const names = new Set([f[1], f[2], ...f[3].split(',')].map(norm).filter(Boolean));
  for (const n of names) { const k = cc + '|' + n; const cur = cities.get(k); if (!cur || cur.pop < pop) cities.set(k, { lat, lon, pop }); }
}
// admin1 (region/state/fylke) fallback → most populous city in that region
const admin1Best = new Map(); // cc.admin1 -> {lat,lon,pop}
for (const line of fs.readFileSync(T + 'cities1000.txt', 'utf8').split('\n')) {
  const f = line.split('\t'); if (f.length < 15) continue;
  const k = f[8] + '.' + f[10], pop = +f[14];
  const cur = admin1Best.get(k); if (!cur || cur.pop < pop) admin1Best.set(k, { lat: +f[4], lon: +f[5], pop });
}
const regions = new Map(); // cc|normname -> {lat,lon}
for (const line of fs.readFileSync(T + 'admin1CodesASCII.txt', 'utf8').split('\n')) {
  const [code, name, ascii] = line.split('\t'); if (!code) continue;
  const best = admin1Best.get(code); if (!best) continue;
  const cc = code.split('.')[0];
  for (const n of [name, ascii].map(norm)) {
    for (const v of [n, n.replace(/ (province|prefecture|state|region|district|governorate|county|fylke|wilaya)$/, ''), n.replace(/^(provincia de|province of|state of|region de) /, '')]) if (v) regions.set(cc + '|' + v, best);
  }
}
// admin2 (municipality/kommune/county) fallback
const admin2Best = new Map();
for (const line of fs.readFileSync(T + 'cities1000.txt', 'utf8').split('\n')) {
  const f = line.split('\t'); if (f.length < 15) continue;
  const k = f[8] + '.' + f[10] + '.' + f[11], pop = +f[14];
  const cur = admin2Best.get(k); if (!cur || cur.pop < pop) admin2Best.set(k, { lat: +f[4], lon: +f[5], pop });
}
for (const line of fs.readFileSync(T + 'admin2Codes.txt', 'utf8').split('\n')) {
  const [code, name, ascii] = line.split('\t'); if (!code) continue;
  const best = admin2Best.get(code); if (!best) continue;
  const cc = code.split('.')[0];
  for (const n of [name, ascii].map(norm)) for (const v of [n, n.replace(/ (kommune|municipality|district|county|regency|city|kabupaten|kota)$/, ''), n.replace(/^(kabupaten|kota|municipio de|municipality of|district of) /, '')]) if (v && !regions.has(cc + '|' + v)) regions.set(cc + '|' + v, best);
}
console.log('city keys', cities.size, 'region keys', regions.size);

const rnd = (() => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// main parts only (polygons >= 20 % of the largest), so approximate groups don't land on Svalbard or French Guiana
function mainParts(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  const polys = f.geometry.coordinates.map(c => ({ c, a: geoArea({ type: 'Polygon', coordinates: c }) }));
  const max = Math.max(...polys.map(p => p.a));
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: polys.filter(p => p.a >= max * 0.2).map(p => p.c) } };
}
function randomIn(cc) {
  const f0 = feats.find(f => f.properties.cc === cc); if (!f0) return null;
  const f = mainParts(f0);
  const [[w, s], [e, n]] = geoBounds(f); const east = e < w ? e + 360 : e;
  for (let i = 0; i < 400; i++) { const p = [w + rnd() * (east - w), s + rnd() * (n - s)]; if (p[0] > 180) p[0] -= 360; if (geoContains(f, p)) return p; }
  return geoCentroid(f);
}
const titleCase = s => s.toLocaleLowerCase('nb').replace(/(^|[\s\-\/(])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase('nb'));
const out = []; let hit = 0, approx = 0, nocc = new Set();
for (const g of raw) {
  const cc = ccOf(g.country) ?? ccOf((g.location.split(',')[0] || ''));
  if (!cc) { nocc.add(g.country); continue; }
  const city = g.location.split(',').slice(1).join(',').trim();
  const parts = [city, ...city.split(/[\/\-–(),]| og | and /)].map(norm).filter(s => s.length > 1);
  let m = null;
  for (const p of parts) { m = cities.get(cc + '|' + p); if (m) break; const words = p.split(' '); if (!m && words.length > 1) for (const wd of words) { if (wd.length > 3 && (m = cities.get(cc + '|' + wd))) break; } if (m) break; }
  if (!m) for (const p of parts) { m = regions.get(cc + '|' + p) || regions.get(cc + '|' + p.replace(/ (province|prefecture|state|region|district|governorate|county|wilaya)$/, '')); if (m) break; }
  let lat, lon, ap = false;
  if (m) { lat = m.lat; lon = m.lon; hit++; } else { const p = randomIn(cc); if (!p) continue; [lon, lat] = p; ap = true; approx++; }
  // small jitter so groups in the same city don't stack perfectly
  lat += (rnd() - 0.5) * 0.04; lon += (rnd() - 0.5) * 0.04;
  out.push([g.id, g.name.normalize('NFKC'), titleCase(city), cc, +lat.toFixed(3), +lon.toFixed(3), ap ? 1 : 0]);
}
console.log('groups', raw.length, 'placed', out.length, 'city-matched', hit, 'approx', approx, 'no-country', [...nocc]);
const year = +(process.argv[2] ?? new Date().getUTCFullYear());
fs.mkdirSync(`public/data/${year}`, { recursive: true });
fs.writeFileSync(`public/data/${year}/groups.json`, JSON.stringify({ snapshot: new Date().toISOString().slice(0, 10), fields: ['id', 'name', 'city', 'cc', 'lat', 'lon', 'approx'], groups: out }));
// a new year starts out with the third weekend of October; fix the dates in years.json if JOTA-JOTI moves
const yf = 'public/data/years.json';
const years = fs.existsSync(yf) ? JSON.parse(fs.readFileSync(yf, 'utf8')).years : [];
if (!years.some(y => y.year === year)) {
  const d = new Date(Date.UTC(year, 9, 1)); while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1); d.setUTCDate(d.getUTCDate() + 14);
  const start = d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 2);
  years.push({ year, start, end: d.toISOString().slice(0, 10) });
  years.sort((a, b) => a.year - b.year);
  fs.writeFileSync(yf, JSON.stringify({ years }) + '\n');
  console.log('added', year, 'to', yf);
}
