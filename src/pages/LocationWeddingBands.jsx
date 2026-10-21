import { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import LocationWeddingBandsContent from '../components/LocationWeddingBandsContent';
import { BACKEND } from '../apiBase';
import { locationPages, locationMeta } from '../data/locationPages.js';
import { ShopContext } from '../context/ShopContext';
import { gtagEvent } from '../utils/gtag.js';
import { buildPageSchema, serializeSchema } from '../utils/structuredData.js';

const initialData = slug => {
  const node = typeof document !== 'undefined' && document.getElementById('initial-location-data');
  if (node?.dataset?.county !== slug) return null;
  try { return JSON.parse(node.textContent); } catch { return null; }
};

export default function LocationWeddingBands({ slug, initialLocation }) {
  const { setShowSearch } = useContext(ShopContext);
  const config = locationPages.find(item => item.slug === slug);
  const [data, setData] = useState(() => initialLocation || initialData(slug));
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(initialData(slug)); setError(false);
    fetch(`${BACKEND}/api/locations/public`, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success || !result.locations?.[slug]) throw new Error('Location unavailable');
      setData(result.locations[slug]);
    }).catch(err => { if (err.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [slug]);
  const current = data?.county === config.name ? data : null;
  const meta = locationMeta(config);
  const route = `/wedding-bands-${slug}`;
  return <>
    <SEO {...meta} path={route} />
    <Helmet><script type="application/ld+json">{serializeSchema(buildPageSchema({ route, ...meta, location: current || { county: config.name, bands: [] } }))}</script></Helmet>
    <LocationWeddingBandsContent slug={slug} data={current} error={error}
      openSearch={event => { event.preventDefault(); gtagEvent('location_search_open', { county_slug: slug }); setShowSearch(true); }}
      trackContact={method => gtagEvent('location_contact_click', { county_slug: slug, contact_method: method })} />
  </>;
}
LocationWeddingBands.propTypes = { slug: PropTypes.oneOf(locationPages.map(page => page.slug)).isRequired, initialLocation: PropTypes.object };
