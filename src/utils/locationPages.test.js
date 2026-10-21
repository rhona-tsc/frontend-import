import test from 'node:test';
import assert from 'node:assert/strict';
import { locationPages, locationMeta, locationCopy } from '../data/locationPages.js';
import { buildPageSchema, serializeSchema } from './structuredData.js';

test('five distinct county pages have unique copy, canonical routes and ordered band schema', () => {
  assert.equal(locationPages.length, 5);
  assert.equal(new Set(locationPages.map(page => page.intro)).size, 5);
  for (const config of locationPages) {
    const route = `/wedding-bands-${config.slug}`;
    const schema = buildPageSchema({ route, ...locationMeta(config), location: { county: config.name, bands: [{ name: 'Example band', slug: 'example' }] } });
    const graph = schema['@graph'];
    assert.equal(graph.find(item => item['@type'] === 'CollectionPage').url, `https://thesupremecollective.co.uk${route}`);
    assert.equal(graph.find(item => item['@type'] === 'Service').areaServed.name, config.name);
    assert.equal(graph.find(item => item['@type'] === 'ItemList').itemListElement[0].position, 1);
    assert.equal(graph.find(item => item['@type'] === 'BreadcrumbList').itemListElement.at(-1).name, config.name);
    assert.ok(!serializeSchema(schema).includes('aggregateRating'));
  }
});

test('location copy is client-facing and uses the requested local band label', () => {
  assert.equal(locationCopy.localBadge, 'Local band');
  const copy = JSON.stringify(locationPages) + locationCopy.bandsIntro + locationCopy.priceFaq.a;
  assert.doesNotMatch(copy, /original.member|linked musician|shared venue|recorded local|deputy|local-member/i);
  for (const page of locationPages) {
    assert.ok(page.description.length <= 165);
    assert.ok(page.intro.includes(page.name));
    assert.ok(locationCopy.venueIntro(page.name).includes(page.name));
  }
});
