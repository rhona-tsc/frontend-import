import { computeBasePriceFromAct } from './computeBasePrice.js';

const positivePrice = value => {
  if (value == null || typeof value === 'object') return null;
  const number = Number(String(value).replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
};

export const getActStartingPrice = act => {
  // Explicit display prices are already customer-facing; don't mark them up again.
  for (const value of [act?.minDisplayPrice, act?.formattedPrice?.minDisplayPrice, act?.formattedPrice?.min, act?.formattedPrice?.total]) {
    const price = positivePrice(value);
    if (price != null) return price;
  }
  // Same base fee and 33% markup used by the existing act-card pricing.
  const base = computeBasePriceFromAct(act);
  return base > 0 ? Math.ceil(base * 1.33) : null;
};

export const getActPriceLabel = ({ act, hasDetails, price, formattedPrice, finalTravelPrice }) => {
  const startingPrice = getActStartingPrice(act);
  if (!hasDetails) return startingPrice ? `from £${startingPrice.toLocaleString('en-GB')}` : null;
  const total = [price?.total, finalTravelPrice?.total, formattedPrice, act?.formattedPrice?.total]
    .map(positivePrice).find(value => value != null);
  if (total != null) return `${price?.travelCalculated || finalTravelPrice?.travelCalculated ? '' : 'from '}£${total.toLocaleString('en-GB')}`;
  return startingPrice ? `from £${startingPrice.toLocaleString('en-GB')}` : null;
};
