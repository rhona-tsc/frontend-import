// Simple in-memory cache for pricing results (per tab)
export const priceCache = new Map();

export const makePriceKey = ({
  actId,
  lineupId,
  dateISO,
  address,
  county,
}) =>
  [
    String(actId || ""),
    String(lineupId || ""),
    String(dateISO || "").slice(0, 10),
    String(county || "").toLowerCase(),
    String(address || "").toLowerCase(),
  ].join("|");