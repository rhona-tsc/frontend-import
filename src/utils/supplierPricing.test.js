import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierQuote, customerPrice } from './supplierPricing.js';
import { getActStartingPrice } from './actPriceDisplay.js';

test('master supplier rates give the same retail amount in cards, cart and checkout', () => {
  const lineup = { lineupId: 'standard' };
  const act = { supplierPricing: { lineups: { standard: { counties: { London: 2760, Kent: 2900, Devon: 0 } } } } };
  const quote = supplierQuote(act, lineup, 'Greater London');
  assert.equal(getActStartingPrice(act), 3671);
  assert.equal(quote.total, 3671);
  assert.equal(customerPrice(quote), 3671);
  assert.equal(quote.fee + quote.travel, 3671);
  assert.equal(supplierQuote(act, lineup, 'Kent').total, 3857);
  assert.equal(supplierQuote(act, lineup, 'Devon').total, null);
  assert.equal(supplierQuote(act, lineup, 'Unknown').total, null);
  assert.equal(supplierQuote(act, lineup, '').travelCalculated, false);
});
