// Build-time rendering only. Never include this entry in the browser bundle.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ShopContext } from './context/ShopContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LocationWeddingBandsContent from './components/LocationWeddingBandsContent';
import Hero from './components/Hero';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import VenueGuide from './pages/VenueGuide';
import App from './App';
import LocationWeddingBands from './pages/LocationWeddingBands';
import ActLocalConnections, { InitialActReviews } from './components/ActLocalConnections.jsx';

export function renderActLocalContent(route, act, history) {
  return renderToString(<StaticRouter location={route}><ActLocalConnections history={history} /><InitialActReviews reviews={act.reviews || []} history={history} /></StaticRouter>);
}

export function renderVenueGuideContent() {
  return renderToString(<StaticRouter location="/venues/">
    <HelmetProvider context={{}}>
      <VenueGuide />
    </HelmetProvider>
  </StaticRouter>);
}

export function renderActsInitialContent(acts) {
  return renderToString(<main className="mx-auto max-w-7xl pb-20 pt-8" aria-busy="true">
    <section className="rounded-[2rem] bg-black px-6 py-12 text-center text-white sm:px-10 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6677]">Find your live soundtrack</p>
      <h1 className="text-4xl font-semibold sm:text-5xl">Wedding &amp; Event Bands</h1>
      <p className="mx-auto mt-5 max-w-3xl text-lg leading-7 text-gray-300">Explore exceptional live bands for weddings, parties and corporate events across the UK.</p>
    </section>
    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Bands loading">
      {acts.slice(0, 6).map(act => <article key={act.slug} className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="aspect-[4/3] animate-pulse bg-gray-100" />
        <div className="p-5"><h2 className="text-xl font-semibold">{act.tscName}</h2><p className="mt-2 line-clamp-2 text-gray-600">{act.tscDescription || act.description}</p></div>
      </article>)}
    </section>
    <p role="status" className="py-10 text-center text-gray-500">Loading available bands…</p>
  </main>);
}

export function renderActInitialContent(route, act, history) {
  const image = (act.images || []).find(item => item?.url)?.url || '';
  return renderToString(<StaticRouter location={route}>
    <main className="pb-20 pt-6" aria-busy="true">
      <section className="relative mx-auto aspect-[16/8] min-h-[360px] max-w-7xl overflow-hidden rounded-[2rem] bg-gray-900">
        {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-white">
          <div className="max-w-3xl rounded-2xl bg-black/50 p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em]">Book now</p>
            <h1 className="text-4xl font-bold sm:text-5xl">{act.tscName}</h1>
            <p className="mt-4 text-lg">{act.tscDescription || act.description}</p>
          </div>
        </div>
      </section>
      <p role="status" className="py-10 text-center text-gray-500">Loading band details…</p>
      <ActLocalConnections history={history} />
      <InitialActReviews reviews={act.reviews || []} history={history} />
    </main>
  </StaticRouter>);
}

const publicContext = {
  token: '', cartItems: {}, cartUpdated: false,
  getCartCount: () => 0, getShortlistCount: () => 0,
  showSearch: false, selectedAddress: '', selectedDate: '',
};

export function renderCountyApp(route, slug, data) {
  return renderToString(<StaticRouter location={route}>
    <HelmetProvider context={{}}>
      <ShopContext.Provider value={publicContext}>
        <App initialPagePath={route} initialPage={<LocationWeddingBands slug={slug} initialLocation={data} />} />
      </ShopContext.Provider>
    </HelmetProvider>
  </StaticRouter>);
}

export function renderLocationContent(route, slug, data) {
  return renderToString(<StaticRouter location={route}>
    <LocationWeddingBandsContent slug={slug} data={data} />
  </StaticRouter>);
}

export function renderPublicShell(route, content) {
  return renderToString(<StaticRouter location={route}>
    <ShopContext.Provider value={publicContext}>
      <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[4vw]">
        <Navbar />
        <div className="mt-16">
          <div data-initial-page-content="" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
        <Footer />
      </div>
    </ShopContext.Provider>
  </StaticRouter>);
}

export function renderHomeContent() {
  return renderToString(<Hero />);
}

export function renderStaticContent(route) {
  if (!['/about', '/contact', '/terms', '/privacy', '/blog'].includes(route) && !route.startsWith('/blog/')) return null;
  return renderToString(<StaticRouter location={route}>
    <HelmetProvider context={{}}>
      <Routes>
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </HelmetProvider>
  </StaticRouter>);
}
