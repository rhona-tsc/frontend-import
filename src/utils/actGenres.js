import { genrePages } from '../data/genrePages.js';

const normalize = (value) => String(value || '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

// Published editorial selections supply missing legacy card metadata only.
const soulBands = genrePages.find(page => page.slug === 'funk-soul-wedding-bands')?.bands || [];
const soulSlugs = new Set(soulBands.map(band => band.slug));
const soulNames = new Set(soulBands.map(band => normalize(band.name)));

export function getActGenreTokens(act = {}) {
  const tokens = [act, act.__card].filter(Boolean).flatMap(source =>
    ['genres', 'genre', 'genres_raw', 'genres_norm', 'genresNormalized', 'genreTags']
      .flatMap(key => [source[key]].flat(Infinity))
  ).filter(value => typeof value === 'string' && value.trim()).map(normalize);
  if (tokens.length) return [...new Set(tokens)];
  if (soulSlugs.has(act.slug || act.__card?.slug) ||
      soulNames.has(normalize(act.tscName || act.name))) return ['soul and motown'];
  return [];
}

export function matchesActGenres(act, selected = []) {
  const wanted = selected.map(normalize).filter(Boolean);
  if (!wanted.length) return true;
  const actual = getActGenreTokens(act);
  return wanted.every(token => actual.includes(token));
}
