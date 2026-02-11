import React, { useEffect, useMemo, useRef, useState } from "react";

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
  captureKey,          // ✅ new
  idPrefix = "an",     // ✅ supports multiple instances
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
      formatted: `${p}_formatted`,
      postcode: `${p}_postcode`,
      county: `${p}_county`,
      line1: `${p}_line1`,
      line2: `${p}_line2`,
      town: `${p}_town`,
    };
  }, [idPrefix]);

  // AddressNow-populated field refs
  const formattedRef = useRef(null);
  const postcodeRef = useRef(null);
  const countyRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const townRef = useRef(null);

  // ✅ Initialise AddressNow capture on the search input
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    // wait for AddressNow to exist
    if (!window.pca || !window.pca.Address) return;

    // avoid double-binding
    if (el.dataset.pcaBound === "1") return;

    try {
      // If you omit this, it will use the key from the script URL.
      // If you include it, it forces the key you pass in here.
      const keyToUse = captureKey || null;

      // Bind AddressNow to the search input
      // NOTE: This is the standard AddressNow Capture API shape.
      // If your account uses a different initializer, we can tweak.
      const control = keyToUse
        ? new window.pca.Address({ key: keyToUse }, el)
        : new window.pca.Address({}, el);

      // Optional: map fields (some setups auto-map via their on-page setup)
      // We still poll the hidden inputs to sync into React.

      el.dataset.pcaBound = "1";

      return () => {
        // best-effort cleanup; library doesn’t always expose destroy safely
        try {
          if (control?.destroy) control.destroy();
        } catch {}
      };
    } catch (e) {
      console.warn("AddressNow init failed:", e);
    }
  }, [captureKey]);

  // ✅ Keep React state synced with populated values
  useEffect(() => {
    let lastPostcode = "";
    let lastCounty = "";
    let lastFormatted = "";

    const read = () => {
      const pc = normaliseSpaces(postcodeRef.current?.value || "");
      const cty = normaliseSpaces(countyRef.current?.value || "");
      const fmt = normaliseSpaces(formattedRef.current?.value || "");

      if (pc && pc !== lastPostcode) {
        lastPostcode = pc;
        setPostcode?.(pc);
      }
      if (cty && cty !== lastCounty) {
        lastCounty = cty;
        setCounty?.(cty);
      }
      if (fmt && fmt !== lastFormatted) {
        lastFormatted = fmt;
        setValue(fmt);
      }
    };

    const t = setInterval(read, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPostcode, setCounty, setAddress]);

  return (
    <div className="w-full relative">
      <input
        ref={inputRef}
        id={ids.search}
        name={ids.search}
        type="text"
        value={inputValue}
        placeholder={placeholder || "Start typing venue name or postcode..."}
        className={className || "border rounded p-2 w-full"}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        {...props}
      />

      {/* Off-screen mapped fields */}
      <div style={offscreenStyle} aria-hidden="true">
        <input ref={formattedRef} id={ids.formatted} name={ids.formatted} />
        <input ref={postcodeRef} id={ids.postcode} name={ids.postcode} />
        <input ref={countyRef} id={ids.county} name={ids.county} />

        <input ref={line1Ref} id={ids.line1} name={ids.line1} />
        <input ref={line2Ref} id={ids.line2} name={ids.line2} />
        <input ref={townRef} id={ids.town} name={ids.town} />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;