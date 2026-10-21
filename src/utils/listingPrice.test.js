import test from 'node:test';
import assert from 'node:assert/strict';
import { preparedListingPrice, listingPricingSignature, withPricingTimeout } from './listingPrice.js';

test('reads parent prices in all supported formats without another markup', () => {
  for (const value of [1500, '1500', '£1,500']) assert.deepEqual(preparedListingPrice({ formattedPrice: value }), { total: 1500, travelCalculated: true });
  assert.deepEqual(preparedListingPrice({ formattedPrice: { total: 1500, travelCalculated: false } }), { total: 1500, travelCalculated: false });
  for (const value of [null, '', 'invalid', 0, {}]) assert.equal(preparedListingPrice({ formattedPrice: value }), null);
});
test('hydrated prices and lineups trigger an update, derived sorting fields do not', () => {
  const act = { _id: 'same-id', __v: 1, basePrice: 1000 };
  assert.notEqual(listingPricingSignature(act), listingPricingSignature({ ...act, formattedPrice: '1500' }));
  assert.notEqual(listingPricingSignature(act), listingPricingSignature({ ...act, lineups: [{ bandMembers: [{ fee: 300 }] }] }));
  assert.equal(listingPricingSignature(act), listingPricingSignature({ ...act, sortPrice: 1330, displayPrice: '£1,330' }));
});
test('pricing finishes on success, failure and a stalled request', async () => {
  assert.equal(await withPricingTimeout(() => Promise.resolve(1500), 100), 1500);
  await assert.rejects(withPricingTimeout(() => Promise.reject(new Error('offline')), 100), /offline/);
  await assert.rejects(withPricingTimeout(() => new Promise(() => {}), 10), /timed out/);
});
