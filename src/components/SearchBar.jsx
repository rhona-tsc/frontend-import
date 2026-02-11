import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import { useLocation } from "react-router-dom";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import { gtagEvent } from "../utils/gtag";
import Title from "./Title";
// UK postcode validator (accepts with/without space, normalises later)
const isValidUKPostcode = (value = "") => {
  const pc = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc);
};

// Optional: normalise to "SW1A 1AA"
const normaliseUKPostcode = (value = "") => {
  const pc = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (pc.length < 5) return value;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(-3)}`;
};

const SearchBar = () => {
  const {
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
  const openedAtRef = useRef(null);
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
      postcode_valid:
        postcodeOk || isValidUKPostcode(extractPostcode(localAddress)),
    });

    if (!pcOk) {
      gtagEvent("searchbox_submit_error", {
        reason: "invalid_or_missing_postcode",
      });
      return alert(
        "Please type a full UK postcode (or select an address) so we can calculate travel.",
      );
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
  };

  const searchDisabled = !postcodeOk;

  return (
<div className="w-full border border-gray-200 bg-gray-50 text-center shadow-sm py-4 mx-auto max-w-5xl mt-4">
        {/* ⬇️ Key change: align blocks from the top, and make each control its own “column” */}
          {/* ✅ Title */}
    <div className="px-5 text-center py-8 text-3xl">
      <Title text1="QUICK" text2="SEARCH" />
      {/* optional: tiny helper line */}
    </div>

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
          <p className="font-medium text-sm text-gray-700 mb-1">
            VENUE
          </p>

          <RoyalMailAddressNow
            captureKey="KR44-RW29-HH36-NC62"
            idPrefix="sb" // ✅ unique
            setAddress={setLocalAddress}
            setCounty={setCounty}
            setPostcode={setPostcode}
            initialValue={localAddress}
            className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
            placeholder="Type your venue..."
            required
          />
        </div>

        {/* Search button column */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          {/* label spacer to match the DATE/VENUE label height */}
          <div className="h-[20px] mb-1" aria-hidden="true" />
          <button
            className={`w-full sm:w-auto px-6 py-2 text-white transition duration-300 border-2 border-[#ff6667] ${
              searchDisabled
                ? "bg-[#ff6667] hover:bg-gray-400 cursor-not-allowed"
                : "bg-[#ff6667] hover:bg-[#ff3333]"
            }`}
            onClick={handleSearch}
            
          >
            SEARCH
          </button>

          {/* keep column height consistent with other columns */}
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
