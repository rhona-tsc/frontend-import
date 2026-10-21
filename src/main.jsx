import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter, useLocation } from 'react-router-dom';
import ShopProvider from './context/ShopContext';
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "./components/ErrorBoundary";

function InitialSchemaLifecycle() {
  const { pathname } = useLocation();
  React.useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (root?.hasAttribute('data-prerendered')) {
      root.removeAttribute('data-prerendered');
    }
  }, []);
  React.useEffect(() => {
    const schema = document.getElementById('initial-page-schema');
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    if (schema && schema.dataset.pagePath !== path) schema.remove();
  }, [pathname]);
  return null;
}


// 🚫 Block accidental ngrok usage at runtime
if (window.location.hostname.includes("ngrok")) {
  window.location.replace("https://tsc2025.netlify.app");
}

if (location.search.includes("nolog")) {
  ["log","debug","info","warn","error","group","groupCollapsed","table"].forEach(k => {
    // eslint-disable-next-line no-console
    console[k] = () => {};
  });
}

const rootElement = document.getElementById('root');
const initialPublicHtml = rootElement.innerHTML;
const initialContent = rootElement.querySelector('[data-initial-page-content]')?.innerHTML || '';
const initialPath = window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/+$/, '');
async function startApp() {
  let initialPage;
  const locationNode = document.getElementById('initial-location-data');
  const slug = initialPath.replace('/wedding-bands-', '');
  const hydrateCounty = rootElement.dataset.hydrate === 'county' && locationNode?.dataset.county === slug;
  if (hydrateCounty) {
    // Load the matching route before hydration; a loading fallback would replace
    // the already-visible hero and register a new, much later LCP candidate.
    const { default: LocationWeddingBands } = await import('./pages/LocationWeddingBands.jsx');
    initialPage = <LocationWeddingBands slug={slug} />;
  }
  const app = (
  
  <BrowserRouter>
  <InitialSchemaLifecycle />
  <HelmetProvider>
    <ShopProvider> 
        <ErrorBoundary initialPublicHtml={initialPublicHtml}>
      <App initialContent={initialContent} initialPath={initialPath} initialPage={initialPage} initialPagePath={initialPath} />
      </ErrorBoundary>
    </ShopProvider>

    </HelmetProvider>
  </BrowserRouter>
  );
  if (hydrateCounty) ReactDOM.hydrateRoot(rootElement, app, {
    onRecoverableError(error) {
      rootElement.dataset.hydrationRecovery = 'true';
      console.error('Page hydration required recovery:', error);
    },
  });
  else ReactDOM.createRoot(rootElement).render(app);
}

startApp().catch(error => {
  console.error('Interactive page could not start:', error);
  const notice = document.createElement('p');
  notice.setAttribute('role', 'alert');
  notice.className = 'p-6 text-center';
  notice.append('The interactive features could not load. ');
  const refresh = document.createElement('button');
  refresh.textContent = 'Refresh to try again';
  refresh.className = 'underline';
  refresh.onclick = () => window.location.reload();
  notice.append(refresh);
  rootElement.append(notice);
});
