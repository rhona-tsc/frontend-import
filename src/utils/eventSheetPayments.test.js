import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventSheetPayments } from './eventSheetPayments.js';

const original = (totals = {}, fields = {}) => ({
  totals: { fullAmount: 2972, depositAmount: 980.76, chargedAmount: 980.76, chargeMode: 'deposit', ...totals },
  actsSummary: [{ selectedExtras: [{ key: 'dj', price: 417, quantity: 1 }] }],
  ...fields,
});

test('the contracted DJ is included in the legacy booking total and not charged a second time', () => {
  const result = resolveEventSheetPayments(original(), [{ basePrice: 2555, extras: [{ price: 417 }], total: 2972 }]);
  assert.deepEqual(result, { bookingTotal: 2972, addOnsPostBooking: 0, fullAmount: 2972, depositAmount: 980.76, remainingAmount: 1991.24, isPaidInFull: false });
});
test('an explicit zero for later add-ons never falls back to the contracted extras', () => {
  const result = resolveEventSheetPayments(original({ bookingTotal: 2972, addOnsPostBooking: 0, extrasTotal: 417 }));
  assert.equal(result.fullAmount, 2972); assert.equal(result.addOnsPostBooking, 0);
});
test('genuine later add-ons are shown once whether supplied separately or included in the updated total', () => {
  for (const totals of [
    { addOnsPostBooking: 417 },
    { bookingTotal: 2972, fullAmount: 3389, addOnsPostBooking: 417 },
    { contractTotal: 2972, fullAmount: 3389 },
    { bookingTotal: 2972, fullAmount: 3389, addOnsPostBooking: 0 },
    { postBookingAddOns: 417 },
  ]) {
    const result = resolveEventSheetPayments(original(totals));
    assert.equal(result.bookingTotal, 2972); assert.equal(result.addOnsPostBooking, 417); assert.equal(result.fullAmount, 3389); assert.equal(result.remainingAmount, 2408.24);
  }
});
test('a current all-inclusive total without an original-price breakdown is not inflated by selected extras', () => {
  assert.equal(resolveEventSheetPayments(original({ fullAmount: 3389 })).fullAmount, 3389);
});
test('paid deposit and legacy payment flags do not mean that the balance has been received', () => {
  const result = resolveEventSheetPayments(original({}, { payment: true, paymentStatus: 'paid' }));
  assert.equal(result.isPaidInFull, false); assert.equal(result.remainingAmount, 1991.24);
});
test('full payments and explicit bank settlements retain their paid status', () => {
  for (const booking of [original({ chargeMode: 'full' }, { paymentStatus: 'paid' }), original({ chargedAmount: 2972 }), original({}, { balancePaid: true }), original({}, { balanceStatus: 'paid' }), original({}, { payments: { balancePaymentReceived: true } })]) {
    const result = resolveEventSheetPayments(booking); assert.equal(result.isPaidInFull, true); assert.equal(result.remainingAmount, 0);
  }
});
test('explicit outstanding balances preserve partial payments and pence rounding', () => {
  assert.equal(resolveEventSheetPayments(original({}, { balanceAmountPence: 123456 })).remainingAmount, 1234.56);
  assert.equal(resolveEventSheetPayments(original({ remainingAmount: 0 })).isPaidInFull, true);
  assert.equal(resolveEventSheetPayments({ totals: { fullAmount: 10.01, chargedAmount: 3.33 } }).remainingAmount, 6.68);
});
test('missing totals use the inclusive item total and do not create later add-ons', () => {
  const result = resolveEventSheetPayments({}, [{ total: 2972, basePrice: 2555, extras: [{ price: 417 }] }]);
  assert.equal(result.bookingTotal, 2972); assert.equal(result.addOnsPostBooking, 0);
  assert.equal(resolveEventSheetPayments(null).isPaidInFull, false);
});

test('Encore displays only extras as client liability, ignoring original paid/deposit flags', () => {
  const booking = { agent: 'Encore', balancePaid: true, balanceStatus: 'paid',
    paymentArrangement: { provider: 'Encore', arrangedAmount: 2615, extrasPaid: false },
    totals: { bookingTotal: 2615, fullAmount: 3255, addOnsPostBooking: 640, depositAmount: 563, remainingAmount: 640 } };
  assert.deepEqual(resolveEventSheetPayments(booking), { bookingTotal: 2615, addOnsPostBooking: 640,
    fullAmount: 3255, depositAmount: 0, remainingAmount: 640, isPaidInFull: false });
  booking.paymentArrangement.extrasPaid = true;
  assert.equal(resolveEventSheetPayments(booking).remainingAmount, 0);
  booking.paymentArrangement.extrasPaid = false;
  booking.totals.addOnsPostBooking = 0; booking.totals.remainingAmount = 0;
  assert.equal(resolveEventSheetPayments(booking).isPaidInFull, true);
});
