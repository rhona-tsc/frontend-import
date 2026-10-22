import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { venueHref, countyLink } from '../utils/publicPerformanceHistory.js';

export default function VenueEveningExample({ example }) {
  const county = countyLink(example.county);
  return <article id={example.id} className="scroll-mt-24 rounded-3xl border border-gray-200 bg-white p-5 sm:p-7">
    <h3 className="text-2xl font-semibold">An example evening planned for this venue</h3>
    <p className="mt-3 text-lg font-medium"><Link className="underline underline-offset-4" to={venueHref(example)}>{example.venueName}</Link>{example.room ? ` · ${example.room}` : ''}</p>
    <p className="mt-2 text-gray-600"><Link className="underline underline-offset-4" to={`/act/${example.actSlug}/`}>{example.actName}</Link> · {example.lineup} · {example.month}</p>
    <p className="mt-4 leading-7 text-gray-700">{example.summary}</p>
    <dl className="mt-5 divide-y divide-gray-200">{example.rows.map(([time, activity], index) => <div key={`${time}-${index}`} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="font-semibold">{time}</dt><dd className="text-gray-700">{activity}</dd></div>)}</dl>
    <p className="mt-5 text-sm leading-6 text-gray-600">Based on a past event-sheet plan, not a record of exact timings on the night or a fixed venue schedule. Timings, equipment and venue requirements must be agreed for your booking.{example.note ? ` ${example.note}` : ''}</p>
    {county && <Link className="mt-4 inline-block font-medium underline underline-offset-4" to={county.href}>Explore wedding bands in {county.name}</Link>}
  </article>;
}
VenueEveningExample.propTypes = { example: PropTypes.object.isRequired };
