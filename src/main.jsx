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
ReactDOM.createRoot(rootElement).render(
  
  <BrowserRouter>
  <InitialSchemaLifecycle />
  <HelmetProvider>
    <ShopProvider> 
        <ErrorBoundary initialPublicHtml={initialPublicHtml}>
      <App initialContent={initialContent} initialPath={initialPath} />
      </ErrorBoundary>
    </ShopProvider>

    </HelmetProvider>
  </BrowserRouter>
);
