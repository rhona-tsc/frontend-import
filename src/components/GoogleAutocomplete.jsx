import React, { useEffect, useRef, useState } from "react";

/**
 * Google Places Autocomplete input (importLibrary version)
 * - Uses the modern google.maps.importLibrary loader (no `libraries=` URL param)
 * - Restricts results to GB
 * - Emits both full formatted address and best-effort county
 * - Adds verbose console logs to help debug on localhost
 */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API; // <-- ensure this exists in `.env.local`

// Ensure Maps JS is present and supports importLibrary; inject <script> if needed
function ensureMapsWithImportLibrary() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));

  // Already loaded and ready
  if (window.google?.maps?.importLibrary) return Promise.resolve(true);

  if (!API_KEY) {
    console.warn(
      "⚠️ GoogleAutocomplete: VITE_GOOGLE_MAPS_API not set. Autocomplete will not initialise."
    );
    return Promise.resolve(false);
  }

  // Prevent duplicate inserts
  let script = document.querySelector('script[data-tsc="gmaps-core"]');
  if (!script) {
    script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.tsc = "gmaps-core";
    // Note: no `libraries=` here; we'll import what we need at runtime
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      API_KEY
    )}&v=weekly&loading=async`;
    document.head.appendChild(script);
  }

  return new Promise((resolve) => {
    const onReady = () => resolve(!!window.google?.maps);
    if (script!.readyState) {
      script!.onreadystatechange = function () {
        if (script!.readyState === "loaded" || script!.readyState === "complete") onReady();
      };
    } else {
      script!.onload = onReady;
      script!.onerror = () => resolve(false);
    }
  });
}

const GoogleAutocomplete = ({ setAddress, setCounty, ...props }) => {
  const inputRef = useRef(null);
  const [ready, setReady] = useState(
    !!(typeof window !== "undefined" && window.google?.maps?.importLibrary)
  );

  useEffect(() => {
    let autocomplete = null;
    let placeListener = null;
    let retryTimer = null;

    function pickCounty(components = []) {
      // Prefer county/UA (level_2), then level_1 (England/Scotland etc.), else postal_town as last resort
      const findType = (t) => components.find((c) => (c.types || []).includes(t));
      const c2 = findType("administrative_area_level_2");
      const c1 = findType("administrative_area_level_1");
      const town = findType("postal_town");
      return c2?.long_name || c1?.long_name || town?.long_name || "";
    }

    async function initOnce() {
      if (!inputRef.current) return false;

      // Ensure Maps core is available
      const coreOk = await ensureMapsWithImportLibrary();
      if (!coreOk || !window.google?.maps?.importLibrary) return false;

      try {
        // Dynamically import Places
        const { Autocomplete } = await window.google.maps.importLibrary("places");

        // Fields keeps payload small
        autocomplete = new Autocomplete(inputRef.current, {
          types: ["geocode"],
          componentRestrictions: { country: ["gb"] },
          fields: ["formatted_address", "address_components", "geometry"],
        });

        placeListener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place || !place.formatted_address) {
            console.log("🔎 [GA] place_changed fired but no formatted_address", place);
            return;
          }

          const address = place.formatted_address;
          const components = place.address_components || [];
          const county = pickCounty(components);

          console.log("📍 [GA] Selected place:", {
            address,
            county,
            components,
          });

          setAddress?.(address);
          setCounty?.(county);
        });

        console.log("✅ [GA] Autocomplete initialised via importLibrary");
        setReady(true);
        return true;
      } catch (e) {
        console.warn("❌ [GA] Autocomplete init failed:", e);
        return false;
      }
    }

    (async () => {
      const ok = await initOnce();
      if (ok) return;

      // small retry loop in case script is still warming up
      const t0 = Date.now();
      retryTimer = setInterval(async () => {
        const done = await initOnce();
        if (done || Date.now() - t0 > 8000) {
          clearInterval(retryTimer);
        }
      }, 250);
    })();

    return () => {
      if (placeListener) window.google?.maps?.event?.removeListener(placeListener);
      if (retryTimer) clearInterval(retryTimer);
      autocomplete = null;
    };
  }, [setAddress, setCounty]);

  return (
    <input
      type="text"
      ref={inputRef}
      placeholder="Enter venue..."
      className="border rounded p-2 w-full"
      onChange={(e) => setAddress?.(e.target.value)} // keep value usable even before Maps loads
      aria-label="Venue or address"
      {...props}
    />
  );
};

export default GoogleAutocomplete;