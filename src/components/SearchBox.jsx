import React, { useContext, useEffect, useMemo, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import { useLocation } from "react-router-dom";
import GoogleAutocomplete from "./GoogleAutocomplete";
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
      className={`fixed top-16 left-0 right-0 border-t border-b bg-gray-50 text-center shadow-md z-50 py-4 
      transition-all duration-500 ${
        animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      {/* ⬇️ Key change: align blocks from the top, and make each control its own “column” */}
      <div className="flex flex-col sm:flex-row items-start justify-center gap-4 px-5">
        {/* Date column */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          <p className="font-medium text-sm text-gray-700 mb-1">DATE</p>
          <input
            type="date"
            className="border-2 border-gray-300 p-2 text-gray-500 bg-white"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
          {/* reserve the same “helper space” as venue so alignment never shifts */}
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>

        {/* Venue column */}
        <div className="w-full sm:w-[420px] flex flex-col text-left">
          <p className="font-medium text-sm text-gray-700 mb-1">VENUE POSTCODE</p>

          <GoogleAutocomplete
            setAddress={setLocalAddress}
            setCounty={setCounty}
            setPostcode={setPostcode}
            initialValue={localAddress}
            className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
            placeholder="Type your venue or postcode..."
            required
          />

       

          {/* postcode line (reserved height) */}
          <div className="min-h-[16px] mt-1">
            {postcodeOk ? (
              <p className="text-xs text-green-600">
                Postcode detected: {normaliseUKPostcode(postcode)}
              </p>
            ) : (
              <span className="block text-xs opacity-0 select-none">placeholder</span>
            )}
          </div>
        </div>

        {/* Search button column */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          {/* label spacer to match the DATE/VENUE label height */}
          <div className="h-[20px] mb-1" aria-hidden="true" />
          <button
            className={`w-full sm:w-auto px-6 py-2 text-white transition duration-300 rounded ${
              searchDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#ff6667] hover:bg-[#ff3333]"
            }`}
            onClick={handleSearch}
            disabled={searchDisabled}
          >
            SEARCH
          </button>

          {/* keep column height consistent with other columns */}
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
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
  ) : null;
};

export default SearchBox;