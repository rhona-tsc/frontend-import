const normaliseSource = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isEncoreBooking = (booking = {}) => booking.paymentArrangement?.provider === "Encore" ||
  [booking.agent, booking.bookingSource, booking.source, booking.importMetadata?.source]
    .some(value => ["encore", "encore pdf"].includes(normaliseSource(value)));

export const isEntertainmentNationBooking = (booking = {}) =>
  [
    booking?.agent,
    booking?.bookingSource,
    booking?.source,
    booking?.importMetadata?.agent,
    booking?.importMetadata?.source,
  ].some((value) => normaliseSource(value) === "entertainment nation");

export const isDirectTscBooking = (booking = {}) => {
  const direct = new Set(["direct", "tsc", "tsc direct", "the supreme collective"]);
  const sources = [booking.agent, booking.bookingSource, booking.source,
    booking.importMetadata?.agent, booking.importMetadata?.source]
    .map(normaliseSource).filter(Boolean);
  // Import mechanisms describe how a record arrived, rather than its agent.
  const mechanisms = new Set(["contract pdf", "pdf", "website", "online", "stripe"]);
  if (sources.some((source) => !direct.has(source) && !mechanisms.has(source))) return false;
  return sources.some((source) => direct.has(source)) || /^cs_(live|test)_/.test(booking.sessionId || "");
};
