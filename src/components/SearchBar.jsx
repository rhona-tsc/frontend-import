import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { ShopContext } from "../context/ShopContext";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import { gtagEvent } from "../utils/gtag";
import Title from "./Title";
import { useNavigate } from "react-router-dom";

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

const SearchBar = ({ embedded = false }) => {
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
  const navigate = useNavigate();

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
    openedAtRef.current = Date.now();
  }, []);

  const extractedPostcode = useMemo(() => {
    const m = String(localAddress || "")
      .toUpperCase()
      .match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/);
    return m ? m[1] : "";
  }, [localAddress]);

  const canSearch = useMemo(() => {
    const raw = postcode || extractedPostcode;
    const postcodeOk = isValidUKPostcode(raw);
    const dateOk = !!localDate.trim();
    return postcodeOk && dateOk;
  }, [postcode, extractedPostcode, localDate]);

  const searchDisabled = !canSearch;

  const handleSearch = () => {
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
      postcode_valid: pcOk,
    });

    if (!pcOk) {
      gtagEvent("searchbox_submit_error", {
        reason: "invalid_or_missing_postcode",
      });
      return alert(
        "Please type a full UK postcode (or select an address) so we can calculate travel."
      );
    }

    if (!localDate.trim()) {
      return alert("Please choose a date before searching.");
    }

    const pc = normaliseUKPostcode(rawPc);

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

    navigate("/acts");
  };

  return (
    <div className={embedded ? "w-full mt-6" : "w-full px-4 py-6 mx-auto max-w-6xl mt-6"}>
      <div
        className={
          embedded
            ? "rounded-[28px] border border-gray-200 bg-white shadow-sm px-4 py-5"
            : "rounded-[32px] border border-gray-200 bg-white shadow-sm px-5 py-6 md:px-8 md:py-8"
        }
      >
        <div className={embedded ? "text-left mb-4" : "text-center mb-6 md:mb-8"}>
          <div className={embedded ? "text-2xl mb-2" : "text-3xl mb-3"}>
            <Title text1="QUICK" text2="SEARCH" />
          </div>
          <p
            className={
              embedded
                ? "text-sm text-gray-600 max-w-xl"
                : "text-sm md:text-base text-gray-600 max-w-2xl mx-auto"
            }
          >
            Enter your event date and venue so we can show relevant acts and calculate travel.
          </p>
        </div>

        <div
          className={
            embedded
              ? "grid grid-cols-1 gap-3"
              : "grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-4 items-end"
          }
        >
          <div className="flex flex-col text-left">
            <label className="font-medium text-sm text-gray-700 mb-2">DATE</label>
            <input
              type="date"
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-700 outline-none focus:border-[#ff6667]"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label className="font-medium text-sm text-gray-700 mb-2">VENUE</label>
            <RoyalMailAddressNow
              captureKey="KR44-RW29-HH36-NC62"
              idPrefix="sb"
              setAddress={setLocalAddress}
              setCounty={setCounty}
              setPostcode={setPostcode}
              initialValue={localAddress}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-700"
              placeholder="Type your venue or postcode..."
              required
            />
          </div>

          <div className="flex flex-col">
            {!embedded && (
              <div className="hidden md:block h-[28px]" aria-hidden="true" />
            )}
            <button
              type="button"
              className={`w-full ${embedded ? "" : "md:w-auto"} rounded-full px-6 py-3 text-sm font-medium text-white transition ${
                searchDisabled
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#ff6667] hover:bg-[#ff4d4f]"
              }`}
              onClick={handleSearch}
              disabled={searchDisabled}
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SearchBar.propTypes = {
  embedded: PropTypes.bool,
};

export default SearchBar;