export const PUBLIC_ORIGIN = 'https://thesupremecollective.co.uk';
const publicRoute = /^\/(?:acts|about|contact|blog|venues(?:\/claim\/[^/]+)?|privacy|terms|wedding-bands-[a-z-]+|act\/[^/]+|blog\/[^/]+)$/;

// Netlify serves these pre-rendered directory pages at trailing-slash URLs.
// Leave private routes, assets, external destinations and query values alone.
export function publicHref(value = '/') {
  const text = String(value || '/');
  const absolute = text.startsWith(PUBLIC_ORIGIN + '/');
  const input = absolute ? text.slice(PUBLIC_ORIGIN.length) : text;
  if (!input.startsWith('/') || input.startsWith('//')) return text;
  const split = input.search(/[?#]/);
  const pathname = split < 0 ? input : input.slice(0, split);
  const suffix = split < 0 ? '' : input.slice(split);
  const clean = pathname.replace(/\/+$/, '') || '/';
  const finalPath = publicRoute.test(clean) ? clean + '/' : pathname;
  return (absolute ? PUBLIC_ORIGIN : '') + finalPath + suffix;
}

export function publicCanonicalUrl(value = '/') {
  const clean = String(value || '/').split(/[?#]/)[0];
  const pathname = clean.startsWith('/') ? clean : '/' + clean;
  return PUBLIC_ORIGIN + publicHref(pathname);
}
