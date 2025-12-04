import React, { useEffect, useState, lazy, Suspense } from 'react';
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

const Home = () => {
  const [showSearch, setShowSearch] = useState(false);

  // On first mount
  useEffect(() => {
    group('Initial mount', () => {
      log('component mounted');
      log('scroll -> top');
    });
    window.scrollTo(0, 0);
    return () => log('component unmounted');
  }, []);

  // Mount the SearchBar on idle (or after a brief timeout) to avoid blocking FCP
  useEffect(() => {
    const hasRIC = typeof window !== 'undefined' && 'requestIdleCallback' in window;
    group('Idle scheduling for SearchBar', () => {
      log('requestIdleCallback available?', hasRIC);
    });

    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const start = performance.now();
    const id = ric(() => {
      log(`🕒 idle fired after ${(performance.now() - start).toFixed(0)}ms → showSearch = true`);
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
      <Hero />

      {/* SearchBar: lazy + idle-mounted */}
      <Suspense fallback={<Fallback label="SearchBar" className={null} />}>
        {showSearch ? (
          <LogMount label="SearchBar">
            <SearchBar />
          </LogMount>
        ) : null}
      </Suspense>

      {/* Below-the-fold sections: lazy + lightweight fallbacks */}
      <Suspense fallback={<Fallback label="NewActs" className="h-64 animate-pulse" />}>
        <LogMount label="NewActs">
          <NewActs />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="BestSeller" className="h-64 animate-pulse" />}>
        <LogMount label="BestSeller">
          <BestSeller />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="OurPolicy" className="h-40 animate-pulse" />}>
        <LogMount label="OurPolicy">
          <OurPolicy />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="NewsletterBox" className="h-40 animate-pulse" />}>
        <LogMount label="NewsletterBox">
          <NewsletterBox />
        </LogMount>
      </Suspense>
    </div>
  );
};

export default Home;