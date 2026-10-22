/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { BACKEND } from "../apiBase";
import SEO from '../components/SEO';
import { cleanVenueName } from '../utils/venueName.js';
import { Link } from 'react-router-dom';
import VenueEveningExample from '../components/VenueEveningExample.jsx';
import { countyLink, formatPerformanceMonth } from '../utils/publicPerformanceHistory.js';

const hasText = (value) => String(value || "").trim().length > 0;
const isPublicRoomName = (value) => {
  const name = String(value || "").trim();
  return hasText(name)
    && name.toLowerCase() !== "main / unspecified room"
    && !/(?:\/\/\/)?[a-z]+(?:\.[a-z]+){2}/i.test(name)
    && !/(?:google maps?|what\s*3\s*words?|\bw3w\b|parking|entrance|station|load(?:ing)?|spaces? available)/i.test(name)
    && name.length <= 55;
};

const Info = ({ label, value }) => {
  if (!hasText(value)) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">{label}</p>
      <p className="whitespace-pre-line leading-6 text-gray-800">{value}</p>
    </div>
  );
};

const LinkButton = ({ href, children }) => {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white">
      {children}
    </a>
  );
};

const ClaimRequest = ({ venue }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contactName: "", contactEmail: "", contactRole: "", requestMessage: "", partnershipInterest: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch(`${BACKEND}/api/venues/public/${venue._id}/claim-request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Could not send this request");
      setMessage(data.message); setOpen(false);
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };
  return <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Represent {venue.name}?</p><p className="mt-1 text-sm text-gray-600">Claim this listing to suggest updates, add official photography and discuss working together.</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">{open ? "Close" : "Claim or update this listing"}</button></div>
    {message && <p className="mt-3 rounded-xl bg-white p-3 text-sm">{message}</p>}
    {open && <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-sm font-medium">Your name<input required className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label><label className="text-sm font-medium">Venue work email<input required type="email" className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></label><label className="text-sm font-medium md:col-span-2">Your role at the venue<input className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" value={form.contactRole} onChange={(event) => setForm({ ...form, contactRole: event.target.value })} /></label><label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" className="mt-1" checked={form.partnershipInterest} onChange={(event) => setForm({ ...form, partnershipInterest: event.target.checked })} /><span>I’m also interested in discussing a recommended-supplier partnership.</span></label><label className="text-sm font-medium md:col-span-2">Message (optional)<textarea rows={3} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3" value={form.requestMessage} onChange={(event) => setForm({ ...form, requestMessage: event.target.value })} /></label><button disabled={saving} className="rounded-full bg-black px-5 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2">{saving ? "Sending…" : "Request secure editing access"}</button></form>}
  </div>;
};

const queryParam = name => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get(name) || '';
const VenueGuide = () => {
  const [venues, setVenues] = useState([]);
  const [query, setQuery] = useState("");
  const [venueId, setVenueId] = useState(() => queryParam('venue'));
  const [county, setCounty] = useState(() => queryParam('county'));
  const [room, setRoom] = useState("");
  const [feature, setFeature] = useState("");
  const [expanded, setExpanded] = useState(() => queryParam('venue'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${BACKEND}/api/venues/public`);
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load venue information");
        if (active) setVenues((data.venues || []).map(venue => ({ ...venue, name: cleanVenueName(venue.name), address: cleanVenueName(venue.address) })));
      } catch (err) {
        if (active) setError(err.message || "Unable to load venue information");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const counties = useMemo(() => [...new Set(venues.map((venue) => venue.county).filter(Boolean))].sort(), [venues]);
  const rooms = useMemo(() => [...new Set(venues.flatMap((venue) => (venue.rooms || []).map((item) => item.name)).filter(isPublicRoomName))].sort(), [venues]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return venues.filter((venue) => {
      const venueRooms = venue.rooms || [];
      const matchesText = !needle || [venue.name, venue.address, venue.postcode, venue.county, ...venueRooms.map((item) => item.name)]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
      const matchesCounty = !county || venue.county === county;
      const matchesRoom = !room || venueRooms.some((item) => item.name === room);
      const matchesFeature = !feature
        || (feature === "sound" && venueRooms.some((item) => hasText(item.soundLimitations) || hasText(item.soundLimiterDb)))
        || (feature === "changing" && venueRooms.some((item) => hasText(item.changingRoom)))
        || (feature === "parking" && hasText(venue.parking));
      return (!venueId || venue._id === venueId) && matchesText && matchesCounty && matchesRoom && matchesFeature;
    });
  }, [county, feature, query, room, venues, venueId]);

  return (
    <main className="mx-auto max-w-6xl pb-20 pt-6">
      <SEO title="Wedding & Event Venue Guide | The Supreme Collective" description="Explore wedding venues, performance spaces, parking information and room-specific sound restrictions." path="/venues" />
      <section className="overflow-hidden rounded-[2rem] bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6677]">Plan with confidence</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">The Supreme Collective Venue Guide</h1>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-gray-300">Explore venue profiles, parking information, changing facilities and room-specific sound restrictions gathered from venues and our previous events.</p>
      </section>

      <section className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
        <label htmlFor="venue-search" className="mb-2 block font-medium text-gray-800">Find a venue or room</label>
        <input id="venue-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by venue, postcode, county or room" className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-lg outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            County
            <select value={county} onChange={(event) => setCounty(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-900">
              <option value="">All counties</option>
              {counties.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Room
            <select value={room} onChange={(event) => setRoom(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-900">
              <option value="">All rooms</option>
              {rooms.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Useful details
            <select value={feature} onChange={(event) => setFeature(event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-900">
              <option value="">Any details</option>
              <option value="sound">Sound limitations recorded</option>
              <option value="changing">Changing room recorded</option>
              <option value="parking">Parking recorded</option>
            </select>
          </label>
        </div>
        {(query || county || room || feature || venueId) && (
          <div className="mt-4 flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-600">{filtered.length} {filtered.length === 1 ? "venue" : "venues"} found</span>
            <button type="button" onClick={() => { setQuery(""); setCounty(""); setRoom(""); setFeature(""); setVenueId(''); }} className="font-medium underline underline-offset-4">Clear filters</button>
          </div>
        )}
      </section>

      <p className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">Venue arrangements can change. Details marked as not recently verified should be checked with the venue for your event date.</p>

      {loading && <p className="py-16 text-center text-gray-500">Loading venue guide…</p>}
      {error && <p className="my-8 rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="py-16 text-center text-gray-500">No venues match that search yet.</p>}

      <div className="mt-7 grid gap-5">
        {filtered.map((venue) => {
          const isOpen = expanded === venue._id;
          const isVerified = venue.reviewStatus === "reviewed" && venue.lastVerifiedAt;
          return (
            <article key={venue._id} className="overflow-hidden rounded-3xl border border-gray-200 bg-[#fafafa] shadow-sm">
              <button type="button" onClick={() => setExpanded(isOpen ? "" : venue._id)} className="flex w-full items-start justify-between gap-5 p-6 text-left sm:p-8" aria-expanded={isOpen}>
                <span className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
                  {venue.photoUrl && <img src={venue.photoUrl} alt={venue.photoAlt || `${venue.name} wedding venue`} loading="lazy" width="240" height="150" className="aspect-[8/5] w-full shrink-0 rounded-2xl object-cover sm:w-48" />}
                  <span>
                  <span className="block text-2xl font-semibold text-gray-900">{venue.name}</span>
                  <span className="mt-1 block text-gray-600">{[venue.address, venue.postcode, venue.county].filter(Boolean).join(" · ") || "Location details being added"}</span>
                  <span className="mt-3 block text-sm text-gray-500">{(venue.rooms || []).length} {(venue.rooms || []).length === 1 ? "room" : "rooms"} recorded{venue.performances?.length ? ` · ${venue.performances.length} ${venue.performances.length === 1 ? "act has" : "acts have"} performed here` : ""}</span>
                  </span>
                </span>
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xl transition ${isOpen ? "rotate-45 bg-black text-white" : "bg-white"}`}>+</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 bg-white p-6 sm:p-8">
                  <div className="mb-6 flex flex-wrap gap-3">
                    <LinkButton href={venue.googleMapsUrl}>Google Maps</LinkButton>
                    <LinkButton href={venue.what3wordsUrl}>what3words</LinkButton>
                    <LinkButton href={venue.website}>Venue website</LinkButton>
                    <LinkButton href={venue.enquiryUrl}>Enquire with venue</LinkButton>
                    {venue.publicEmail && <a href={`mailto:${venue.publicEmail}`} className="inline-flex rounded-full border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white">Email venue</a>}
                    {venue.publicPhone && <a href={`tel:${venue.publicPhone}`} className="inline-flex rounded-full border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white">Call venue</a>}
                  </div>

                  {venue.publicDescription && <p className="mb-6 max-w-4xl whitespace-pre-line text-lg leading-8 text-gray-700">{venue.publicDescription}</p>}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Info label="Parking" value={venue.parking} />
                  </div>

                  {!!venue.rooms?.length && <h2 className="mb-4 mt-9 text-2xl font-semibold">Rooms</h2>}
                  <div className="grid gap-5">
                    {(venue.rooms || []).map((room) => (
                      <section key={room._id || room.name} className="rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                        <h3 className="text-xl font-semibold">{room.name || "Room details"}</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <Info label="Performance area" value={room.performanceArea} />
                          <Info label="Changing room" value={room.changingRoom} />
                          <Info label="Capacity" value={room.capacity} />
                          <Info label="PA, lighting & stage" value={[room.paAndLighting, room.powerAndStage].filter(Boolean).join("\n")} />
                          <Info label="Curfew & finish restrictions" value={room.curfewAndCloseTime} />
                        </div>
                        {(hasText(room.soundLimitations) || hasText(room.soundLimiterDb)) && (
                          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Sound limitations</p>
                            {hasText(room.soundLimiterDb) && <p className="font-semibold text-amber-950">Limiter: {room.soundLimiterDb}</p>}
                            {hasText(room.soundLimitations) && <p className="mt-1 whitespace-pre-line leading-6 text-amber-950">{room.soundLimitations}</p>}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>

                  {!!venue.performances?.length && (
                    <div className="mt-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Our acts that have performed here</p>
                      <ul className="mt-3 space-y-3">{venue.performances.map(act => <li key={act.slug}><Link className="font-medium underline underline-offset-4" to={`/act/${act.slug}/`}>{act.name}</Link><span className="ml-2 text-sm text-gray-600">{act.months.map(formatPerformanceMonth).join(' · ')}</span></li>)}</ul>
                      <p className="mt-3 text-sm text-gray-500">From past booking and event-sheet records, grouped under each band’s current name.</p>
                    </div>
                  )}
                  {countyLink(venue.county) && <Link className="mt-5 inline-block underline underline-offset-4" to={countyLink(venue.county).href}>Explore wedding bands in {countyLink(venue.county).name}</Link>}
                  {!!venue.examples?.length && <div className="mt-7 grid gap-5">{venue.examples.map(example => <VenueEveningExample key={example.id} example={example} />)}</div>}
                  <p className="mt-7 text-sm text-gray-500">{venue.venueVerified ? `Verified by the venue${venue.claimedAt ? ` on ${new Date(venue.claimedAt).toLocaleDateString("en-GB")}` : ""}.` : isVerified ? `Last verified ${new Date(venue.lastVerifiedAt).toLocaleDateString("en-GB")}.` : "This information has not yet been recently verified. Please confirm important restrictions directly with the venue."}</p>
                  <ClaimRequest venue={venue} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
};

export default VenueGuide;
