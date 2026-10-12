import { bandImageDescriptions } from '../data/bandImageDescriptions.js';

// Cloudinary responsive variants must use the same description as their source.
const sourceUrl = url => String(url || '').split('?')[0].replace(/\/upload\/(?:.*?\/)?(v\d+\/)/, '/upload/$1');

export const getBandImageAlt = (image, act = {}, index) => {
  const url = typeof image === 'string' ? image : image?.url;
  const authored = typeof image === 'object' && (image?.alt || image?.description);
  if (typeof authored === 'string' && authored.trim()) return authored.trim();
  return bandImageDescriptions[sourceUrl(url)] || `${act.tscName || act.name || 'Live band'} — band photograph${Number.isInteger(index) ? ` ${index + 1}` : ''}`;
};
