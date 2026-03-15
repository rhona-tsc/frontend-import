export const SITE_ORIGIN = "https://thesupremecollective.co.uk";

export const canonicalForPath = (path = "/") => {
  const p = String(path || "/").startsWith("/") ? String(path || "/") : `/${path}`;
  // ensure home is "/" not empty
  return `${SITE_ORIGIN}${p === "" ? "/" : p}`;
};