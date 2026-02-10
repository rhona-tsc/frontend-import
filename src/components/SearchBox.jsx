import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const looksLikePostcode = (s = "") => {
  const t = s.trim().toUpperCase().replace(/\s+/g, " ");
  // loose UK postcode pattern (good enough for triggering lookup)
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(t);
};

export default function VenueAddressBox({ value, onChange, onSelectAddress }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const v = String(value || "");

    // debounce
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const trimmed = v.trim();

      if (!trimmed || !looksLikePostcode(trimmed)) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      // cancel previous
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        setLoading(true);
        const res = await axios.get(
          `/api/google/address/lookup`,
          {
            params: { postcode: trimmed },
            signal: abortRef.current.signal,
          }
        );

        const addresses = (res.data?.addresses || []).map((a) => String(a));
        setSuggestions(addresses);
        setOpen(true);
      } catch (e) {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [value]);

  return (
    <div className="relative">
      <input
        value={value || ""}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        placeholder="Type venue address or postcode…"
        className="border rounded p-2 w-full"
      />

      {loading && (
        <div className="absolute right-2 top-2 text-xs opacity-60">
          Loading…
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded border bg-white shadow">
          {suggestions.map((addr, idx) => (
            <button
              key={`${addr}-${idx}`}
              type="button"
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              onClick={() => {
                // addr is usually "line1, line2, town, county"
                onSelectAddress?.(addr);
                setOpen(false);
              }}
            >
              {addr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}