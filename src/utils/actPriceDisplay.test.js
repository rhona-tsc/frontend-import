import test from 'node:test';
import assert from 'node:assert/strict';
import { getActStartingPrice, getActPriceLabel } from './actPriceDisplay.js';

test('saved starting price is shown without applying markup twice', () => {
  assert.equal(getActStartingPrice({ minDisplayPrice: '£2,068' }), 2068);
  assert.equal(getActPriceLabel({ act: { minDisplayPrice: 2068 }, hasDetails: false, price: { total: 9999, travelCalculated: true } }), 'from £2,068');
});
test('missing display price falls back to existing base pricing including essential roles', () => {
  const act = { lineups: [{ bandMembers: [{ fee: 200, additionalRoles: [{ isEssential: true, additionalFee: 125 }, { isEssential: false, additionalFee: 500 }] }] }] };
  assert.equal(getActStartingPrice(act), 433);
  assert.equal(getActStartingPrice({ lineups: [{ base_fee: [{ total_fee: 1000 }] }] }), 1330);
});
test('accurate travel-inclusive prices require a date and location', () => {
  const args = { act: { minDisplayPrice: 1000 }, price: { total: 1500, travelCalculated: true } };
  assert.equal(getActPriceLabel({ ...args, hasDetails: false }), 'from £1,000');
  assert.equal(getActPriceLabel({ ...args, hasDetails: true }), '£1,500');
  assert.equal(getActPriceLabel({ ...args, hasDetails: true, price: { total: 1500, travelCalculated: false } }), 'from £1,500');
  assert.equal(getActPriceLabel({ act: {}, hasDetails: false }), null);
});
