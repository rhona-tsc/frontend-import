import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { locationPages, locationCopy, contactOptions } from '../data/locationPages.js';
import { getBandImageAlt } from '../utils/bandImageAlt.js';
import { cleanVenueName } from '../utils/venueName.js';
import { bandImageDelivery, bandImageSrcSet } from '../utils/bandImageDelivery.js';
import VenueEveningExample from './VenueEveningExample.jsx';
export default function LocationWeddingBandsContent({ slug, data, error = false, openSearch, trackContact }) {
  const config = locationPages.find(item => item.slug === slug);
  const current = data?.county === config.name ? data : null;
  return <main className="mx-auto max-w-6xl pb-16 pt-6">
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-gray-600"><Link to="/">Home</Link> / <Link to="/acts/">Bands</Link> / <span>{config.name}</span></nav>
    <section className="rounded-[2rem] bg-black px-6 py-12 text-white sm:px-12 sm:py-16">
      <p className="mb-3 text-sm uppercase tracking-[0.18em] text-[#ff6677]">Live music for your celebration</p>
      <h1 className="prata-regular max-w-4xl text-4xl leading-tight sm:text-6xl">Wedding bands in {config.name}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-200">{config.intro}</p>
      <div className="mt-8 flex flex-wrap gap-3"><a href="/acts/" onClick={openSearch} className="rounded-full bg-white px-6 py-3 font-semibold text-black">Add your date &amp; venue</a><a href="#bands" className="rounded-full border border-white px-6 py-3">Explore the bands</a></div>
      <p className="mt-6 text-sm text-gray-200">Prefer to speak to us? <a className="underline underline-offset-4" href="#contact-options">Email, WhatsApp, text or book a call</a></p>
    </section>
    <section id="bands" className="scroll-mt-24 py-14">
      <h2 className="text-3xl font-semibold">Bands for your {config.name} wedding</h2>
      <p className="mt-4 max-w-3xl leading-7 text-gray-600">{locationCopy.bandsIntro}</p>
      {!current && <p role="status" className="py-8 text-gray-600">{error ? 'The local selection is temporarily unavailable. You can still browse all bands or contact us.' : 'Loading the local selection…'}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{(current?.bands || []).slice(0, 9).map(band => <article key={band.id} className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <Link to={`/act/${band.slug}/`}><img src={bandImageDelivery(band.image)} srcSet={bandImageSrcSet(band.image)} sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 384px" alt={getBandImageAlt(band.image, { tscName: band.name })} loading="lazy" decoding="async" width="600" height="400" className="aspect-[3/2] w-full object-cover object-top" /></Link>
        <div className="p-5"><h3 className="text-2xl font-semibold"><Link to={`/act/${band.slug}/`}>{band.name}</Link></h3>
          {band.hasLocalOriginal && <p className="mt-3 inline-block rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-900">{locationCopy.localBadge}</p>}
          {band.hasVenueExperience && <p className="mt-2 text-sm font-medium text-gray-700">{locationCopy.venueExperience(config.name)}</p>}
          <p className="mt-3 leading-7 text-gray-600">{band.description || band.genres.join(', ')}</p><Link to={`/act/${band.slug}/`} className="mt-4 inline-block font-semibold underline underline-offset-4">Watch performances & explore lineups</Link>
        </div></article>)}</div>
      <Link to="/acts/" className="mt-7 inline-block rounded-full border border-black px-6 py-3">Explore all our bands</Link>
    </section>
    <section className="rounded-3xl bg-gray-50 p-6 sm:p-10"><h2 className="text-3xl font-semibold">{config.planningTitle}</h2><ul className="mt-6 space-y-4">{config.planning.map(tip => <li className="flex gap-3 leading-7 text-gray-700" key={tip}><span aria-hidden="true">•</span><span>{tip}</span></li>)}</ul><p className="mt-6 leading-7 text-gray-600">{locationCopy.areaIntro(config)}</p></section>
    <section className="py-14"><h2 className="text-3xl font-semibold">Explore wedding venues in {config.name}</h2><p className="mt-4 leading-7 text-gray-600">{locationCopy.venueIntro(config.name)}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(current?.venues || []).map(venue => {
        const hasPhoto = Boolean(venue.photoUrl);
        return <Link key={venue.id} to={`/venues/?venue=${encodeURIComponent(venue.id)}&county=${encodeURIComponent(venue.county)}`} aria-label={`View venue details for ${cleanVenueName(venue.name)}`} className={`group relative flex min-h-48 overflow-hidden rounded-2xl border transition ${hasPhoto ? 'border-transparent bg-gray-900 text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-950 hover:border-black'}`} style={hasPhoto ? { backgroundImage: `url(${JSON.stringify(venue.photoUrl)})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}>
          {hasPhoto && <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20 transition group-hover:from-black" />}
          <span className="relative z-10 mt-auto block p-5"><span className="block text-xl font-semibold">{cleanVenueName(venue.name)}</span><span className={`mt-2 block text-sm font-normal ${hasPhoto ? 'text-white/90' : 'text-gray-600'}`}>View venue details →</span></span>
        </Link>;
      })}</div>
      {current && !current.venues.length && <p className="mt-5 text-gray-600">We are adding venue records for this area. Send us your venue details for advice.</p>}
      <Link to={`/venues/?county=${encodeURIComponent(config.name === 'London' ? 'Greater London' : config.name)}`} className="mt-6 inline-block underline underline-offset-4">Explore the {config.name} venue guide</Link>
    </section>
    {!!current?.examples?.length && <section className="pb-14" id="example-evenings"><h2 className="mb-6 text-3xl font-semibold">Plan your evening music in {config.name}</h2><div className="grid gap-6">{current.examples.map(example => <VenueEveningExample key={example.id} example={example} />)}</div></section>}
    {!!current?.reviews?.length && <section className="pb-14"><h2 className="text-3xl font-semibold">What clients say about events in {config.name}</h2><div className="mt-7 grid gap-5 md:grid-cols-2">{current.reviews.map((review, index) => <figure key={review.id || `${review.actSlug}-${index}`} className="rounded-3xl border border-gray-200 p-6"><blockquote className="whitespace-pre-line leading-7 text-gray-700">“{review.comment}”</blockquote><figcaption className="mt-5 text-sm text-gray-600">{review.author} · <Link className="underline" to={`/act/${review.actSlug}/`}>{review.actName}</Link>{review.eventType ? ` · ${review.eventType}` : ''}</figcaption></figure>)}</div></section>}
    <section className="rounded-3xl bg-gray-50 p-6 sm:p-10"><h2 className="text-3xl font-semibold">Your {config.name} wedding music questions</h2><div className="mt-6 space-y-7">{[...config.faqs, locationCopy.priceFaq].map(faq => <div key={faq.q}><h3 className="text-xl font-semibold">{faq.q}</h3><p className="mt-2 leading-7 text-gray-600">{faq.a}</p></div>)}</div></section>
    <section id="contact-options" className="scroll-mt-24 mt-12 rounded-3xl border border-gray-200 p-6 sm:p-10"><h2 className="text-3xl font-semibold">Let’s find your wedding band</h2><p className="mt-4 leading-7 text-gray-600">Add your date and venue to explore bands and travel pricing, or talk through your ideas with us directly.</p><a href="/acts/" onClick={openSearch} className="mt-6 inline-block rounded-full bg-black px-6 py-3 font-semibold text-white">Add your date &amp; venue</a><p className="mt-6 text-gray-600">Prefer a conversation?</p><div className="mt-3 flex flex-wrap gap-3">{contactOptions.map(option => <a key={option.label} href={option.href} onClick={() => trackContact?.(option.label)} {...(option.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="rounded-full border border-gray-300 px-5 py-3 font-medium">{option.label}</a>)}</div></section>
    <section className="py-12"><h2 className="text-2xl font-semibold">Explore more locations</h2><div className="mt-5 flex flex-wrap gap-3">{locationPages.filter(item => item.slug !== slug).map(item => <Link key={item.slug} to={`/wedding-bands-${item.slug}/`} className="rounded-full border border-gray-300 px-5 py-2">{item.name}</Link>)}</div></section>
  </main>;
}
LocationWeddingBandsContent.propTypes = {
  slug: PropTypes.oneOf(locationPages.map(page => page.slug)).isRequired,
  data: PropTypes.object,
  error: PropTypes.bool,
  openSearch: PropTypes.func,
  trackContact: PropTypes.func,
};
