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
  idPrefix = "addressnow",
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

  // Fields AddressNow will populate
  const formattedRef = useRef(null);
  const postcodeRef = useRef(null);
  const countyRef = useRef(null);

  // Optional extras if you ever want them
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const townRef = useRef(null);

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

  // Build unique IDs per instance
  const ids = useMemo(() => {
    const safe = String(idPrefix || "addressnow")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "");
    return {
      search: `${safe}_search`,
      formatted: `${safe}_formatted`,
      postcode: `${safe}_postcode`,
      county: `${safe}_county`,
      line1: `${safe}_line1`,
      line2: `${safe}_line2`,
      town: `${safe}_town`,
    };
  }, [idPrefix]);

  // Keep React state synced with AddressNow populated values
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
      {/* User input — AddressNow attaches suggestions UI to THIS */}
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

      {/* Fields for AddressNow to populate (off-screen, not hidden) */}
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