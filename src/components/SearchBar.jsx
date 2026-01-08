import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import GoogleAutocomplete from "./GoogleAutocomplete";

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
  const [postcode, setPostcode] = useState(""); // ✅ NEW
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
    sessionStorage.setItem("selectedPostcode", pc); // ✅ store it
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

    // ✅ require a postcode from the selected Google place
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
        postcode: pc, // ✅ pass it along
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
    // ✅ Only trigger when both date and a confirmed Google place (county + postcode) exist
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
  }, [localDate, localAddress, county, postcodeOk, shortlistedActs, handleDateOrAddressChange, requestVocalistAvailability]);

  const searchDisabled =
    !localDate?.trim() || !localAddress?.trim() || !county?.trim() || !postcodeOk;

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
              className="w-full border-2 border-gray-300 p-2 shadow-sm text-gray-700 rounded"
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

            <GoogleAutocomplete
              setAddress={setLocalAddress}
              setCounty={setCounty}
              setPostcode={setPostcode} // ✅ NEW
              className="w-full text-base px-3 py-2 border-2 border-gray-300 rounded"
              placeholder="Start typing your venue (select from dropdown)..."
              id="qs-venue"
            />

            {/* ✅ helper text */}
            {!postcodeOk && localAddress?.trim() ? (
              <p className="mt-1 text-xs text-[#ff6667]">
                Please select a result that includes a UK postcode.
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">
                Tip: choose a dropdown result (not free-typed) so we can confirm the postcode.
              </p>
            )}

            {/* Optional: show captured postcode */}
            {postcodeOk ? (
              <p className="mt-1 text-xs text-green-400">
                Postcode detected: {normaliseUKPostcode(postcode)}
              </p>
            ) : null}
          </div>

         {/* Search button */}
<div className="w-full sm:w-auto flex flex-col">
  {/* spacer to match the label height above inputs */}
  <div className="h-[19px] mb-1" aria-hidden="true" />
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
        </div>
      </div>
    </section>
  );
};

export default SearchBar;