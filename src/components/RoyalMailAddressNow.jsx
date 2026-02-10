import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Royal Mail AddressNow Capture (client-side)
 *
 * Requires in index.html <head> (HTTPS!):
 *  <link rel="stylesheet" href="https://api.addressnow.co.uk/css/addressnow-2.30.min.css?key=YOURKEY" />
 *  <script src="https://api.addressnow.co.uk/js/addressnow-2.30.min.js?key=YOURKEY"></script>
 *
 * Props (matches your SearchBox usage):
 *  - setAddress(addressString)
 *  - setPostcode(postcodeString)
 *  - setCounty(countyString)
 *  - initialValue
 *  - value (optional controlled)
 *  - className / placeholder
 */

const normaliseSpaces = (s = "") => String(s || "").replace(/\s+/g, " ").trim();

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

  // refs to the fields AddressNow will populate
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const townRef = useRef(null);
  const countyRef = useRef(null);
  const postcodeRef = useRef(null);
  const formattedRef = useRef(null);

  // Keep parent state in sync even if AddressNow sets values programmatically (no onChange event)
  useEffect(() => {
    let last = {
      postcode: "",
      county: "",
      formatted: "",
    };

    const read = () => {
      const postcodeVal = normaliseSpaces(postcodeRef.current?.value || "");
      const countyVal = normaliseSpaces(countyRef.current?.value || "");
      const formattedVal = normaliseSpaces(formattedRef.current?.value || "");

      if (postcodeVal && postcodeVal !== last.postcode) {
        last.postcode = postcodeVal;
        setPostcode?.(postcodeVal);
      }

      if (countyVal && countyVal !== last.county) {
        last.county = countyVal;
        setCounty?.(countyVal);
      }

      if (formattedVal && formattedVal !== last.formatted) {
        last.formatted = formattedVal;
        setValue(formattedVal);
      }
    };

    const interval = setInterval(read, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPostcode, setCounty, setAddress]);

  // Optional: nudge AddressNow to (re)scan after React mounts
  useEffect(() => {
    const maxWaitMs = 8000;
    const start = Date.now();

    const tick = () => {
      const g =
        window.pca ||
        window.addressnow ||
        window.AddressNow ||
        window.addressNow;

      if (g) {
        try {
          if (typeof g.load === "function") g.load();
          if (typeof g.init === "function") g.init();
          if (typeof g.setup === "function") g.setup();
        } catch (e) {
          // It's fine if these don't exist; many installs auto-init.
        }
        return;
      }

      if (Date.now() - start < maxWaitMs) setTimeout(tick, 100);
    };

    tick();
  }, []);

  return (
    <div className="w-full relative">
      {/* This is the Search Input you map in the AddressNow UI */}
      <input
        ref={inputRef}
        id="addressnow_search"
        name="addressnow_search"
        type="text"
        value={inputValue}
        placeholder={placeholder || "Start typing an address or postcode..."}
        className={className || "border rounded p-2 w-full"}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        aria-label="Address search"
        {...props}
      />

      {/* IMPORTANT: DO NOT use display:none / Tailwind `hidden` for these.
          AddressNow needs to detect them for mapping. Off-screen is perfect. */}
      <div style={offscreenStyle} aria-hidden="true">
        <input ref={line1Ref} id="address_line1" name="address_line1" type="text" />
        <input ref={line2Ref} id="address_line2" name="address_line2" type="text" />
        <input ref={townRef} id="address_town" name="address_town" type="text" />

        <input
          ref={countyRef}
          id="address_county"
          name="address_county"
          type="text"
        />

        <input
          ref={postcodeRef}
          id="address_postcode"
          name="address_postcode"
          type="text"
        />

        {/* This is handy to map to "Formatted Address" */}
        <input
          ref={formattedRef}
          id="address_formatted"
          name="address_formatted"
          type="text"
        />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;