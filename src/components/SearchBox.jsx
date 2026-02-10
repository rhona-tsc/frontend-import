import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const looksLikePostcode = (s = "") => {
  const t = s.trim().toUpperCase().replace(/\s+/g, " ");
  // loose UK postcode pattern (good enough for triggering lookup)
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(t);
};

const normalisePostcode = (s = "") =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

export default function VenueAddressBox({ value, onChange, onSelectAddress }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const v = String(value || "");

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const trimmed = v.trim();
      const pc = normalisePostcode(trimmed);

      // Only trigger address list lookup when the user has typed a postcode
      if (!trimmed || !looksLikePostcode(pc)) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      // cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        setLoading(true);

        // ✅ NOTE: hit your getAddress proxy (mounted under /api/booking)
        const res = await axios.get(`/api/booking/address/lookup`, {
          params: { postcode: pc },
          signal: abortRef.current.signal,
        });

        const addresses = (res.data?.addresses || []).map((a) => String(a)).filter(Boolean);
        setSuggestions(addresses);
        setOpen(true);
      } catch (e) {
        // ignore abort/cancel errors
        if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
          console.warn("[VenueAddressBox] address lookup failed", e);
        }
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
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => {
          // small delay so clicking a suggestion still works
          setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Type venue address or postcode…"
        className="border rounded p-2 w-full"
        autoComplete="off"
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
              onMouseDown={(e) => e.preventDefault()} // prevents blur before click
              onClick={() => {
                onChange?.(addr);          // ✅ keep it in the input
                onSelectAddress?.(addr);   // ✅ pass it up
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