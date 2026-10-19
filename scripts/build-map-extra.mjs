// Usage: node scripts/build-map-extra.mjs
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { feature } = require('topojson-client');
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const features = (t) => feature(t, t.objects.countries).features;
const have = new Set(features(read('static/data/countries-110m.json')).map((f) => f.properties.cc));
const round = (c) => (typeof c[0] === 'number' ? [+c[0].toFixed(3), +c[1].toFixed(3)] : c.map(round));
const extra = features(read('static/data/countries-50m.json'))
	.filter((f) => f.properties.cc && !have.has(f.properties.cc))
	.map((f) => ({ type: 'Feature', properties: { cc: f.properties.cc }, geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) } }));
fs.writeFileSync('static/data/countries-extra.json', JSON.stringify({ type: 'FeatureCollection', features: extra }));
console.log('countries-extra.json:', extra.length, 'countries,', Math.round(fs.statSync('static/data/countries-extra.json').size / 1024), 'KB');
