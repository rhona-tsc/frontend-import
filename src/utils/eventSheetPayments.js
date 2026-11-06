const money = value => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
};
const firstMoney = (...values) => values.map(money).find(value => value !== null);
const round = value => Math.round(value * 100) / 100;

export function resolveEventSheetPayments(booking = {}, items = []) {
  const totals = booking?.totals || {};
  const arrangement = booking?.paymentArrangement || totals.paymentArrangement;
  if (arrangement?.provider === 'Encore') {
    const bookingTotal = firstMoney(arrangement.arrangedAmount, totals.bookingTotal) ?? 0;
    const addOnsPostBooking = firstMoney(totals.addOnsPostBooking) ?? 0;
    const remainingAmount = arrangement.extrasPaid === true ? 0
      : firstMoney(totals.remainingAmount, totals.outstandingBalance) ?? addOnsPostBooking;
    return { bookingTotal, addOnsPostBooking, fullAmount: round(bookingTotal + addOnsPostBooking),
      depositAmount: 0, remainingAmount, isPaidInFull: remainingAmount <= 0.01 };
  }
  const original = firstMoney(totals.bookingTotal, totals.contractTotal);
  const storedFull = money(totals.fullAmount);
  // Selected extras describe the contracted service. Their presence is not
  // evidence that they were added after booking (or need charging again).
  const explicitAddOns = firstMoney(totals.addOnsPostBooking, totals.postBookingAddOns);
  const fallbackTotal = items.reduce((sum, item) => sum + Number(item.total ?? item.basePrice ?? item.price ?? 0), 0);
  const bookingTotal = original ?? firstMoney(storedFull, booking?.grossValue, booking?.fee) ?? round(fallbackTotal);
  const fullAmount = original != null && storedFull != null && storedFull > original
    ? storedFull
    : round(bookingTotal + (explicitAddOns ?? 0));
  const addOnsPostBooking = round(Math.max(0, fullAmount - bookingTotal));
  const depositAmount = firstMoney(totals.depositAmount, booking?.payments?.depositChargedAmount, booking?.payments?.depositAmount) ?? 0;
  const charged = firstMoney(totals.chargedAmount) ?? depositAmount;
  const isBookingMarkedPaid = booking?.balancePaid === true || totals.balancePaid === true
    || String(booking?.balanceStatus || '').toLowerCase() === 'paid'
    || booking?.payments?.balancePaymentReceived === true || booking?.payments?.invoicePaid === true
    || (String(booking?.paymentStatus || '').toLowerCase() === 'paid'
      && (totals.chargeMode === 'full' || (fullAmount > 0 && charged >= fullAmount)));
  const explicitRemaining = firstMoney(totals.remainingAmount, totals.outstandingBalance, booking?.remainingAmount,
    booking?.balanceAmountPence == null ? null : Number(booking.balanceAmountPence) / 100);
  const remainingAmount = isBookingMarkedPaid ? 0 : explicitRemaining ?? round(Math.max(0, fullAmount - charged));
  return { bookingTotal, addOnsPostBooking, fullAmount, depositAmount, remainingAmount,
    isPaidInFull: isBookingMarkedPaid || (fullAmount > 0 && remainingAmount <= 0.01) };
}
