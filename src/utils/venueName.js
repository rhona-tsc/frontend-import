// Some imported venue names include a sentence prefix from the booking notes.
export const cleanVenueText = value => String(value ?? '')
  .replace(/^\s*for\s+the\s+address\s+we\s+have\s*:\s*/i, '')
  .trim();

const lowerCaseWords = new Set(['a', 'an', 'and', 'at', 'by', 'de', 'for', 'in', 'la', 'le', 'of', 'on', 'the', 'to']);
const preservedWords = new Map([
  ['bbc', 'BBC'], ['ii', 'II'], ['iii', 'III'], ['iv', 'IV'],
  ['o2', 'O2'], ['raf', 'RAF'], ['uk', 'UK'], ['usa', 'USA'], ['ymca', 'YMCA'],
]);

const properCasePart = (part, index, parts) => {
  if (!part || !/[\p{L}\p{N}]/u.test(part)) return part;
  const lower = part.toLocaleLowerCase('en-GB');
  if (preservedWords.has(lower)) return preservedWords.get(lower);
  if (/\d/.test(part)) return part;
  if (index > 0 && index < parts.length - 1 && lowerCaseWords.has(lower) && !/[:.!?]$/.test(parts[index - 1])) return lower;
  // Preserve intentional internal capitals in names such as McDonald or DeVere.
  if (/[a-z].*[A-Z]|[A-Z].*[a-z].*[A-Z]/.test(part)) return part;
  return lower
    .replace(/(^|[-'’])(\p{L})/gu, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase('en-GB')}`)
    .replace(/(['’])S\b/g, '$1s');
};

export const cleanVenueName = value => {
  const cleaned = cleanVenueText(value);
  if (!cleaned) return '';
  const parts = cleaned.split(/(\s+)/);
  const words = parts.filter(part => !/^\s+$/.test(part));
  let wordIndex = 0;
  return parts.map(part => {
    if (/^\s+$/.test(part)) return part;
    return properCasePart(part, wordIndex++, words);
  }).join('');
};
