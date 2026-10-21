// Some imported venue names include a sentence prefix from the booking notes.
export const cleanVenueName = value => String(value ?? '')
  .replace(/^\s*for\s+the\s+address\s+we\s+have\s*:\s*/i, '')
  .trim();
