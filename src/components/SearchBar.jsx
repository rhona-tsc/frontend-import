import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import RoyalMailAddressNow from "./RoyalMailAddressNow";

// UK postcode validator (accepts with/without space, normalises later)
const isValidUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase();
  // broad but solid UK postcode regex
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc);
};

// Optional: normalise to "SW1A 1AA"
const normaliseUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (pc.length < 5) return value;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(-3)}`;
};

const SearchBar = () => {
  const {
    shortlistedActs,
    handleDateOrAddressChange,
    requestVocalistAvailability,
    setSelectedAddress,
    setSelectedDate,
  } = useContext(ShopContext);

  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const navigate = useNavigate();

  // Local controlled inputs
  const [localAddress, setLocalAddress] = useState("");
  const [localDate, setLocalDate] = useState("");

  const postcodeOk = useMemo(() => isValidUKPostcode(postcode), [postcode]);

  const handleSearch = async () => {
    const pc = normaliseUKPostcode(postcode);

    sessionStorage.setItem("selectedAddress", localAddress);
    sessionStorage.setItem("selectedDate", localDate);
    sessionStorage.setItem("selectedCounty", county);
    sessionStorage.setItem("selectedPostcode", pc);
    sessionStorage.removeItem("availabilityBadges");

    if (!localAddress.trim()) {
      alert("Please enter a venue address.");
      return;
    }
    if (!localDate.trim()) {
      alert("Please select a date.");
      return;
    }
    if (!county.trim()) {
      alert("Please wait for the venue to be selected or try again.");
      return;
    }

    if (!postcodeOk) {
      alert(
        "Please select a venue that includes a valid UK postcode (choose an option from the dropdown)."
      );
      return;
    }

    // Sync with global context
    setSelectedAddress(localAddress);
    setSelectedDate(localDate);

    navigate("/acts", {
      state: {
        county,
        postcode: pc,
        selectedAddress: localAddress,
        selectedDate: localDate,
      },
    });
    window.scrollTo({ top: 0, left: 0 });
  };

  /* -------------------------------------------------------
     AUTO-TRIGGER: when date + address both change,
     update shortlisted acts and request availability.
  -------------------------------------------------------- */
  useEffect(() => {
    // Only trigger when both date and a confirmed selection (county + postcode) exist
    if (!localDate || !localAddress || !county || !postcodeOk) return;

    const dateISO = new Date(localDate).toISOString().slice(0, 10);

    shortlistedActs.forEach(async (actId) => {
      try {
        await handleDateOrAddressChange(actId, dateISO);
        await requestVocalistAvailability({ actId, lineupId: null });
      } catch {
        // swallow per-item failures
      }
    });
  }, [
    localDate,
    localAddress,
    county,
    postcodeOk,
    shortlistedActs,
    handleDateOrAddressChange,
    requestVocalistAvailability,
  ]);

  const searchDisabled =
    !localDate?.trim() ||
    !localAddress?.trim() ||
    !county?.trim() ||
    !postcodeOk;

  return (
    <section className="w-full bg-black py-6">
      <div className="mx-auto max-w-6xl px-4">
        {/* Row 1: Title */}
        <div className="mb-4">
          <h2 className="text-white text-3xl sm:text-4xl font-semibold">
            Quick Search
          </h2>
        </div>

        {/* Row 2: Controls */}
        <div className="flex flex-wrap items-start gap-4">
          {/* Date */}
          <div className="flex-1 min-w-[220px]">
            <label
              className="block text-white text-xs sm:text-sm mb-1"
              htmlFor="qs-date"
            >
              DATE
            </label>
            <input
              id="qs-date"
              type="date"
              // ✅ match SearchBox: square edges + thicker border + simple padding
              className="border-2 border-gray-300 p-2 text-gray-500 bg-white w-full"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Venue */}
          <div className="flex-[2] min-w-[260px]">
            <label
              className="block text-white text-xs sm:text-sm mb-1"
              htmlFor="qs-venue"
            >
              VENUE
            </label>

            <RoyalMailAddressNow
              // if you're using different keys per location, pass it here
              // captureKey="uu93-fd14-xw69-bu42"
              setAddress={setLocalAddress}
              setCounty={setCounty}
              setPostcode={setPostcode}
              // ✅ match SearchBox: square edges + thicker border
              className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
              placeholder="Start typing your venue"
              id="qs-venue"
            />

            {/* Optional: show captured postcode like SearchBox does */}
            <div className="min-h-[16px] mt-1">
              {postcodeOk ? (
                <p className="text-xs text-green-400">
                  Postcode detected: {normaliseUKPostcode(postcode)}
                </p>
              ) : (
                <span className="block text-xs opacity-0 select-none">
                  placeholder
                </span>
              )}
            </div>
          </div>

          {/* Search button */}
          <div className="w-full sm:w-auto flex flex-col">
            {/* spacer to match the label height above inputs */}
            <div className="h-[18px] mb-1" aria-hidden="true" />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchDisabled}
              // ✅ closer to SearchBox: py-2, rounded (small), no heavy font class
              className={`w-full sm:w-auto px-6 py-2 border-2 border-[#ff6667] bg-[#ff6667] text-white transition duration-300 ${
                searchDisabled
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#ff6667] hover:bg-[#ff3333]"
              }`}
            >
              SEARCH
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchBar;