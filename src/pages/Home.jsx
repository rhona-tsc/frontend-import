import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import Hero from '../components/Hero';

// 🪵 Debug helpers
const DBG = true;
const log = (...args) => DBG && console.log('🏠[Home]', ...args);
const group = (label, fn) => {
  if (!DBG) return fn();
  console.groupCollapsed(`🏠[Home] ${label}`);
  try { fn(); } finally { console.groupEnd(); }
};

// ⛳ Defer everything below the fold so Hero paints instantly
const SearchBar = lazy(() => import('../components/SearchBar'));
const NewActs = lazy(() => import('../components/NewActs'));
const BestSeller = lazy(() => import('../components/BestSeller'));
const OurPolicy = lazy(() => import('../components/OurPolicy'));
const NewsletterBox = lazy(() => import('../components/NewsletterBox'));

// 🔗 Canonical URL helper (non-www)
const canonicalForPath = (pathname = '/') => {
  const base = 'https://thesupremecollective.co.uk';
  const p = String(pathname || '/');
  // normalize: ensure leading slash, remove trailing slash (except root)
  const withSlash = p.startsWith('/') ? p : `/${p}`;
  const normalized = withSlash !== '/' ? withSlash.replace(/\/+$/, '') : '/';
  return `${base}${normalized}`;
};
// 🔍 Small helpers to log Suspense fallback usage and child mounts
const Fallback = ({ label, className }) => {
  useEffect(() => {
    log(`⏳ Suspense fallback mounted for ${label}`);
    return () => log(`✅ Suspense fallback unmounted for ${label}`);
  }, [label]);

  return <div className={className} />;
};

const LogMount = ({ label, children }) => {
  useEffect(() => {
    log(`📦 ${label} mounted`);
    return () => log(`🧹 ${label} unmounted`);
  }, [label]);

  return children;
};

const FeaturedBlogSection = () => {
  return (
    <section className="px-4 py-16 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 items-center rounded-[32px] border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-3">
            From the blog
          </p>

          <h2 className="text-3xl md:text-4xl font-semibold mb-4 leading-tight text-[#111]">
            5 Ways Live Music Transforms an Event
          </h2>

          <p className="text-lg text-gray-600 mb-6 leading-8">
            From atmosphere and emotion to guest energy and unforgettable dance
            floor moments, discover how live music can completely change the
            feel of a wedding or event.
          </p>

          <Link
            to="/blog/5-ways-live-music-transforms-an-event"
            className="inline-flex rounded-full bg-[#111] px-6 py-3 text-white hover:opacity-90 transition"
          >
            Read the blog
          </Link>
        </div>

        <Link
          to="/blog/5-ways-live-music-transforms-an-event"
          className="block"
        >
          <div className="overflow-hidden rounded-[28px] bg-gray-100 aspect-[4/3]">
            <img
              src="/images/blog/live-music-transforms-event-hero.jpg"
              alt="Live wedding band performing to a packed dance floor"
              className="h-full w-full object-cover"
            />
          </div>
        </Link>
      </div>
    </section>
  );
};

const Home = () => {
  const location = useLocation();
  const canonicalUrl = canonicalForPath(location.pathname);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    group('Initial mount', () => {
      log('component mounted');
      log('scroll -> top');
    });
    window.scrollTo(0, 0);

    return () => log('component unmounted');
  }, []);

  useEffect(() => {
    const hasRIC =
      typeof window !== 'undefined' && 'requestIdleCallback' in window;

    group('Idle scheduling for SearchBar', () => {
      log('requestIdleCallback available?', hasRIC);
    });

    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const start = performance.now();

    const id = ric(() => {
      log(
        `🕒 idle fired after ${(performance.now() - start).toFixed(
          0
        )}ms → showSearch = true`
      );
      setShowSearch(true);
    });

    return () => {
      log('cancel idle for SearchBar');
      cancel(id);
    };
  }, []);

  useEffect(() => {
    log('🔁 showSearch changed →', showSearch);
  }, [showSearch]);

  return (
    <div>
<SEO
  title="The Supreme Collective | Luxury Wedding & Event Bands"
  description="Luxury wedding and event bands for hire across the UK. Explore our acts, get accurate quotes with date & location, and book live music with confidence."
  path="/"
/>
      <Hero>
        <Suspense fallback={<Fallback label="SearchBar" className="h-32" />}>
          {showSearch ? (
            <LogMount label="SearchBar">
              <SearchBar embedded />
            </LogMount>
          ) : null}
        </Suspense>
      </Hero>

      <Suspense fallback={<Fallback label="NewActs" className="h-64 animate-pulse" />}>
        <LogMount label="NewActs">
          <NewActs />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="OurPolicy" className="h-40 animate-pulse" />}>
        <LogMount label="OurPolicy">
          <OurPolicy />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="BestSeller" className="h-64 animate-pulse" />}>
        <LogMount label="BestSeller">
          <BestSeller />
        </LogMount>
      </Suspense>

      <FeaturedBlogSection />

      <Suspense fallback={<Fallback label="NewsletterBox" className="h-40 animate-pulse" />}>
        <LogMount label="NewsletterBox">
          <NewsletterBox />
        </LogMount>
      </Suspense>
    </div>
  );
};

export default Home;