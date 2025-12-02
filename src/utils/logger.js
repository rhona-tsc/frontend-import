// logger.js
export const DEBUG = import.meta.env.DEV && !localStorage.getItem("DISABLE_LOGS");
export const log = (...a) => { if (DEBUG) console.log(...a); };

// Use this instead of dumping big objects:
export const logBadges = (label, badges) => {
  if (!DEBUG) return;
  const keys = Object.keys(badges || {});
  console.log(`${label} keys:`, keys.length, 'sample:', keys.slice(0, 3));
};