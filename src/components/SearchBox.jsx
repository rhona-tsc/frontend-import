import React, { useContext, useEffect, useMemo, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import { useLocation } from "react-router-dom";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import { gtagEvent } from "../utils/gtag";
// UK postcode validator (accepts with/without space, normalises later)
const isValidUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc);
};

// Optional: normalise to "SW1A 1AA"
const normaliseUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (pc.length < 5) return value;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(-3)}`;
};

const SearchBox = () => {
  const location = useLocation();

  const {
    showSearch,
    setShowSearch,
    selectedAddress,
    setSelectedAddress,
    selectedDate,
    setSelectedDate,
    setSelectedPostcode,
    setSelectedCounty,
  } = useContext(ShopContext);

  const [localAddress, setLocalAddress] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [animate, setAnimate] = useState(false);
const openedAtRef = React.useRef(null);
  const postcodeOk = useMemo(() => isValidUKPostcode(postcode), [postcode]);

  useEffect(() => {
    setLocalAddress(selectedAddress || "");
    setLocalDate(selectedDate || "");

    const ssPc = sessionStorage.getItem("selectedPostcode") || "";
    const ssCounty = sessionStorage.getItem("selectedCounty") || "";
    if (!postcode && ssPc) setPostcode(ssPc);
    if (!county && ssCounty) setCounty(ssCounty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, selectedDate]);

  useEffect(() => {
    if (location.pathname !== "/acts" && showSearch) {
      setAnimate(false);
      setTimeout(() => setShowSearch(false), 300);
    }
  }, [location.pathname, showSearch, setShowSearch]);

  useEffect(() => {
    if (showSearch) setAnimate(true);
  }, [showSearch]);

  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => setShowSearch(false), 500);
  };

const handleSearch = () => {
  // Allow postcode to be typed/pasted into the venue box too
  const extractPostcode = (text = "") => {
    const m = String(text || "")
      .toUpperCase()
      .match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/);
    return m ? m[1] : "";
  };

  const rawPc = postcode || extractPostcode(localAddress);
  const pcOk = isValidUKPostcode(rawPc);

  gtagEvent("searchbox_submit_attempt", {
    has_date: !!localDate.trim(),
    has_address: !!localAddress.trim(),
    has_county: !!county.trim(),
    postcode_valid: postcodeOk || isValidUKPostcode(extractPostcode(localAddress)),
  });

  if (!pcOk) {
    gtagEvent("searchbox_submit_error", { reason: "invalid_or_missing_postcode" });
    return alert("Please type a full UK postcode (or select an address) so we can calculate travel.");
  }

  const pc = normaliseUKPostcode(rawPc);

  // keep state in sync if postcode came from the venue input
  if (!postcode && pc) setPostcode(pc);

  setSelectedAddress(localAddress || "");
  setSelectedDate(localDate || "");

  if (typeof setSelectedPostcode === "function") setSelectedPostcode(pc);
  if (typeof setSelectedCounty === "function") setSelectedCounty(county);

  sessionStorage.setItem("selectedAddress", localAddress || "");
  sessionStorage.setItem("selectedDate", localDate || "");
  sessionStorage.setItem("selectedCounty", county);
  sessionStorage.setItem("selectedPostcode", pc);

  const ms = openedAtRef.current ? Date.now() - openedAtRef.current : null;

  gtagEvent("searchbox_submit_success", {
    county,
    duration_ms: ms,
  });

  handleClose("submit_success");
};

  const searchDisabled = !postcodeOk;

return showSearch || animate ? (
  <div
    className={`fixed top-16 left-0 right-0 border-t border-b bg-black text-center shadow-md z-50 py-6
    transition-all duration-500 ${
      animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
    }`}
  >
    <div className="mx-auto max-w-6xl px-4">
      <div className="flex flex-wrap items-start gap-4">
        {/* Date */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-white text-xs sm:text-sm mb-1" htmlFor="sb-date">
            DATE
          </label>
          <input
            id="sb-date"
            type="date"
            className="w-full border-2 border-gray-300 p-2 shadow-sm text-gray-700 rounded"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        {/* Venue */}
        <div className="flex-[2] min-w-[260px]">
          <label className="block text-white text-xs sm:text-sm mb-1" htmlFor="sb-venue">
            VENUE
          </label>

          <RoyalMailAddressNow
            captureKey="uu93-fd14-xw69-bu42"
            idPrefix="searchbox"          // ✅ avoids clashes if you render multiple
            setAddress={setLocalAddress}
            setCounty={setCounty}
            setPostcode={setPostcode}
            initialValue={localAddress}
            className="w-full text-base px-3 py-2 border-2 border-gray-300 rounded"
            placeholder="Start typing your venue (select from dropdown)..."
            id="sb-venue"
            required
          />

          {/* Helper text like SearchBar */}
          {!postcodeOk && localAddress?.trim() ? (
            <p className="mt-1 text-xs text-[#ff6667]">
              Please select a result that includes a UK postcode.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">
              Tip: choose a dropdown result (not free-typed) so we can confirm the postcode.
            </p>
          )}

          {postcodeOk ? (
            <p className="mt-1 text-xs text-green-400">
              Postcode detected: {normaliseUKPostcode(postcode)}
            </p>
          ) : null}
        </div>

        {/* Search button */}
        <div className="w-full sm:w-auto flex flex-col">
          <div className="h-[18px] mb-1" aria-hidden="true" />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchDisabled}
            className={`w-full sm:w-auto px-6 py-3 font-medium rounded transition
              ${
                searchDisabled
                  ? "bg-gray-600 cursor-not-allowed opacity-60"
                  : "bg-[#ff6667] hover:opacity-90 text-white"
              }
            `}
          >
            SEARCH
          </button>
        </div>

        {/* Close */}
        <div className="pt-[22px] sm:pt-[22px]">
          <img
            onClick={handleClose}
            className="w-4 cursor-pointer"
            src={assets.cross_icon}
            alt="Close"
          />
        </div>
      </div>
    </div>
  </div>
) : null;
};

export default SearchBox;