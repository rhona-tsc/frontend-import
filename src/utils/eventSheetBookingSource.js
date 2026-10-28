const normaliseSource = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isEntertainmentNationBooking = (booking = {}) =>
  [
    booking?.agent,
    booking?.bookingSource,
    booking?.source,
    booking?.importMetadata?.agent,
    booking?.importMetadata?.source,
  ].some((value) => normaliseSource(value) === "entertainment nation");
