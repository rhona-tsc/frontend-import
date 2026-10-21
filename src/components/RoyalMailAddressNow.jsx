import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadAddressNow } from "../utils/loadAddressNow.js";

const normaliseSpaces = (s = "") => String(s || "").replace(/\s+/g, " ").trim();

// Important: NOT display:none (AddressNow needs to detect these)
const offscreenStyle = {
  position: "absolute",
  left: "-9999px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

const RoyalMailAddressNow = ({
  captureKey, // ✅ your Capture key for this instance
  idPrefix = "an", // ✅ MUST be unique per instance on a page
  setAddress,
  setCounty,
  setPostcode,
  initialValue,
  value,
  className,
  placeholder,
  statusClassName = 'mt-1 text-xs text-gray-600',
  active = false,
  onFocus,
  ...props
}) => {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [retry, setRetry] = useState(0);
  const [lookupState, setLookupState] = useState('idle');
  const enabled = active || focused;

  // AddressNow-populated field refs (hidden/offscreen inputs)
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const townRef = useRef(null);
  const countyRef = useRef(null);
  const postcodeRef = useRef(null);

  // controlled/uncontrolled input
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

  // unique IDs per instance
  const ids = useMemo(() => {
    const p = String(idPrefix || "an");
    return {
      search: `${p}_search`,
      line1: `${p}_line1`,
      line2: `${p}_line2`,
      town: `${p}_town`,
      county: `${p}_county`,
      postcode: `${p}_postcode`,
    };
  }, [idPrefix]);

  // Bind AddressNow to THIS input + populate THESE hidden fields
  useEffect(() => {
    if (!enabled) return;
    const el = inputRef.current;
    let control = null;
    let cancelled = false;

    const bind = async () => {
      const el = inputRef.current;
      if (!el) return;

      // prevent double-bind on re-renders
      if (el.dataset.pcaBound === "1") return;

      try {
        setLookupState('loading');
        const pca = await loadAddressNow();
        if (cancelled) return;

        // Fields mapping: SEARCH input + POPULATE into our hidden inputs
        const fields = [
          { element: ids.search, field: "", mode: pca.fieldMode.SEARCH },
          { element: ids.line1, field: "Line1", mode: pca.fieldMode.POPULATE },
          { element: ids.line2, field: "Line2", mode: pca.fieldMode.POPULATE },
          { element: ids.town, field: "City", mode: pca.fieldMode.POPULATE },
          {
            element: ids.county,
            field: "ProvinceName",
            mode: pca.fieldMode.POPULATE,
          },
          {
            element: ids.postcode,
            field: "PostalCode",
            mode: pca.fieldMode.POPULATE,
          },
        ];

        const options = captureKey ? { key: captureKey } : {};

        // Create the control
        control = new pca.Address(fields, options);

        // When user selects an address, push into React state
        control.listen("populate", () => {
          const line1 = normaliseSpaces(line1Ref.current?.value || "");
          const line2 = normaliseSpaces(line2Ref.current?.value || "");
          const town = normaliseSpaces(townRef.current?.value || "");
          const county = normaliseSpaces(countyRef.current?.value || "");
          const postcode = normaliseSpaces(postcodeRef.current?.value || "");

          const formatted = [line1, line2, town, county, postcode]
            .filter(Boolean)
            .join(", ");

          if (postcode) setPostcode?.(postcode);
          if (county) setCounty?.(county);
          if (formatted) setValue(formatted);
        });

        el.dataset.pcaBound = "1";
        setLookupState('ready');
      } catch (e) {
        if (cancelled) return;
        setLookupState('error');
        // If this happens, it usually means the script didn't load (or was blocked)
        console.warn("[AddressNow] bind failed:", e);
      }
    };

    bind();

    return () => {
      cancelled = true;
      if (el) delete el.dataset.pcaBound;

      try {
        if (control?.destroy) control.destroy();
      } catch {
        // some versions don’t expose destroy; ignore
      }
    };
  }, [enabled, retry, captureKey, ids.search, ids.line1, ids.line2, ids.town, ids.county, ids.postcode]);

  return (
    <div className="w-full relative">
      <input
        ref={inputRef}
        id={ids.search}
        name={ids.search}
        type="text"
        value={inputValue}
        placeholder={placeholder || "Start typing venue name or postcode..."}
        className={className || "border-2 border-gray-300 p-2 text-gray-500 bg-white w-full"}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        onFocus={(event) => {
          setFocused(true);
          if (lookupState === 'error') setRetry(count => count + 1);
          onFocus?.(event);
        }}
        aria-describedby={lookupState === 'loading' || lookupState === 'error' ? `${ids.search}_status` : undefined}
        {...props}
      />
      {(lookupState === 'loading' || lookupState === 'error') && (
        <p id={`${ids.search}_status`} role="status" className={statusClassName}>
          {lookupState === 'loading' ? 'Loading address suggestions—you can also enter a full UK postcode.' : 'Address suggestions are unavailable. Please enter a full UK postcode.'}
        </p>
      )}

      {/* Off-screen fields for AddressNow to populate */}
      <div style={offscreenStyle} aria-hidden="true">
        <input tabIndex={-1} ref={line1Ref} id={ids.line1} name={ids.line1} />
        <input tabIndex={-1} ref={line2Ref} id={ids.line2} name={ids.line2} />
        <input tabIndex={-1} ref={townRef} id={ids.town} name={ids.town} />
        <input tabIndex={-1} ref={countyRef} id={ids.county} name={ids.county} />
        <input tabIndex={-1} ref={postcodeRef} id={ids.postcode} name={ids.postcode} />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;
