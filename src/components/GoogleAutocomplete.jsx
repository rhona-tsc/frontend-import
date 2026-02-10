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
  const autocompleteRef = useRef(null);
  const geocoderRef = useRef(null);
  const boundsTimerRef = useRef(null);

  const [ready, setReady] = useState(
    !!(typeof window !== "undefined" && window.google?.maps?.places)
  );
  const [helperText, setHelperText] = useState("");

  const normalisePostcode = (s = "") => String(s || "").trim().toUpperCase();

  // Rough UK postcode match (good enough for UI behaviour)
  const isLikelyUkPostcode = (s = "") => {
    const v = normalisePostcode(s);
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(v);
  };

  // Partial typing match (outcode or half-entered postcode)
  const isPossiblyUkPostcode = (s = "") => {
    const v = normalisePostcode(s);
    if (!v) return false;
    // e.g. CM19, SW1A, M1, EC1A etc. (optionally with a trailing space)
    return /^[A-Z]{1,2}\d[A-Z\d]?(\s*)?$/.test(v) || /^[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{0,2}$/.test(v);
  };

  const biasPredictionsToPostcode = (value) => {
    // Debounce to avoid hammering the geocoder while typing
    if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);

    const v = normalisePostcode(value);
    const ac = autocompleteRef.current;

    if (!ac) return;

    // If it's not a postcode-ish input, remove strict bounds and exit
    if (!isPossiblyUkPostcode(v)) {
      try {
        ac.setOptions({ strictBounds: false });
      } catch (_) {}
      return;
    }

    boundsTimerRef.current = setTimeout(() => {
      const geocoder = geocoderRef.current;
      if (!geocoder) return;

      geocoder.geocode({ address: v, componentRestrictions: { country: "GB" } }, (results, status) => {
        if (status !== "OK" || !results || !results[0] || !results[0].geometry) return;

        const geom = results[0].geometry;
        // Prefer the returned viewport; fallback to a small box around the location
        if (geom.viewport) {
          ac.setBounds(geom.viewport);
        } else if (geom.location) {
          const lat = geom.location.lat();
          const lng = geom.location.lng();
          const delta = 0.02; // ~2km-ish box
          const sw = new window.google.maps.LatLng(lat - delta, lng - delta);
          const ne = new window.google.maps.LatLng(lat + delta, lng + delta);
          const b = new window.google.maps.LatLngBounds(sw, ne);
          ac.setBounds(b);
        }

        // Tighten predictions to the area once we have a postcode
        ac.setOptions({ strictBounds: true });
      });
    }, 250);
  };

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
          // "address" gives more premise-level suggestions than "geocode" in many cases
          types: ["address"],
          componentRestrictions: { country: ["gb"] },
          fields: ["formatted_address", "address_components", "geometry"],
        });

        // Keep refs so we can bias predictions when a user types a postcode
        autocompleteRef.current = autocomplete;
        if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();

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

          setHelperText("");
          try {
            autocomplete?.setOptions?.({ strictBounds: false });
          } catch (_) {}
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
      autocompleteRef.current = null;
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current);
    };
  }, [setAddress, setCounty, setPostcode]);

  return (
    <div className="w-full">
      <input
        type="text"
        ref={inputRef}
        placeholder="Type your venue postcode or full address…"
        className="border rounded p-2 w-full"
        onChange={(e) => {
          const v = e.target.value;

          // user is typing, so we no longer trust county/postcode
          setAddress?.(v);
          setCounty?.("");
          setPostcode?.("");

          // If they enter a postcode, Google often won’t list every premise unless
          // they add a house name/number — so we guide them and bias results.
          if (isLikelyUkPostcode(v) || isPossiblyUkPostcode(v)) {
            setHelperText("Tip: add the house number/name after the postcode to see specific addresses (e.g. “12 CM19 5LE”).");
            biasPredictionsToPostcode(v);
          } else {
            setHelperText("");
          }
        }}
        aria-label="Venue postcode or address"
        {...props}
      />

      {helperText ? (
        <div className="mt-1 text-xs text-gray-500">{helperText}</div>
      ) : null}
    </div>
  );
};

export default GoogleAutocomplete;