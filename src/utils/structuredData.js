export const SITE_ORIGIN = 'https://thesupremecollective.co.uk';

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

export const buildPageSchema = ({ route, title, description, act, post, bands = [] }) => {
  const url = `${SITE_ORIGIN}${route}`;
  const organisation = { '@type': 'Organization', '@id': `${SITE_ORIGIN}/#organization`, name: 'The Supreme Collective', url: `${SITE_ORIGIN}/` };
  const website = { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, name: 'The Supreme Collective', url: `${SITE_ORIGIN}/`, publisher: { '@id': organisation['@id'] } };
  const type = route === '/about' ? 'AboutPage' : route === '/contact' ? 'ContactPage' : ['/acts', '/blog', '/venues'].includes(route) ? 'CollectionPage' : 'WebPage';
  const page = { '@type': type, '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': website['@id'] } };
  const graph = [organisation, website, page];
  if (act) {
    const group = buildMusicGroup(act, url);
    graph.push(group);
    page.mainEntity = { '@id': group['@id'] };
  } else if (post) {
    const article = { '@type': 'BlogPosting', '@id': `${url}#article`, headline: post.title, description: post.metaDescription || post.excerpt, mainEntityOfPage: { '@id': page['@id'] }, author: { '@type': 'Organization', name: post.author || organisation.name }, publisher: { '@id': organisation['@id'] }, ...(post.publishedAt ? { datePublished: post.publishedAt } : {}), ...(post.heroImage ? { image: new URL(post.heroImage, SITE_ORIGIN).href } : {}) };
    graph.push(article);
    page.mainEntity = { '@id': article['@id'] };
  } else if (route === '/acts') {
    const list = { '@type': 'ItemList', '@id': `${url}#bands`, itemListElement: bands.map(({ route: bandRoute, act: band }, index) => ({ '@type': 'ListItem', position: index + 1, name: band.tscName, url: `${SITE_ORIGIN}${bandRoute}` })) };
    graph.push(list);
    page.mainEntity = { '@id': list['@id'] };
  }
  return { '@context': 'https://schema.org', '@graph': graph };
};

export const serializeSchema = value => JSON.stringify(value).replace(/</g, '\\u003c');
