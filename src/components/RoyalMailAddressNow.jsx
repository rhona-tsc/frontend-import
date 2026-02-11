import React, { useEffect, useRef, useState } from "react";

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
      {/* This is the box the user types into.
          AddressNow will attach suggestions UI to this. */}
      <input
        ref={inputRef}
        id="addressnow_search"
        name="addressnow_search"
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
        <input ref={formattedRef} id="address_formatted" name="address_formatted" />
        <input ref={postcodeRef} id="address_postcode" name="address_postcode" />
        <input ref={countyRef} id="address_county" name="address_county" />

        <input ref={line1Ref} id="address_line1" name="address_line1" />
        <input ref={line2Ref} id="address_line2" name="address_line2" />
        <input ref={townRef} id="address_town" name="address_town" />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;