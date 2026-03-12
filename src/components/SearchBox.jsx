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

  // Determine if the search box is allowed to stay open on this route
  const isSearchRoute =
    location.pathname === "/acts" || location.pathname.startsWith("/act/");

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
const hasVenue = Boolean(addr) || pcOk; // ✅ only real address/postcode counts

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

    // ✅ If the user has just opened the search box, don't auto-close it.
    // This prevents the "opens then instantly closes" flicker when other logic decides it "shouldClose".
    if (showSearch) return;

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

  }, [location.pathname, searchSnapshot, showSearch, setShowSearch]);

  // Auto-hide when navigating away from /acts or /act/:slug routes
  useEffect(() => {
    // ✅ Only auto-hide if we leave routes where the search box is meant to be usable.
    // This prevents the "opens then closes" flicker on /act/:slug when the user clicks
    // "add my date and location".
    if (!isSearchRoute && showSearch) {
      setAnimate(false);
      setTimeout(() => setShowSearchDBG(false, "navigate_away_autohide"), 300);
    }
  }, [location.pathname, isSearchRoute, showSearch, setShowSearch]);

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
    className={`fixed top-16 left-0 right-0 z-50 px-4 py-4 transition-all duration-500 ${
      animate ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
    }`}
  >
    <div className="max-w-6xl mx-auto rounded-[32px] border border-gray-200 bg-white shadow-sm px-5 py-5 md:px-8 md:py-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-2">
            Search acts
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold leading-tight text-[#111]">
            Add your date and venue
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            Enter your event date and a UK postcode or venue so we can show relevant acts and calculate travel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleClose("manual")}
          className="shrink-0 rounded-full p-2 hover:bg-gray-100 transition"
          aria-label="Close search"
        >
          <img
            className="w-4 h-4"
            src={assets.cross_icon}
            alt="Close"
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_auto] gap-4 items-end">
        {/* Date */}
        <div className="flex flex-col">
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

        {/* Venue */}
        <div className="flex flex-col">
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

        {/* Button */}
        <div className="flex flex-col">
          <div className="hidden md:block h-[28px]" aria-hidden="true" />
          <button
            type="button"
            className={`w-full md:w-auto rounded-full px-6 py-3 text-sm font-medium text-white transition ${
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
) : null;
};

export default SearchBox;
