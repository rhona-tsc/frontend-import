const positive = value => {
  if (value == null || typeof value === 'object') return null;
  const number = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
};

// Acts already calculates customer-facing prices. Accept both its numeric/string
// payload and the full calculator payload without adding markup a second time.
export const preparedListingPrice = act => {
  const value = act?.formattedPrice;
  const total = positive(typeof value === 'object' ? value?.total : value);
  return total == null ? null : { total, travelCalculated: typeof value === 'object' ? value?.travelCalculated === true : true };
};

// Ignore derived sort/display fields: reporting a price to the parent must not
// retrigger pricing. Do notice later hydration even when id/version are unchanged.
export const listingPricingSignature = act => JSON.stringify([
  act?.formattedPrice, act?.basePrice, act?.minDisplayPrice,
  act?.__card?.basePrice, act?.__card?.minDisplayPrice,
  act?.lineups, act?.countyFees, act?.useCountyTravelFee,
  act?.useMUTravelRates, act?.costPerMile, act?.travelModel,
]);

export const withPricingTimeout = (work, timeoutMs = 15000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Pricing calculation timed out')), timeoutMs);
  Promise.resolve().then(work).then(resolve, reject).finally(() => clearTimeout(timer));
});
