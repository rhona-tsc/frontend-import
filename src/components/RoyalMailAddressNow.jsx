import React, { useEffect, useRef } from "react";

/**
 * Royal Mail AddressNow Capture (addressnow.co.uk)
 *
 * Assumes you have already included the AddressNow CSS + JS in index.html HEAD (HTTPS)
 * and your key is in the script URL (?key=xxxx-xxxx-xxxx-xxxx)
 *
 * This component renders:
 * - a search field (user types here)
 * - hidden/readonly fields for line/town/county/postcode that AddressNow can populate
 *
 * Then it triggers the AddressNow "on page setup" flow once mounted.
 *
 * IMPORTANT:
 * - The exact global hook varies by AddressNow version.
 * - This uses a safe "wait until global exists" approach and then triggers setup.
 */

const RoyalMailAddressNow = ({
  label = "VENUE ADDRESS",
  placeholder = "Start typing venue / postcode...",
  // Callbacks back into your app
  onFormattedAddress,
  onPostcode,
  onCounty,
}) => {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Wait for AddressNow to load (it attaches a global)
    const maxWaitMs = 8000;
    const start = Date.now();

    const tick = () => {
      // AddressNow has historically used `pca` namespace on some installs,
      // and `addressnow`/`AddressNow` on others. We check a few possibilities.
      const g =
        window.pca ||
        window.addressnow ||
        window.AddressNow ||
        window.addressNow;

      if (g) {
        // Many installs auto-detect and show the mapping UI on first load.
        // If it doesn't, forcing a re-scan is sometimes exposed as `load()` / `init()` / `setup()`.
        // We try the most common names safely.
        try {
          if (typeof g.load === "function") g.load();
          if (typeof g.init === "function") g.init();
          if (typeof g.setup === "function") g.setup();
        } catch (e) {
          console.warn("[AddressNow] global found but init call failed:", e);
        }
        return;
      }

      if (Date.now() - start < maxWaitMs) {
        setTimeout(tick, 100);
      } else {
        console.warn(
          "[AddressNow] script not detected. Check index.html uses HTTPS and the key is valid."
        );
      }
    };

    tick();
  }, []);

  return (
    <div className="w-full">
      <p className="font-medium text-sm text-gray-700 mb-1">{label}</p>

      {/* SEARCH FIELD (recommended by Royal Mail quick start) */}
      <input
        id="addressnow_search"
        name="addressnow_search"
        type="text"
        placeholder={placeholder}
        autoComplete="off"
        className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
        onChange={(e) => {
          // Optional: keep your local address state in sync as they type
          onFormattedAddress?.(e.target.value);
        }}
      />

      {/* Address fields AddressNow can populate.
          You can keep these hidden if you only need postcode/county/address.
          But leaving them in DOM helps AddressNow mapping work reliably. */}
      <div className="hidden">
        <input id="line1" name="line1" type="text" />
        <input id="line2" name="line2" type="text" />
        <input id="town" name="town" type="text" />
        <input
          id="county"
          name="county"
          type="text"
          onChange={(e) => onCounty?.(e.target.value)}
        />
        <input
          id="postcode"
          name="postcode"
          type="text"
          onChange={(e) => onPostcode?.(e.target.value)}
        />
        <input
          id="formattedAddress"
          name="formattedAddress"
          type="text"
          onChange={(e) => onFormattedAddress?.(e.target.value)}
        />
      </div>
    </div>
  );
};

export default RoyalMailAddressNow;