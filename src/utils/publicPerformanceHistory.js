import { locationPages } from '../data/locationPages.js';
export function countyLink(county) {
  const text = String(county || '').trim().toLowerCase();
  const normal = /^(?:(?:greater|central|north|south|east|west|north west|north east|south west|south east) )?london$/.test(text) ? 'London' : county;
  const config = locationPages.find(page => page.name.toLowerCase() === String(normal || '').trim().toLowerCase());
  return config ? { name: config.name, slug: config.slug, href: `/wedding-bands-${config.slug}/` } : null;
}
export const venueHref = venue => `/venues/?venue=${encodeURIComponent(venue.venueId || venue.id)}&county=${encodeURIComponent(venue.venueCounty || venue.county || '')}`;
export function reviewCountyLink(review, index, history) {
  const id = String(review._id || review.reviewId || '');
  const match = history?.reviewCounties?.find(item => id ? item.reviewId === id : item.index === index);
  return countyLink(match?.county || review.eventLocation);
}
export function formatPerformanceMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) return '';
  const [year, number] = month.split('-').map(Number);
  if (number < 1 || number > 12) return '';
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function readInitialHistory(slug) {
  if (typeof document === 'undefined') return null;
  const node = document.getElementById('initial-act-local-data');
  if (node?.dataset?.actSlug !== slug) return null;
  try { return JSON.parse(node.textContent); } catch { return null; }
}
