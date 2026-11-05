import test from "node:test";
import assert from "node:assert/strict";

import { isEntertainmentNationBooking } from "./eventSheetBookingSource.js";

test("identifies Entertainment Nation bookings", () => {
  assert.equal(isEntertainmentNationBooking({ agent: "Entertainment Nation" }), true);
  assert.equal(isEntertainmentNationBooking({ bookingSource: "entertainment-nation" }), true);
});

test("leaves other booking sources unchanged", () => {
  assert.equal(isEntertainmentNationBooking({ agent: "Direct" }), false);
  assert.equal(isEntertainmentNationBooking({ agent: "Encore" }), false);
});

import { isDirectTscBooking } from './eventSheetBookingSource.js';

test('direct TSC bookings and legacy website Stripe bookings use Stripe', () => {
  for (const agent of ['Direct', 'TSC', 'TSC Direct', 'The Supreme Collective']) {
    assert.equal(isDirectTscBooking({ agent }), true);
  }
  assert.equal(isDirectTscBooking({ sessionId: 'cs_live_original_deposit', accounting: { invoiceCompany: 'BMM' } }), true);
});
test('external agency bookings retain invoices even with a stale default Direct agent or old Stripe ID', () => {
  for (const source of ['Entertainment Nation', 'Encore', 'Alive Network']) {
    assert.equal(isDirectTscBooking({ agent: 'Direct', bookingSource: source, sessionId: 'cs_live_example' }), false);
  }
  assert.equal(isDirectTscBooking({}), false);
  assert.equal(isDirectTscBooking({ accounting: { invoiceCompany: 'TSC' } }), false);
  assert.equal(isDirectTscBooking({ agent: 'BMM' }), false);
});
test('PDF import mechanism does not override an explicit direct booking source', () => {
  assert.equal(isDirectTscBooking({ agent: 'TSC Direct', importMetadata: { source: 'contract_pdf' } }), true);
});
