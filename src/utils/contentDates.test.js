import test from 'node:test';
import assert from 'node:assert/strict';
import { contentDate } from './contentDates.js';
import { buildPageSchema } from './structuredData.js';

test('modification dates come from records; missing, invalid and future dates are omitted', () => {
  for (const value of [undefined, '', 'bad', '2099-01-01', new Date()]) assert.equal(contentDate(value), undefined);
  assert.equal(contentDate('2026-01-01T12:00:00Z'), '2026-01-01T12:00:00.000Z');
  const schema = buildPageSchema({ route: '/act/example', title: 'Example', act: {
    tscName: 'Example', tscDescription: 'Approved description', images: [{ url: 'https://example.test/photo.jpg' }], updatedAt: '2026-01-01T12:00:00Z',
  } });
  const page = schema['@graph'].find(node => node['@type'] === 'WebPage');
  const group = schema['@graph'].find(node => node['@type'] === 'MusicGroup');
  assert.equal(page.dateModified, '2026-01-01T12:00:00.000Z');
  assert.equal(group.image, 'https://example.test/photo.jpg');
  assert.equal(group.description, 'Approved description');
  assert.equal(group.aggregateRating, undefined);
});
