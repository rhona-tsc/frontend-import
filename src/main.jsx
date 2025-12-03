import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import ShopProvider from './context/ShopContext';
import { HelmetProvider } from "react-helmet-async";

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

ReactDOM.createRoot(document.getElementById('root')).render(
  
  <BrowserRouter>
  <HelmetProvider>
    <ShopProvider> 
      <App />
    </ShopProvider>
    </HelmetProvider>
  </BrowserRouter>
);