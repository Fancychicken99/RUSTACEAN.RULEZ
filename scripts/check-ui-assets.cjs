// Verify the exact locally packaged bytes referenced by HTML integrity fields.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../frontend');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let checked = 0;
for (const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
  const integrity = tag[0].match(/\bintegrity="([^"]+)"/)?.[1];
  if (!integrity) continue;
  const relative = tag[0].match(/\b(?:src|href)="([^"]+)"/)?.[1];
  if (!relative || /^[a-z]+:/i.test(relative)) throw new Error('Integrity asset must be local.');
  const asset = path.resolve(root, relative);
  if (!asset.startsWith(root + path.sep)) throw new Error('Asset outside frontend.');
  const [algorithm, expected] = integrity.split('-');
  if (!['sha256', 'sha384', 'sha512'].includes(algorithm)) throw new Error('Unsupported integrity algorithm.');
  const actual = crypto.createHash(algorithm).update(fs.readFileSync(asset)).digest('base64');
  if (actual !== expected) throw new Error(`Integrity mismatch: ${relative}. Preserve vendor file bytes during checkout.`);
  checked++;
}
if (!checked) throw new Error('No HTML integrity declarations found.');
console.log(`PASS: ${checked} packaged UI integrity declarations match exact local asset bytes.`);
