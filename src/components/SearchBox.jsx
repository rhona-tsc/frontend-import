import React, { useContext, useEffect, useMemo, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import { useLocation } from "react-router-dom";
import GoogleAutocomplete from "./GoogleAutocomplete";

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
    // ✅ if you have these in context already (like SearchBar), use them:
    setSelectedPostcode,
    setSelectedCounty,
  } = useContext(ShopContext);

  const [localAddress, setLocalAddress] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState(""); // ✅ NEW
  const [animate, setAnimate] = useState(false);

  const postcodeOk = useMemo(() => isValidUKPostcode(postcode), [postcode]);

  // ✅ Sync local state with stored address & date on mount
  useEffect(() => {
    setLocalAddress(selectedAddress || "");
    setLocalDate(selectedDate || "");

    // (optional) restore postcode/county if you store them
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
    if (!localAddress.trim()) {
      alert("Please enter a venue address.");
      return;
    }

    if (!localDate.trim()) {
      alert("Please select a date.");
      return;
    }

    // ✅ require postcode from selected Google place
    if (!postcodeOk) {
      alert(
        "Please select a venue that includes a valid UK postcode (choose an option from the dropdown)."
      );
      return;
    }

    const pc = normaliseUKPostcode(postcode);

    setSelectedAddress(localAddress);
    setSelectedDate(localDate);

    // ✅ if these exist in context, keep them in sync
    if (typeof setSelectedPostcode === "function") setSelectedPostcode(pc);
    if (typeof setSelectedCounty === "function") setSelectedCounty(county);

    sessionStorage.setItem("selectedAddress", localAddress);
    sessionStorage.setItem("selectedDate", localDate);
    sessionStorage.setItem("selectedCounty", county);
    sessionStorage.setItem("selectedPostcode", pc);

    handleClose();
  };

  const searchDisabled =
    !localAddress.trim() || !localDate.trim() || !county.trim() || !postcodeOk;

  return showSearch || animate ? (
    <div
      className={`fixed top-16 left-0 right-0 border-t border-b bg-gray-50 text-center shadow-md z-50 py-4 
      transition-all duration-500 ${
        animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-5">
        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-gray-700">DATE</p>
          <input
            type="date"
            className="border-2 border-gray-300 p-2 text-gray-500"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        {/* Google Autocomplete */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-gray-700">VENUE</p>
            <GoogleAutocomplete
              setAddress={setLocalAddress}
              setCounty={setCounty}
              setPostcode={setPostcode} // ✅ NEW (must be supported in component)
              initialValue={localAddress}
              className="text-base px-3 py-2 w-72 border-2 border-gray-300"
              placeholder="Start typing your venue..."
              required
            />
          </div>

          {/* helper line (reserve height so row doesn't jump) */}
          <div className="min-h-[16px] mt-1 ml-[52px]">
            {!postcodeOk && localAddress.trim() ? (
              <p className="text-xs text-[#ff6667]">
                Please select a result that includes a UK postcode.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Tip: choose a dropdown result so we can confirm the postcode.
              </p>
            )}
          </div>

          {/* optional: show captured postcode */}
          <div className="min-h-[16px] mt-1 ml-[52px]">
            {postcodeOk ? (
              <p className="text-xs text-green-600">
                Postcode detected: {normaliseUKPostcode(postcode)}
              </p>
            ) : (
              <span className="block text-xs opacity-0 select-none">placeholder</span>
            )}
          </div>
        </div>

        {/* Search Button */}
        <button
          className={`px-6 py-2 text-white transition duration-300 ${
            searchDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#ff6667] hover:bg-[#ff3333]"
          }`}
          onClick={handleSearch}
          disabled={searchDisabled}
        >
          SEARCH
        </button>

        {/* Close Button */}
        <img
          onClick={handleClose}
          className="w-4 cursor-pointer"
          src={assets.cross_icon}
          alt="Close"
        />
      </div>
    </div>
  ) : null;
};

export default SearchBox;