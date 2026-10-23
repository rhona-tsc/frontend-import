import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import VenueEveningExample from './VenueEveningExample.jsx';
import { countyLink, formatPerformanceMonth, venueHref, reviewCountyLink } from '../utils/publicPerformanceHistory.js';
import { cleanVenueName } from '../utils/venueName.js';

export default function ActLocalConnections({ history }) {
  if (!history?.venues?.length && !history?.examples?.length) return null;
  return <section className="mt-12" id="venues-and-locations">
    {!!history.venues.length && <>
      <h2 className="text-3xl font-semibold">Where {history.name} has performed</h2>
      <p className="mt-4 leading-7 text-gray-600">Venues from our past booking and event-sheet records, including bookings made under the band’s other names. Venue arrangements can change; we’ll check the details for your date.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{history.venues.map(venue => {
        const county = countyLink(venue.county);
        return <article className="rounded-2xl border border-gray-200 bg-white p-5" key={venue.id}>
          <h3 className="text-lg font-semibold"><Link className="underline underline-offset-4" to={venueHref(venue)}>{cleanVenueName(venue.name)}</Link></h3>
          <p className="mt-2 text-sm text-gray-600">{venue.months.map(formatPerformanceMonth).filter(Boolean).join(' · ')}</p>
          {county && <Link className="mt-3 inline-block text-sm underline underline-offset-4" to={county.href}>Explore bands in {county.name}</Link>}
        </article>;
      })}</div>
    </>}
    {!!history.examples?.length && <div className="mt-8 grid gap-6">{history.examples.map(example => <VenueEveningExample key={example.id} example={example} />)}</div>}
  </section>;
}

export function InitialActReviews({ reviews = [], history }) {
  if (!reviews.length) return null;
  return <section id="reviews"><h2>Client reviews</h2>{reviews.map((review, index) => {
    if (!review.comment) return null;
    const county = reviewCountyLink(review, index, history);
    return <figure key={review._id || review.reviewId || index}>
      <blockquote>{review.comment}</blockquote>
      <figcaption>{review.clientFirstName || 'Client'}{review.eventType ? ` · ${review.eventType}` : ''}{county && <> · <Link to={county.href}>Explore bands in {county.name}</Link></>}</figcaption>
    </figure>;
  })}</section>;
}
ActLocalConnections.propTypes = { history: PropTypes.object };
InitialActReviews.propTypes = { reviews: PropTypes.arrayOf(PropTypes.object), history: PropTypes.object };
