// Usage: node scripts/build-error-pages.mjs  (runs before every build; nginx serves these as /_errors/<code>.html)
import fs from 'fs';
import { errorIndex, errorPage, errors } from '../src/lib/error-pages.js';
fs.mkdirSync('static/_errors', { recursive: true });
for (const code of Object.keys(errors)) fs.writeFileSync(`static/_errors/${code}.html`, errorPage(+code));
fs.writeFileSync('static/_errors/index.html', errorIndex());
