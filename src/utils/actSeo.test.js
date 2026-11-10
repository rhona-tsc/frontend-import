import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActMeta } from './actSeo.js';

test('artist search snippets use the same approved summary as the visible artist page', () => {
  const act = { tscName: 'Magnolia Sky', slug: 'magnolia-sky', tscDescription: 'Festival-style folk and pop with acoustic guitar and uplifting singalongs.' };
  assert.equal(buildActMeta(act).description, act.tscDescription);
  assert.match(buildActMeta(act).title, /Magnolia Sky.*Festival-Style Folk Band/);
});
test('long or missing summaries produce readable plain-text search snippets', () => {
  const result = buildActMeta({ tscName: 'Example', tscDescription: `<p>${'A distinctive repertoire and live lineup. '.repeat(10)}</p>` });
  assert.ok(result.description.length <= 165);
  assert.doesNotMatch(result.description, /<p>/);
  assert.match(result.description, /…$/);
  assert.match(buildActMeta({ tscName: 'Gotta Be Garage', slug: 'gotta-be-garage' }).description, /UK|uk garage/);
});
