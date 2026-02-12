import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import { useLocation } from "react-router-dom";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import { gtagEvent } from "../utils/gtag";

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

  // ---------------- DEBUG ----------------
  const SB_DEBUG = true; // flip off anytime
  const SB = (...args) => SB_DEBUG && console.log("🔎 [SearchBox]", ...args);
  const SB_GROUP = (label) => {
    if (!SB_DEBUG) return;
    try {
      console.groupCollapsed(label);
    } catch {}
  };
  const SB_END = () => {
    if (!SB_DEBUG) return;
    try {
      console.groupEnd();
    } catch {}
  };
const setShowSearchDBG = (next, reason = "unknown") => {
  const value = typeof next === "function" ? next(showSearch) : next;
  console.groupCollapsed(
    `🧭 [SearchBox] setShowSearch(${String(value)}) — reason: ${reason}`
  );
  console.log("route:", location.pathname);
  console.log("BEFORE showSearch:", showSearch, "animate:", animate);
  console.trace("stack");
  console.groupEnd();
  setShowSearch(value);
};
  // choose behaviour:
  // true  => open if missing date OR missing venue (old strict mode)
  // false => open only if missing venue (recommended to stop preset re-open)
  const STRICT_REQUIRE_DATE_TO_HIDE = false;

  const [localAddress, setLocalAddress] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [animate, setAnimate] = useState(false);

  const openedAtRef = useRef(null);
  const DISMISS_KEY = "acts:searchboxDismissed";

  // Keep local inputs in sync with context + session storage (on load)
  useEffect(() => {
    setLocalAddress(selectedAddress || "");
    setLocalDate(selectedDate || "");

    const ssPc = sessionStorage.getItem("selectedPostcode") || "";
    const ssCounty = sessionStorage.getItem("selectedCounty") || "";
    if (!postcode && ssPc) setPostcode(ssPc);
    if (!county && ssCounty) setCounty(ssCounty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress, selectedDate]);

  const getStored = (key) => sessionStorage.getItem(key) || "";
  // ✅ Determine if we already have enough info to NOT show the search box on /acts
  // Rule: date required AND (address OR valid postcode) present (from context or session storage)
  const searchSnapshot = useMemo(() => {
    const ssAddr = getStored("selectedAddress");
    const ssDate = getStored("selectedDate");
 

    const ssPlace = getStored("selectedPlace");

    const ctxAddr = String(selectedAddress || "").trim();
    const ctxDate = String(selectedDate || "").trim();
    

    const date = (ctxDate || ssDate).trim();
    const addr = (ctxAddr || ssAddr).trim();
const extractPostcode = (text = "") => {
      const m = String(text || "")
        .toUpperCase()
        .match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/);
      return m ? m[1] : "";};
    // ✅ postcode can come from context, session, or be embedded in address text
    const rawPc = ( extractPostcode(addr)).trim();

    const pcOk = isValidUKPostcode(rawPc);
    const hasVenue =
      Boolean(addr) || pcOk || Boolean( ssPlace);

    const hasCompleteSearch = Boolean(date) && (Boolean(addr) || pcOk);

    return {
      // sources
      ctx: { ctxAddr, ctxDate},
      ss: { ssAddr, ssDate, ssPlace },

      // resolved
      resolved: { date, addr, rawPc, pcOk, hasVenue, hasCompleteSearch },
    };
  }, [selectedAddress, selectedDate]);


  useEffect(() => {
  if (showSearch) setAnimate(true);
  else setAnimate(false);
}, [showSearch]);

  // ✅ On arrival to /acts:
  // - if complete search exists → keep CLOSED
  // - else → OPEN so they must enter details
  useEffect(() => {
    if (location.pathname !== "/acts") return;

    const { resolved, ctx, ss } = searchSnapshot;
    const { hasVenue, hasCompleteSearch } = resolved;

    // Decide based on chosen rule
    const shouldClose = STRICT_REQUIRE_DATE_TO_HIDE
      ? hasCompleteSearch // strict: needs date+venue to close
      : hasVenue; // recommended: any venue closes

    const dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";

    SB_GROUP("📍 /acts searchbox decision");
    SB("showSearch BEFORE:", showSearch);
    SB("STRICT_REQUIRE_DATE_TO_HIDE:", STRICT_REQUIRE_DATE_TO_HIDE);
    SB("dismissed:", dismissed);
    SB("ctx:", ctx);
    SB("ss:", ss);
    SB("resolved:", resolved);
    SB(
      "DECISION:",
      shouldClose ? "CLOSE ✅" : dismissed ? "STAY CLOSED (dismissed) ✅" : "OPEN ❗️",
    );
    SB_END();

    

    // If user dismissed manually, don't auto-reopen until we have enough info
    if (!shouldClose && dismissed) {
      setAnimate(false);
      setShowSearchDBG(false, "acts_decision_close");
      return;
    }

    

    // If we now have enough info, clear any old dismissal
    if (shouldClose && dismissed) {
      sessionStorage.removeItem(DISMISS_KEY);
    }

if (shouldClose) {
  setAnimate(false);
  setShowSearchDBG(false, "acts_decision_close");
} else {
  // 🚫 SearchBox should NOT auto-open on /acts.
  // Acts page (or ShopContext) decides whether to open.
  setAnimate(false);
  // (optional) if you want to be explicit:
  // setShowSearchDBG(false, "acts_decision_no_autopen");
}

  }, [location.pathname, searchSnapshot, setShowSearch]);

  // Auto-hide when navigating away from /acts (optional behaviour you already had)
  useEffect(() => {
    if (location.pathname !== "/acts" && showSearch) {
      setAnimate(false);
setTimeout(() => setShowSearchDBG(false, "navigate_away_autohide"), 300);    }
  }, [location.pathname, showSearch, setShowSearch]);

  // Animate in when opened
useEffect(() => {
  setAnimate(showSearch);
}, [showSearch]);

  const handleClose = (reason = "manual") => {
    SB("handleClose()", { reason });

    // If user clicked X, remember dismissal so /acts auto-open logic doesn't re-open it
    if (reason === "manual") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }

    // If search completed successfully, clear any previous dismissal
    if (reason === "submit_success") {
      sessionStorage.removeItem(DISMISS_KEY);
    }

    setAnimate(false);
setTimeout(() => setShowSearchDBG(false, `handleClose:${reason}`), 500);  };

  useEffect(() => {
    SB_GROUP("🎛 showSearch changed");
    SB("showSearch:", showSearch, "animate:", animate);
    SB("selectedAddress:", selectedAddress);
    SB("selectedDate:", selectedDate);

    SB("ss.selectedAddress:", sessionStorage.getItem("selectedAddress"));
    SB("ss.selectedDate:", sessionStorage.getItem("selectedDate"));
    SB("ss.selectedPostcode:", sessionStorage.getItem("selectedPostcode"));
    SB("ls.selectedAddress:", localStorage.getItem("selectedAddress"));
SB("ls.selectedDate:", localStorage.getItem("selectedDate"));
SB("ls.selectedPostcode:", localStorage.getItem("selectedPostcode"));
    SB_END();

    if (showSearch) openedAtRef.current = Date.now();
  }, [showSearch]); // keep it tight

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
      postcode_valid: pcOk,
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

    // Clear any previous manual dismissal because we now have a valid search
    sessionStorage.removeItem(DISMISS_KEY);

    handleClose("submit_success");
  };

  // ✅ Enable button if postcode is valid OR user typed a postcode into venue input
  const extractedPostcode = useMemo(() => {
    const m = String(localAddress || "")
      .toUpperCase()
      .match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/);
    return m ? m[1] : "";
  }, [localAddress]);

  const canSearch = useMemo(() => {
    const raw = postcode || extractedPostcode;
    const pcOk = isValidUKPostcode(raw);
    const dateOk = !!localDate.trim();
    return pcOk && dateOk;
  }, [postcode, extractedPostcode, localDate]);

  const searchDisabled = !canSearch;

  return showSearch || animate ? (
    <div
      className={`fixed top-16 left-0 right-0 border-t border-b bg-gray-50 text-center shadow-md z-50 py-4 
      transition-all duration-500 ${
        animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
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
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>

        {/* Venue column */}
        <div className="w-full sm:w-[420px] flex flex-col text-left">
          <p className="font-medium text-sm text-gray-700 mb-1">VENUE</p>

          <RoyalMailAddressNow
            captureKey="KR44-RW29-HH36-NC62"
            idPrefix="sb" // ✅ unique
            setAddress={setLocalAddress}
            setCounty={setCounty}
            setPostcode={setPostcode}
            initialValue={localAddress}
            className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
            placeholder="Type your venue or postcode..."
            required
          />
        </div>

        {/* Search button column */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          <div className="h-[20px] mb-1" aria-hidden="true" />
          <button
            type="button"
            className={`w-full sm:w-auto px-6 py-2 text-white transition duration-300 border-2 border-[#ff6667] ${
              searchDisabled
                ? "bg-[#ff6667] hover:bg-gray-400 cursor-not-allowed"
                : "bg-[#ff6667] hover:bg-[#ff3333]"
            }`}
            onClick={handleSearch}
            disabled={searchDisabled}
          >
            SEARCH
          </button>

          <div className="min-h-[16px] mt-1" aria-hidden="true" />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>

        {/* Close */}
        <div className="mb-4 pt-[22px] sm:pt-[22px]">
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
