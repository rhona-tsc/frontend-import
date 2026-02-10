import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * getAddress.io autocomplete (NO Google Places)
 *
 * Uses your backend proxy routes:
 *  - GET /api/google/address/autocomplete?term=...
 *  - GET /api/google/address/get?id=...
 *
 * Props:
 *  - setAddress(addressString)
 *  - setPostcode(postcodeString)
 *  - setCounty(countyString) (optional)
 *  - initialValue / value (controlled or uncontrolled)
 *  - className / placeholder
 */

const normaliseSpaces = (s = "") =>
  String(s || "").replace(/\s+/g, " ").trim();

const GoogleAutocomplete = ({
  setAddress,
  setCounty,
  setPostcode,
  initialValue,
  value,
  className,
  placeholder,
  ...props
}) => {
  const inputRef = useRef(null);

  // Track whether postcode/county were set via selecting a suggestion
  const selectedRef = useRef(false);
  const lastSelectedAddressRef = useRef("");

  // controlled/uncontrolled
  const isControlled = typeof value !== "undefined";
  const [internalValue, setInternalValue] = useState(String(initialValue || ""));
  const inputValue = isControlled ? String(value || "") : internalValue;

  const setValue = (v) => {
    const next = String(v || "");
    if (!isControlled) setInternalValue(next);
    setAddress?.(next);
  };

  useEffect(() => {
    if (!isControlled) setInternalValue(String(initialValue || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  // suggestions state
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]); // [{id, address}]
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const term = useMemo(() => normaliseSpaces(inputValue), [inputValue]);

  // Fetch autocomplete as user types
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!term || term.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);

       const API_BASE =
  import.meta.env.VITE_BACKEND_URL || "https://tsc-backend-v2.onrender.com";

const res = await fetch(
  `${API_BASE}/api/google/address/lookup?term=${encodeURIComponent(term)}`
);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("[getAddress lookup] non-200:", data);
          setSuggestions([]);
          setOpen(false);
          return;
        }

        const raw = Array.isArray(data?.suggestions) ? data.suggestions : [];

        // getAddress autocomplete typically returns: { id, address } (sometimes different keys)
        const mapped = raw
          .map((s) => ({
            id: s?.id || s?.Id || s?.slug || s?.value || "",
            address: s?.address || s?.Address || s?.text || s?.suggestion || "",
          }))
          .filter((x) => x.id && x.address);

        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.warn("[getAddress autocomplete] failed:", e);
        }
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const pickSuggestion = async (s) => {
    try {
      setOpen(false);
      setSuggestions([]);
      setLoading(true);

      const res = await fetch(
        `/api/google/address/get?id=${encodeURIComponent(s.id)}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn("[getAddress get] non-200:", data);
        // fall back to just the suggestion text
        setValue(s.address);
        lastSelectedAddressRef.current = s.address;
        selectedRef.current = true;
        return;
      }

      // getAddress "get" returns structured fields; build something user-friendly
      const line1 = data?.line_1 || data?.line1 || data?.Line1 || "";
      const line2 = data?.line_2 || data?.line2 || data?.Line2 || "";
      const town =
        data?.town_or_city || data?.town || data?.Town || data?.city || "";
      const countyVal = data?.county || data?.County || "";
      const postcodeVal = data?.postcode || data?.Postcode || "";

      const formatted = [line1, line2, town, countyVal, postcodeVal]
        .map((x) => normaliseSpaces(x))
        .filter(Boolean)
        .join(", ");

      const finalAddress = formatted || s.address;

      setValue(finalAddress);
      if (postcodeVal) setPostcode?.(postcodeVal);
      if (countyVal) setCounty?.(countyVal);

      // mark that postcode/county came from selection
      lastSelectedAddressRef.current = finalAddress;
      selectedRef.current = true;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        placeholder={placeholder || "Type your venue or postcode..."}
        className={className || "border rounded p-2 w-full"}
        onChange={(e) => {
          const next = e.target.value;

          const norm = (x) =>
            String(x || "").replace(/\s+/g, " ").trim().toLowerCase();

          // Only clear derived fields if the user edits AFTER selecting an address
          if (
            selectedRef.current &&
            norm(next) !== norm(lastSelectedAddressRef.current)
          ) {
            selectedRef.current = false;
            lastSelectedAddressRef.current = "";
            setPostcode?.("");
            setCounty?.("");
          }

          setValue(next);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
        aria-label="Venue address or postcode"
        {...props}
      />

      {loading ? (
        <div className="absolute right-2 top-2 text-xs opacity-60">
          Loading…
        </div>
      ) : null}

      {open && suggestions.length > 0 ? (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-xl border bg-white shadow">
          {suggestions.map((s, idx) => (
            <button
              key={`${s.id}-${idx}`}
              type="button"
              className="block w-full text-left px-4 py-3 hover:bg-gray-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(s)}
            >
              {s.address}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default GoogleAutocomplete;