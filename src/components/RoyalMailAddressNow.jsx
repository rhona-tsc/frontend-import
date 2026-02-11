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

const waitForPca = (timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (
        window.pca &&
        typeof window.pca.Address === "function" &&
        window.pca.fieldMode
      ) {
        resolve(window.pca);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("pca library not ready"));
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });

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
  ...props
}) => {
  const inputRef = useRef(null);

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
    let control = null;
    let cancelled = false;

    const bind = async () => {
      const el = inputRef.current;
      if (!el) return;

      // prevent double-bind on re-renders
      if (el.dataset.pcaBound === "1") return;

      try {
        const pca = await waitForPca();
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
      } catch (e) {
        // If this happens, it usually means the script didn't load (or was blocked)
        console.warn("[AddressNow] bind failed:", e);
      }
    };

    bind();

    return () => {
      cancelled = true;
      const el = inputRef.current;
      if (el) delete el.dataset.pcaBound;

      try {
        if (control?.destroy) control.destroy();
      } catch {
        // some versions don’t expose destroy; ignore
      }
    };
  }, [captureKey, ids.search, ids.line1, ids.line2, ids.town, ids.county, ids.postcode]);

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
        {...props}
      />

      {/* Off-screen fields for AddressNow to populate */}
      <div style={offscreenStyle} aria-hidden="true">
        <input ref={line1Ref} id={ids.line1} name={ids.line1} />
        <input ref={line2Ref} id={ids.line2} name={ids.line2} />
        <input ref={townRef} id={ids.town} name={ids.town} />
        <input ref={countyRef} id={ids.county} name={ids.county} />
        <input ref={postcodeRef} id={ids.postcode} name={ids.postcode} />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;