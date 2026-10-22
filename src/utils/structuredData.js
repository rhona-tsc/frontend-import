export const SITE_ORIGIN = 'https://thesupremecollective.co.uk';
import { publicCanonicalUrl } from './publicUrls.js';

export const buildMusicGroup = (act = {}, url, image) => {
  const current = Array.isArray(act.genre) ? act.genre : typeof act.genre === 'string' ? [act.genre] : [];
  const fallback = Array.isArray(act.genres) ? act.genres : [];
  const genres = (current.some(value => String(value || '').trim()) ? current : fallback)
    .filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean);
  return {
    '@type': 'MusicGroup',
    '@id': `${url}#music-group`,
    name: act.tscName || act.name,
    url,
    ...(genres.length ? { genre: [...new Set(genres)] } : {}),
    ...(image ? { image } : {}),
  };
};

export const buildPageSchema = ({ route, title, description, act, post, bands = [], location }) => {
  route = route.replace(/\/+$/, '') || '/';
  const url = publicCanonicalUrl(route);
  const organisation = { '@type': 'Organization', '@id': `${SITE_ORIGIN}/#organization`, name: 'The Supreme Collective', url: `${SITE_ORIGIN}/` };
  const website = { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: 'The Supreme Collective', url: `${SITE_ORIGIN}/`, publisher: { '@id': organisation['@id'] } };
  const type = route === '/about' ? 'AboutPage' : route === '/contact' ? 'ContactPage' : location || ['/acts', '/blog', '/venues'].includes(route) ? 'CollectionPage' : 'WebPage';
  const page = { '@type': type, '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': website['@id'] } };
  const graph = [organisation, website, page];
  if (route !== '/') {
    const labels = { '/acts': 'Bands', '/about': 'About Us', '/contact': 'Contact', '/blog': 'Blog', '/venues': 'Venue Guide' };
    const items = [{ name: 'Home', item: `${SITE_ORIGIN}/` }];
    if (act || location) items.push({ name: 'Bands', item: `${SITE_ORIGIN}/acts/` });
    if (post) items.push({ name: 'Blog', item: `${SITE_ORIGIN}/blog/` });
    items.push({ name: location?.county || act?.tscName || act?.name || post?.title || labels[route] || title, item: url });
    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumbs`,
      itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
    };
    graph.push(breadcrumbs);
    page.breadcrumb = { '@id': breadcrumbs['@id'] };
  }
  if (location) {
    const list = { '@type': 'ItemList', '@id': `${url}#bands`, itemListElement: (location.bands || []).slice(0, 9).map((band, index) => ({ '@type': 'ListItem', position: index + 1, name: band.name, url: publicCanonicalUrl(`/act/${band.slug}`) })) };
    graph.push(list, { '@type': 'Service', '@id': `${url}#service`, name: `Wedding band hire in ${location.county}`, serviceType: 'Wedding band hire', areaServed: { '@type': 'Place', name: location.county }, provider: { '@id': organisation['@id'] }, url });
    page.mainEntity = { '@id': list['@id'] };
    page.about = { '@id': `${url}#service` };
  } else if (act) {
    const group = buildMusicGroup(act, url);
    graph.push(group);
    page.mainEntity = { '@id': group['@id'] };
  } else if (post) {
    // Only emit a publication timestamp when the source includes its time and zone.
    // Date-only editorial records remain visible on the page; do not invent a time.
    const publishedAt = typeof post.publishedAt === 'string' && /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(post.publishedAt) && !Number.isNaN(Date.parse(post.publishedAt)) ? post.publishedAt : undefined;
    const author = { '@type': post.authorType === 'Person' ? 'Person' : 'Organization', name: post.author || organisation.name, ...(post.authorUrl ? { url: post.authorUrl } : !post.author || post.author === organisation.name ? { '@id': organisation['@id'], url: organisation.url } : {}) };
    const article = { '@type': 'BlogPosting', '@id': `${url}#article`, headline: post.title, description: post.metaDescription || post.excerpt, mainEntityOfPage: { '@id': page['@id'] }, author, publisher: { '@id': organisation['@id'] }, ...(publishedAt ? { datePublished: publishedAt } : {}), ...(post.heroImage ? { image: new URL(post.heroImage, SITE_ORIGIN).href } : {}) };
    graph.push(article);
    page.mainEntity = { '@id': article['@id'] };
  } else if (route === '/acts') {
    const list = { '@type': 'ItemList', '@id': `${url}#bands`, itemListElement: bands.map(({ route: bandRoute, act: band }, index) => ({ '@type': 'ListItem', position: index + 1, name: band.tscName, url: publicCanonicalUrl(bandRoute) })) };
    graph.push(list);
    page.mainEntity = { '@id': list['@id'] };
  }
  return { '@context': 'https://schema.org', '@graph': graph };
};

export const serializeSchema = value => JSON.stringify(value).replace(/</g, '\\u003c');
