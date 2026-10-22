import test from 'node:test';
import assert from 'node:assert/strict';
import { countyLink, venueHref, reviewCountyLink, formatPerformanceMonth } from './publicPerformanceHistory.js';
test('county links only point to existing pages and London variants consolidate', () => {
  assert.equal(countyLink('Greater London').href, '/wedding-bands-london/');
  assert.equal(countyLink('Essex').href, '/wedding-bands-essex/');
  assert.equal(countyLink('Unknown'), null);
  assert.equal(countyLink('London Road, Essex'), null);
});
test('venue filter links preserve the actual stored county and encode identifiers', () => {
  assert.equal(venueHref({ id:'123', county:'London', venueCounty:'Greater London' }), '/venues/?venue=123&county=Greater%20London');
  assert.equal(venueHref({ id:'example-evening', venueId:'actual-venue', county:'Essex' }), '/venues/?venue=actual-venue&county=Essex');
});
test('review metadata is matched by ID, not array position, without changing quotation', () => {
  const review = { _id:'a', comment:'Original words' };
  const history = { reviewCounties:[{ reviewId:'b', index:0, county:'Kent' }, { reviewId:'a', index:1, county:'Essex' }] };
  assert.equal(reviewCountyLink(review, 0, history).name, 'Essex');
  assert.equal(review.comment, 'Original words');
  assert.equal(reviewCountyLink({ _id:'c', comment:'Unknown' }, 1, history), null);
  assert.equal(reviewCountyLink({ eventLocation:'Surrey' }, 0, null).name, 'Surrey');
});
test('performance dates display month and year, not client-identifying exact dates', () => {
  assert.equal(formatPerformanceMonth('2026-09'), 'September 2026');
  assert.equal(formatPerformanceMonth('2026-09-20'), '');
  assert.equal(formatPerformanceMonth('2026-13'), '');
});
