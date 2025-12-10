// services/normalizeActCard.js
export function normalizeActCard(raw = {}) {
  const lower = (s) => String(s || "").trim().toLowerCase();
  const arrLower = (a) => (Array.isArray(a) ? a.map(lower).filter(Boolean) : []);

  const card = { ...raw };

  // Genres
  card.genres = Array.isArray(card.genres) ? card.genres : [];
  card.genresNormalized = arrLower(card.genres);

  // Wireless helpers
  const wirelessObj = card.wirelessByInstrument || {};
  card.wirelessInstruments = Object.entries(wirelessObj)
    .filter(([, v]) => !!v)
    .map(([k]) => k);

  // PA/Lighting booleans for fast filter
  card.hasPA = !!(card.pa && (card.pa.hasPA || card.pa.canProvide || card.pa.available));
  card.hasLighting = !!(card.lighting && (card.lighting.hasLighting || card.lighting.canProvide || card.lighting.available));

  // Ceremony/Afternoon rollups
  const truthy = (o = {}) => Object.values(o).some(Boolean);
  card.hasCeremonyOptions = truthy(card.ceremony);
  card.hasAfternoonOptions = truthy(card.afternoon);

  // ExtrasKeys (true / complimentary / price>0)
  const extras = card.extras || {};
  card.extrasKeys = Object.entries(extras)
    .filter(([, v]) => v === true || v === "complimentary" || (v && typeof v === "object" && Number(v.price) > 0))
    .map(([k]) => k);

  // Guard common fields
  card.basePrice = card.basePrice ?? null;
  card.minDb = Number.isFinite(card.minDb) ? card.minDb : null;
  card.smallestLineupSize = Number.isFinite(card.smallestLineupSize) ? card.smallestLineupSize : null;

  return card;
}