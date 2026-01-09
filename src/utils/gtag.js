// src/utils/gtag.js

// Safe wrapper (won’t crash if gtag isn't loaded yet)
export function gtagEvent(eventName, params = {}) {
  if (typeof window === "undefined") return;

  const gtag = window.gtag;
  if (typeof gtag !== "function") return;

  gtag("event", eventName, {
    event_timeout: 2000,
    ...params,
  });
}

/**
 * Optional: delayed navigation helper (only use if you REALLY navigate away)
 * In an SPA you usually don't need this.
 */
export function gtagSendEvent(url, params = {}) {
  if (typeof window === "undefined") return false;

  const gtag = window.gtag;
  if (typeof gtag !== "function") return false;

  const callback = () => {
    if (typeof url === "string") window.location = url;
  };

  gtag("event", "user_engagement", {
    event_callback: callback,
    event_timeout: 2000,
    ...params,
  });

  return false;
}