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
import App from './App';
import LocationWeddingBands from './pages/LocationWeddingBands';

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

export function renderHomeContent(content) {
  return renderToString(<>
    <Hero />
    <section className="initial-public-content" dangerouslySetInnerHTML={{ __html: content }} />
  </>);
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
