import React, { useEffect, useMemo, useState } from "react";
import { BACKEND } from "../apiBase";
import SEO from '../components/SEO';
import { cleanVenueName } from '../utils/venueName.js';

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

const VenueGuide = () => {
  const [venues, setVenues] = useState([]);
  const [query, setQuery] = useState("");
  const [venueId, setVenueId] = useState(() => new URLSearchParams(window.location.search).get('venue') || '');
  const [county, setCounty] = useState(() => new URLSearchParams(window.location.search).get('county') || "");
  const [room, setRoom] = useState("");
  const [feature, setFeature] = useState("");
  const [expanded, setExpanded] = useState(() => new URLSearchParams(window.location.search).get('venue') || "");
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
        || (feature === "parking" && hasText(venue.parking))
        || (feature === "access" && (hasText(venue.generalDirections) || venueRooms.some((item) => hasText(item.accessAndLoading))));
      return (!venueId || venue._id === venueId) && matchesText && matchesCounty && matchesRoom && matchesFeature;
    });
  }, [county, feature, query, room, venues, venueId]);

  return (
    <main className="mx-auto max-w-6xl pb-20 pt-6">
      <SEO title="Wedding & Event Venue Guide | The Supreme Collective" description="Explore practical venue information for live music, including access, parking, performance spaces and sound restrictions." path="/venues" />
      <section className="overflow-hidden rounded-[2rem] bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6677]">Plan with confidence</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">The Supreme Collective Venue Guide</h1>
        <p className="mt-5 max-w-3xl text-lg leading-7 text-gray-300">Practical details gathered from venues and our previous events, including access, parking, changing facilities and room-specific sound restrictions.</p>
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
              <option value="access">Access directions recorded</option>
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
                <span>
                  <span className="block text-2xl font-semibold text-gray-900">{venue.name}</span>
                  <span className="mt-1 block text-gray-600">{[venue.address, venue.postcode, venue.county].filter(Boolean).join(" · ") || "Location details being added"}</span>
                  <span className="mt-3 block text-sm text-gray-500">{(venue.rooms || []).length} {(venue.rooms || []).length === 1 ? "room" : "rooms"} recorded{venue.actsPerformed?.length ? ` · ${venue.actsPerformed.length} ${venue.actsPerformed.length === 1 ? "act has" : "acts have"} performed here` : ""}</span>
                </span>
                <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xl transition ${isOpen ? "rotate-45 bg-black text-white" : "bg-white"}`}>+</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 bg-white p-6 sm:p-8">
                  <div className="mb-6 flex flex-wrap gap-3">
                    <LinkButton href={venue.googleMapsUrl}>Google Maps</LinkButton>
                    <LinkButton href={venue.what3wordsUrl}>what3words</LinkButton>
                    <LinkButton href={venue.website}>Venue website</LinkButton>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Info label="Parking" value={venue.parking} />
                    <Info label="Directions & arrival" value={venue.generalDirections} />
                  </div>

                  {!!venue.rooms?.length && <h2 className="mb-4 mt-9 text-2xl font-semibold">Rooms</h2>}
                  <div className="grid gap-5">
                    {(venue.rooms || []).map((room) => (
                      <section key={room._id || room.name} className="rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                        <h3 className="text-xl font-semibold">{room.name || "Room details"}</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <Info label="Performance area" value={room.performanceArea} />
                          <Info label="Access & loading" value={room.accessAndLoading} />
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

                  {!!venue.actsPerformed?.length && (
                    <div className="mt-7">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Our acts that have performed here</p>
                      <p className="mt-2 text-gray-800">{venue.actsPerformed.join(" · ")}</p>
                    </div>
                  )}
                  <p className="mt-7 text-sm text-gray-500">{isVerified ? `Last verified ${new Date(venue.lastVerifiedAt).toLocaleDateString("en-GB")}.` : "This information has not yet been recently verified. Please confirm important restrictions directly with the venue."}</p>
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
