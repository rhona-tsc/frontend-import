import React, { useEffect, useState, lazy, Suspense } from 'react';
import Hero from '../components/Hero';

// ⛳ Defer everything below the fold so Hero paints instantly
const SearchBar = lazy(() => import('../components/SearchBar'));
const NewActs = lazy(() => import('../components/NewActs'));
const BestSeller = lazy(() => import('../components/BestSeller'));
const OurPolicy = lazy(() => import('../components/OurPolicy'));
const NewsletterBox = lazy(() => import('../components/NewsletterBox'));

const Home = () => {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Mount the SearchBar on idle (or after a brief timeout) to avoid blocking FCP
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = ric(() => setShowSearch(true));
    return () => cancel(id);
  }, []);

  return (
    <div>
      <Hero />

      {/* SearchBar: lazy + idle-mounted */}
      <Suspense fallback={null}>
        {showSearch ? <SearchBar /> : null}
      </Suspense>

      {/* Below-the-fold sections: lazy + lightweight fallbacks */}
      <Suspense fallback={<div className="h-64 animate-pulse" />}>
        <NewActs />
      </Suspense>

      <Suspense fallback={<div className="h-64 animate-pulse" />}>
        <BestSeller />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse" />}>
        <OurPolicy />
      </Suspense>

      <Suspense fallback={<div className="h-40 animate-pulse" />}>
        <NewsletterBox />
      </Suspense>
    </div>
  );
};

export default Home;
