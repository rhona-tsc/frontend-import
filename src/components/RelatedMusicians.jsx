import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cloudinaryImage } from '../utils/cloudinaryImage.js';

function ConnectionCarousel({ title, titleLead, titleEmphasis, description, cards }) {
  const track = useRef(null);
  const id = useId();
  const [position, setPosition] = useState({ previous: false, next: false });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setPosition({ previous: el.scrollLeft > 2, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { el.removeEventListener('scroll', update); observer.disconnect(); };
  }, [cards]);
  if (!cards?.length) return null;
  const move = direction => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <section aria-labelledby={id} className="mt-14">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h2 id={id} className="mb-3 inline-flex items-center gap-2 text-xl sm:text-2xl font-normal uppercase"><span className="text-gray-500">{titleLead} <span className="font-medium text-gray-700">{titleEmphasis}</span></span><span aria-hidden="true" className="h-px w-8 shrink-0 bg-[#ff6667] sm:h-[2px] sm:w-12" /></h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => move(-1)} disabled={!position.previous} aria-label={`Previous ${title.toLowerCase()}`} className="w-10 h-10 border border-gray-300 rounded-full text-xl disabled:opacity-25 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">←</button>
          <button type="button" onClick={() => move(1)} disabled={!position.next} aria-label={`Next ${title.toLowerCase()}`} className="w-10 h-10 border border-gray-300 rounded-full text-xl disabled:opacity-25 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">→</button>
        </div>
      </div>
      <div ref={track} role="list" aria-label={title} tabIndex={0} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {cards.map(card => (
          <div role="listitem" key={card._id} className="w-[72%] sm:w-60 lg:w-64 shrink-0 snap-start">
            <Link to={card.href} className="group block h-full overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                {card.image ? <img src={cloudinaryImage(card.image, 640)} alt={card.name} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div aria-hidden="true" className="w-full h-full flex items-center justify-center text-4xl text-gray-400">♪</div>}
              </div>
              <div className="p-4"><h3 className="font-semibold text-gray-900">{card.name}</h3>{card.role && <p className="text-sm text-gray-500 mt-1">{card.role}</p>}<span className="inline-block text-sm text-gray-600 mt-3">View profile →</span></div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function RelatedMusicians({ currentActId, musicianName = "This musician" }) {
  const [connections, setConnections] = useState(null);
  useEffect(() => {
    setConnections(null);
    if (!currentActId) return;
    const controller = new AbortController();
    const base = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
    fetch(`${base}/api/musician/profile/${encodeURIComponent(currentActId)}/connections`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Connections unavailable'); return response.json(); })
      .then(setConnections).catch(error => { if (error.name !== 'AbortError') console.error('Could not load musician connections'); });
    return () => controller.abort();
  }, [currentActId]);
  if (!connections) return null;
  const musiciansWithPhotos = (connections.musicians || []).filter(card => typeof card.image === 'string' && card.image.trim());
  return <div className="w-full">
    <ConnectionCarousel title={`Cover bands ${musicianName}’s in`} titleLead="Cover bands" titleEmphasis={`${musicianName}’s in`} description={`${musicianName} is a regular member of these Supreme Collective bands.`} cards={connections.regularBands} />
    <ConnectionCarousel title={`Bands ${musicianName} deps for`} titleLead="Bands" titleEmphasis={`${musicianName} deps for`} description={`${musicianName} is a deputy performer for these Supreme Collective bands.`} cards={connections.deputyBands} />
    <ConnectionCarousel title={`Musicians ${musicianName}’s performed with`} titleLead="Musicians" titleEmphasis={`${musicianName}’s performed with`} description="Meet the musicians they’ve shared the stage with at TSC events." cards={musiciansWithPhotos} />
  </div>;
}
