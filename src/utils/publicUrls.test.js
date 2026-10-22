import test from 'node:test';
import assert from 'node:assert/strict';
import { publicHref, publicCanonicalUrl, PUBLIC_ORIGIN } from './publicUrls.js';
import { buildPageSchema } from './structuredData.js';

test('public directory links use one trailing slash, preserving queries and fragments', () => {
  for (const input of ['/acts', '/about', '/act/soul-allegiance', '/blog/example', '/wedding-bands-essex']) {
    assert.equal(publicHref(input), input + '/');
    assert.equal(publicHref(input + '/'), input + '/');
    assert.equal(publicHref(input + '///?venue=abc#details'), input + '/?venue=abc#details');
    assert.equal(publicHref(PUBLIC_ORIGIN + input), PUBLIC_ORIGIN + input + '/');
  }
});
test('assets, APIs, private routes, external links and anchor-only links are unchanged', () => {
  for (const input of ['/', '/cart', '/login', '/api/act', '/musician/rick-f', '/assets/photo.jpg', '#bands', 'mailto:hello@example.com', 'https://example.com/acts', '//example.com/acts']) {
    assert.equal(publicHref(input), input);
  }
});
test('canonical URLs match final destinations without tracking queries', () => {
  assert.equal(publicCanonicalUrl('/venues?county=Essex#details'), PUBLIC_ORIGIN + '/venues/');
  assert.equal(publicCanonicalUrl('about///'), PUBLIC_ORIGIN + '/about/');
  assert.equal(publicCanonicalUrl('/'), PUBLIC_ORIGIN + '/');
});
test('schema page, band and breadcrumb destinations use the same final URLs', () => {
  const schema = buildPageSchema({ route: '/acts/', title: 'Bands', bands: [{ route: '/act/example', act: { tscName: 'Example' } }] });
  assert.equal(schema['@graph'].find(x => x['@type'] === 'CollectionPage').url, PUBLIC_ORIGIN + '/acts/');
  assert.equal(schema['@graph'].find(x => x['@type'] === 'ItemList').itemListElement[0].url, PUBLIC_ORIGIN + '/act/example/');
  assert.equal(schema['@graph'].find(x => x['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, PUBLIC_ORIGIN + '/acts/');
});
