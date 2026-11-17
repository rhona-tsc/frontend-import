import test from 'node:test';
import assert from 'node:assert/strict';
import { directBookingSaving, normalWebsitePrice, minimumCustomerPrice, minimumSupplierPrice, supplierQuote, customerPrice } from './supplierPricing.js';
import { getActStartingPrice } from './actPriceDisplay.js';

test('master supplier rates give the same retail amount in cards, cart and checkout', () => {
  const lineup = { lineupId: 'standard' };
  const act = { supplierPricing: { lineups: { standard: { counties: { London: 2760, Kent: 2900, Devon: 0 } } } } };
  const quote = supplierQuote(act, lineup, 'Greater London');
  assert.equal(getActStartingPrice(act), 3571);
  assert.equal(quote.total, 3571);
  assert.equal(customerPrice(quote), 3571);
  assert.equal(quote.fee + quote.travel, 3571);
  assert.equal(supplierQuote(act, lineup, 'Kent').total, 3757);
  assert.equal(supplierQuote(act, lineup, 'Devon').total, null);
  assert.equal(supplierQuote(act, lineup, 'Unknown').total, null);
  assert.equal(supplierQuote(act, lineup, '').travelCalculated, false);
});


test('fixed saving tier uses the normal London lineup guide, including the £2500 boundary', () => {
  assert.equal(directBookingSaving(2499), 50);
  assert.equal(directBookingSaving(2500), 100);
  assert.equal(directBookingSaving(2501), 100);
  assert.equal(directBookingSaving(0), 0);
  assert.equal(normalWebsitePrice(1402), 1865);
  const lineup = { lineupId: 'three' };
  const act = { supplierPricing: { lineups: { three: { counties: { 'Greater London': 1402, Kent: 2000, Devon: 0 } } } } };
  const before = JSON.stringify(act);
  assert.equal(supplierQuote(act, lineup, 'London').total, 1815);
  // Travelling to a more expensive county does not increase the lineup's saving.
  assert.equal(supplierQuote(act, lineup, 'Kent').total, 2610);
  assert.equal(supplierQuote(act, lineup, 'Kent').directBookingSaving, 50);
  assert.equal(supplierQuote(act, lineup, 'Devon').total, null);
  assert.equal(customerPrice(supplierQuote(act, lineup, 'Kent')), 2610);
  assert.equal(JSON.stringify(act), before);
});

test('starting price is the cheapest discounted eligible lineup/county, not a second discount', () => {
  const act = { minDisplayPrice: 12345, supplierPricing: { lineups: {
    small: { counties: { London: 1402, Kent: 2000 } },
    large: { counties: { London: 2760, Somerset: 1400 } },
  } } };
  assert.equal(minimumSupplierPrice(act), 1400);
  assert.equal(minimumCustomerPrice(act), 1762);
  // Missing London references do not invent a tier from the requested county.
  assert.equal(supplierQuote({ supplierPricing: { lineups: { x: { counties: { Kent: 1000 } } } } }, { lineupId: 'x' }, 'Kent').directBookingSaving, 0);
});
