import React from 'react';
import { assets } from '../assets/assets';

const Hero = () => {
  return (
    <div className="mt-16 flex flex-col sm:flex-row border border-gray-200 border-t-0 bg-white overflow-hidden">
      {/* Hero Left Side */}
      <div className="w-full sm:w-1/2 flex items-center justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="text-[#414141] max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <p className="w-8 md:w-11 h-[2px] bg-[#414141]"></p>
            <p className="font-medium text-sm md:text-base tracking-[0.12em]">BOOK NOW</p>
          </div>

          <h1 className="prata-regular text-3xl sm:text-4xl lg:text-5xl leading-tight sm:leading-tight lg:leading-[1.1]">
            Exceptional Event & Wedding Bands for Hire
          </h1>

          <p className="mt-4 text-sm sm:text-base text-gray-600 leading-7 max-w-lg">
            Discover standout live entertainment for weddings, parties and corporate events, with flexible line-ups, trusted musicians and a seamless booking experience.
          </p>

          <div className="flex items-center gap-2 mt-5">
            <p className="font-semibold text-sm md:text-base">LET'S GET THIS PARTY STARTED</p>
            <p className="w-8 md:w-11 h-[1px] bg-[#414141]"></p>
          </div>
        </div>
      </div>

      {/* Hero Right Side */}
      <div className="w-full sm:w-1/2 h-[150px] sm:h-[280px] lg:h-[340px]">
        <img
          className="w-full h-full object-cover"
          src={assets.hero_img}
          alt="Live wedding and event band performing"
        />
      </div>
    </div>
  );
};

export default Hero;
import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { ShopContext } from "../context/ShopContext";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import { gtagEvent } from "../utils/gtag";
import Title from "./Title";
import { useNavigate } from "react-router-dom";

const isValidUKPostcode = (value = "") => {
  const pc = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc);
};

const normaliseUKPostcode = (value = "") => {
  const pc = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (pc.length < 5) return value;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(-3)}`;
};

const SearchBar = ({ overlay = false }) => {
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
    <div className={overlay ? "w-full" : "w-full px-4 py-6 mx-auto max-w-6xl mt-6"}>
      <div
        className={
          overlay
            ? "rounded-[28px] border border-gray-200 bg-white/95 backdrop-blur shadow-xl px-5 py-5"
            : "rounded-[32px] border border-gray-200 bg-white shadow-sm px-5 py-6 md:px-8 md:py-8"
        }
      >
        <div className={overlay ? "text-center mb-4" : "text-center mb-6 md:mb-8"}>
          <div className={overlay ? "text-2xl mb-2" : "text-3xl mb-3"}>
            <Title text1="QUICK" text2="SEARCH" />
          </div>
          <p
            className={
              overlay
                ? "text-sm text-gray-600 max-w-xl mx-auto"
                : "text-sm md:text-base text-gray-600 max-w-2xl mx-auto"
            }
          >
            Enter your event date and venue so we can show relevant acts and calculate travel.
          </p>
        </div>

        <div
          className={
            overlay
              ? "grid grid-cols-1 gap-3 items-end"
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
            <div className={overlay ? "hidden" : "hidden md:block h-[28px]"} aria-hidden="true" />
            <button
              type="button"
              className={`w-full ${overlay ? "" : "md:w-auto"} rounded-full px-6 py-3 text-sm font-medium text-white transition ${
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
  overlay: PropTypes.bool,
};

export default SearchBar;
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';

const DBG = true;
const log = (...args) => DBG && console.log('🏠[Home]', ...args);
const group = (label, fn) => {
  if (!DBG) return fn();
  console.groupCollapsed(`🏠[Home] ${label}`);
  try {
    fn();
  } finally {
    console.groupEnd();
  }
};

const SearchBar = lazy(() => import('../components/SearchBar'));
const NewActs = lazy(() => import('../components/NewActs'));
const BestSeller = lazy(() => import('../components/BestSeller'));
const OurPolicy = lazy(() => import('../components/OurPolicy'));
const NewsletterBox = lazy(() => import('../components/NewsletterBox'));

const Fallback = ({ label, className }) => {
  useEffect(() => {
    log(`⏳ Suspense fallback mounted for ${label}`);
    return () => log(`✅ Suspense fallback unmounted for ${label}`);
  }, [label]);

  return <div className={className} />;
};

const LogMount = ({ label, children }) => {
  useEffect(() => {
    log(`📦 ${label} mounted`);
    return () => log(`🧹 ${label} unmounted`);
  }, [label]);

  return children;
};

const FeaturedBlogSection = () => {
  return (
    <section className="px-4 py-16 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 items-center rounded-[32px] border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-3">
            From the blog
          </p>

          <h2 className="text-3xl md:text-4xl font-semibold mb-4 leading-tight text-[#111]">
            5 Ways Live Music Transforms an Event
          </h2>

          <p className="text-lg text-gray-600 mb-6 leading-8">
            From atmosphere and emotion to guest energy and unforgettable dance
            floor moments, discover how live music can completely change the
            feel of a wedding or event.
          </p>

          <Link
            to="/blog/5-ways-live-music-transforms-an-event"
            className="inline-flex rounded-full bg-[#111] px-6 py-3 text-white hover:opacity-90 transition"
          >
            Read the blog
          </Link>
        </div>

        <Link
          to="/blog/5-ways-live-music-transforms-an-event"
          className="block"
        >
          <div className="overflow-hidden rounded-[28px] bg-gray-100 aspect-[4/3]">
            <img
              src="/images/blog/live-music-transforms-event-hero.jpg"
              alt="Live wedding band performing to a packed dance floor"
              className="h-full w-full object-cover"
            />
          </div>
        </Link>
      </div>
    </section>
  );
};

const Home = () => {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    group('Initial mount', () => {
      log('component mounted');
      log('scroll -> top');
    });
    window.scrollTo(0, 0);

    return () => log('component unmounted');
  }, []);

  useEffect(() => {
    const hasRIC =
      typeof window !== 'undefined' && 'requestIdleCallback' in window;

    group('Idle scheduling for SearchBar', () => {
      log('requestIdleCallback available?', hasRIC);
    });

    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const start = performance.now();

    const id = ric(() => {
      log(
        `🕒 idle fired after ${(performance.now() - start).toFixed(
          0
        )}ms → showSearch = true`
      );
      setShowSearch(true);
    });

    return () => {
      log('cancel idle for SearchBar');
      cancel(id);
    };
  }, []);

  useEffect(() => {
    log('🔁 showSearch changed →', showSearch);
  }, [showSearch]);

  return (
    <div>
      <div className="relative lg:pb-[190px]">
        <Hero />

        <Suspense fallback={<Fallback label="SearchBarOverlay" className={null} />}>
          {showSearch ? (
            <div className="hidden lg:block absolute right-6 bottom-6 z-20 w-[min(100%-3rem,560px)]">
              <LogMount label="SearchBarOverlay">
                <SearchBar overlay />
              </LogMount>
            </div>
          ) : null}
        </Suspense>
      </div>

      <Suspense fallback={<Fallback label="SearchBar" className={null} />}>
        {showSearch ? (
          <div className="lg:hidden">
            <LogMount label="SearchBar">
              <SearchBar />
            </LogMount>
          </div>
        ) : null}
      </Suspense>

      <Suspense fallback={<Fallback label="NewActs" className="h-64 animate-pulse" />}>
        <LogMount label="NewActs">
          <NewActs />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="OurPolicy" className="h-40 animate-pulse" />}>
        <LogMount label="OurPolicy">
          <OurPolicy />
        </LogMount>
      </Suspense>

      <Suspense fallback={<Fallback label="BestSeller" className="h-64 animate-pulse" />}>
        <LogMount label="BestSeller">
          <BestSeller />
        </LogMount>
      </Suspense>

      <FeaturedBlogSection />

      <Suspense fallback={<Fallback label="NewsletterBox" className="h-40 animate-pulse" />}>
        <LogMount label="NewsletterBox">
          <NewsletterBox />
        </LogMount>
      </Suspense>
    </div>
  );
};

export default Home;
