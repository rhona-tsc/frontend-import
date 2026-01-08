import React, { useEffect, useRef, useState } from "react";

/**
 * Google Places Autocomplete input
 * - Lazily injects the Maps JS script in dev if it's not present
 * - Restricts results to GB
 * - Emits both full formatted address and best-effort county
 * - Adds verbose console logs to help debug on localhost
 */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API; // <-- ensure this exists in `.env.local`



function ensureMapsPlacesScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.google?.maps?.places) return Promise.resolve(true);

  // prevent duplicate inserts
  const existing = document.querySelector('script[data-tsc="gmaps-places"]');
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(true));
      // if it's already loaded, resolve immediately
      if (window.google?.maps?.places) resolve(true);
    });
  }

  if (!API_KEY) {
    console.warn("⚠️ GoogleAutocomplete: VITE_GOOGLE_MAPS_API not set. Autocomplete will not initialise.");
    return Promise.resolve(false);
  }

  const s = document.createElement("script");
  s.async = true;
  s.defer = true;
  s.dataset.tsc = "gmaps-places";
  s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    API_KEY
  )}&libraries=places&v=weekly`;
  document.head.appendChild(s);

  return new Promise((resolve) => {
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
  });
}



const GoogleAutocomplete = ({ setAddress, setCounty, setPostcode, ...props }) => {
  const inputRef = useRef(null);
  const [ready, setReady] = useState(
    !!(typeof window !== "undefined" && window.google?.maps?.places)
  );

  useEffect(() => {
    let autocomplete = null;

    const findType = (components = [], t) =>
      components.find((c) => (c.types || []).includes(t));

    const pickCounty = (components = []) => {
      // Prefer county/UA (level_2), then level_1 (England/Scotland etc.), else postal_town
      const c2 = findType(components, "administrative_area_level_2");
      const c1 = findType(components, "administrative_area_level_1");
      const town = findType(components, "postal_town");
      return c2?.long_name || c1?.long_name || town?.long_name || "";
    };

    const pickPostcode = (components = []) => {
      const pc = findType(components, "postal_code");
      return pc?.long_name || "";
    };

    function init() {
      if (
        !window.google ||
        !window.google.maps ||
        !window.google.maps.places ||
        !inputRef.current
      ) {
        return false;
      }

      try {
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          componentRestrictions: { country: ["gb"] },
          fields: ["formatted_address", "address_components", "geometry"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place || !place.formatted_address) return;

          const address = place.formatted_address;
          const components = place.address_components || [];
          const county = pickCounty(components);
          const postcode = pickPostcode(components);

          // ✅ Write everything back to parent
          setAddress?.(address);
          setCounty?.(county);
          setPostcode?.(postcode);

          // optional debug
          // console.log("[GoogleAutocomplete] selected:", { address, county, postcode, components });
        });

        return true;
      } catch (e) {
        console.warn("❌ [GA] Autocomplete init failed:", e);
        return false;
      }
    }

    (async () => {
      if (!window.google?.maps?.places) {
        const ok = await ensureMapsPlacesScript();
        setReady(ok);
        if (!ok) return;
      } else {
        setReady(true);
      }

      if (!init()) {
        const t0 = Date.now();
        const timer = setInterval(() => {
          if (init() || Date.now() - t0 > 8000) clearInterval(timer);
        }, 250);
        return () => clearInterval(timer);
      }
    })();

    return () => {
      autocomplete = null;
    };
  }, [setAddress, setCounty, setPostcode]);

  return (
    <input
      type="text"
      ref={inputRef}
      placeholder="Enter venue..."
      className="border rounded p-2 w-full"
      onChange={(e) => {
        // ✅ user is typing, so we no longer trust county/postcode
        setAddress?.(e.target.value);
        setCounty?.("");
        setPostcode?.("");
      }}
      aria-label="Venue or address"
      {...props}
    />
  );
};

export default GoogleAutocomplete;