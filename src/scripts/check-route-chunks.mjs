// Run after `npx vite build --manifest` to catch accidental eager route imports.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../../dist/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'));
const entry = Object.keys(manifest).find(key => manifest[key].isEntry);
assert.ok(entry, 'Build must have an application entry');

function staticDependencies(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dependency of manifest[key].imports || []) staticDependencies(dependency, seen);
  return seen;
}

const pages = [
  'Home', 'About', 'Act', 'Acts', 'Bookings', 'Cart', 'Client_Dashboard',
  'Contact', 'Login', 'ResetPassword', 'Musician', 'PlaceBooking', 'Shortlist',
  'ViewEventSheet', 'BookingSuccess', 'BookingCancelled', 'Terms', 'Privacy',
  'Blog', 'BlogPost', 'LocationWeddingBands', 'VenueGuide',
];
const initial = staticDependencies(entry);
for (const page of pages) {
  const key = `src/pages/${page}.jsx`;
  assert.ok(manifest[key]?.isDynamicEntry, `${page} must remain an on-demand page`);
  assert.ok(!initial.has(key), `${page} must not be in the shared initial bundle`);
}

const county = staticDependencies('src/pages/LocationWeddingBands.jsx');
for (const page of pages.filter(page => page !== 'LocationWeddingBands')) {
  assert.ok(!county.has(`src/pages/${page}.jsx`), `County pages must not import ${page}`);
}
const files = [...county].map(key => new URL(manifest[key].file, dist));
const raw = files.reduce((sum, file) => sum + statSync(file).size, 0);
const gzip = files.reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);
console.log(`All ${pages.length} pages are on demand; county JS including shared code: ${raw} bytes (${gzip} bytes gzip).`);
