import React, { useContext, useDeferredValue, useState } from "react";
import { ShopContext } from "../context/ShopContext";


import Title from "../components/Title";
import ActItem from "../components/ActItem";
import { assets } from "../assets/assets";




const Acts = () => {
  const { actCards } = useContext(ShopContext); // use cards as on Home
  const cards = useDeferredValue(Array.isArray(actCards) ? actCards : []);
  const [showFilter, setShowFilter] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [genre, setGenre] = useState([]);
 const [isGenreSelected, setIsGenreSelected] = useState(false); // Track if any checkbox is checked
  const [isActSizeSelected, setIsActSizeSelected] = useState(false); // Track if any checkbox is checked
  const [isDjServicesSelected, setIsDjServicesSelected] = useState(false); // Track if any checkbox is checked
  const [isInstrumentsSelected, setIsInstrumentsSelected] = useState(false); // Track if any checkbox is checked
  const [isWirelessSelected, setIsWirelessSelected] = useState(false); // Track if any checkbox is checked
  const [isSongSearchSelected, setIsSongSearchSelected] = useState(false); // Track if any checkbox is checked
  const [isActSearchSelected, setIsActSearchSelected] = useState(false); // Track if any checkbox is checked
  const [isSoundLimitersSelected, setIsSoundLimitersSelected] = useState(false); // Track if any checkbox is checked
  const [isSetupAndSoundcheckSelected, setIsSetupAndSoundcheckSelected] =
    useState(false); // Track if any checkbox is checked
  const [isPaAndLightsSelected, setIsPaAndLightsSelected] = useState(false); // Track if any checkbox is checked
  const [isPliSelected, setIsPliSelected] = useState(false); // Track if any checkbox is checked
  const [isExtraServicesSelected, setIsExtraServicesSelected] = useState(false); // Track if any checkbox is checked
 const [showSoundLimiterFilter, setShowSoundLimitersFilter] = useState(false);
  const [showPliFilter, setShowPliFilter] = useState(false);
  const [showSongFilter, setShowSongFilter] = useState(false);
  const [showActFilter, setShowActFilter] = useState(false);
  const [showPaAndLightsFilter, setShowPaAndLightsFilter] = useState(false);
  const [showDjServicesFilter, setShowDjServicesFilter] = useState(false);
  const [showInstrumentsFilter, setShowInstrumentsFilter] = useState(false);
  const [showExtraServicesFilter, setShowExtraServicesFilter] = useState(false);
  const [showSetupAndSoundcheckFilter, setShowSetupAndSoundcheckFilter] =
    useState(false);
  const [showActSizeFilter, setShowActSizeFilter] = useState(false);
  const [showWirelessFilter, setShowWirelessFilter] = useState(false);




  const triggerSearch = () => {
    setShowSearch(true); // ✅ Open the search box
    navigate("/acts");
    window.scrollTo(0, 0); // ✅ Ensure it stays on the acts page
  };

  const toggleGenre = (e) => {
    const value = e.target.value;

    setGenre((prev) => {
      const newGenre = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsGenreSelected(newGenre.length > 0);

      return newGenre;
    });
  };

  const toggleActSize = (e) => {
    const value = e.target.value;

    setActSize((prev) => {
      const newActSize = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsActSizeSelected(newActSize.length > 0);

      return newActSize;
    });
  };

  const toggleDjServices = (e) => {
    const value = e.target.value;

    setDjServices((prev) => {
      const newDjServices = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsDjServicesSelected(newDjServices.length > 0);

      return newDjServices;
    });
  };

  const toggleInstruments = (e) => {
    const value = e.target.value;

    setInstruments((prev) => {
      const newInstruments = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsInstrumentsSelected(newInstruments.length > 0);

      return newInstruments;
    });
  };



  const toggleSoundLimiters = (e) => {
    const value = e.target.value;

    setSoundLimiters((prev) => {
      const newSoundLimiters = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsSoundLimitersSelected(newSoundLimiters.length > 0);

      return newSoundLimiters;
    });
  };

  const toggleSetupAndSoundcheck = (e) => {
    const value = e.target.value;

    setSetupAndSoundcheck((prev) => {
      const newSetupAndSoundcheck = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsSetupAndSoundcheckSelected(newSetupAndSoundcheck.length > 0);

      return newSetupAndSoundcheck;
    });
  };

  const togglePaAndLights = (e) => {
    const value = e.target.value;

    setPaAndLights((prev) => {
      const newPaAndLights = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsPaAndLightsSelected(newPaAndLights.length > 0);

      return newPaAndLights;
    });
  };

const togglePli = (e) => {
  const value = Number(e.target.value);

  setPli((prev) => {
    const newPli = prev.includes(value)
      ? prev.filter((item) => item !== value)
      : [...prev, value];

    setIsPliSelected(newPli.length > 0);

    return newPli;
  });
};

  const toggleExtraServices = (e) => {
    const value = e.target.value;

    setExtraServices((prev) => {
      const newExtraServices = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsExtraServicesSelected(newExtraServices.length > 0);

      return newExtraServices;
    });
  };

  const toggleWireless = (e) => {
    const value = e.target.value;

    setWireless((prev) => {
      const newWireless = prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value];

      // ✅ Hide the asset if at least one checkbox is checked
      setIsWirelessSelected(newWireless.length > 0);

      return newWireless;
    });
  };

  const labelMap = {
    electric_drums: "Has electric drum kit",
    iems: "Uses in-ear monitoring",
    can_you_make_act_acoustic: "Can make act acoustic",
    remove_drums: "Can remove drums from lineup",

    // DJ Serrvices
    up_to_3_hours_band_member_DJ: "Band member DJ",
    DJ_live_sax_3x30mins: "DJ Live with saxophone",
    DJ_live_bongos_3x30mins: "DJ Live with bongos",
    DJ_live_bongos_and_sax_3x30mins: "DJ Live with saxophone and bongos",
    background_music_playlist: "Background music playlist",
    up_to_3_hours_manned_playlist: "Manned playlist",

    // Setup and Soundcheck
    setup_and_soundcheck_time_60min: "60min setup & soundcheck",
    setup_and_soundcheck_time_90min: "90min setup & soundcheck",
    speedy_setup: "60min speedy setup & soundcheck",

    // PA & Lights
    small_pa_size: "Small PA system",
    medium_pa_size: "Medium PA system",
    large_pa_size: "Large PA system",
    small_light_size: "Small light system",
    medium_light_size: "Medium light system",
    large_light_size: "Large light system",

    // PLI
    1: "Up to £1m",
    2: "Up to £2m",
    3: "Up to £3m",
    4: "Up to £4m",
    5: "Up to £5m",
    10: "Up to £10m",
    15: "Up to £15m",
    20: "Up to £20m",

    // Extra Services
    ceremony_solo: "Ceremony Solo",
    duo_ceremony: "Ceremony Duo",
    trio_ceremony: "Ceremony Trio",
    four_piece_ceremony: "Ceremony 4-piece",
    afternoon_solo: "Afternoon Reception Solo",
    afternoon_duo: "Afternoon Reception Duo",
    afternoon_trio: "Afternoon Reception Trio",
    afternoon_4piece: "Afternoon Reception 4-piece",
    early_arrival: "Early Arrival",
    late_stay: "Late Stay",
    extra_song: "Extra Song Requests",
    extra_sets: "Extra Main Performance Sets",
    add_another_vocalist: "Add another vocalist",
    sound_engineering_for_another_act: "Sound engineering for another act",
    israeli_sets: "Israeli dancing sets",
  };


  const formatDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();

    // Convert day to "1st", "2nd", "3rd", etc.
    const suffix = ["th", "st", "nd", "rd"][
      day % 10 > 3 ? 0 : ((day % 100) - (day % 10) !== 10) * (day % 10)
    ];

    return `${day}${suffix} of ${month} ${year}`;
  };


  return (
  <div className="my-10 max-w-7xl mx-auto px-4">
    {/* Two-column layout */}
    <div className="grid grid-cols-12 gap-6">

      {/* LEFT: Filters */}
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="md:sticky md:top-20 md:self-start">
          <p
            onClick={() => setShowFilter(!showFilter)}
            className="my-2 text-l flex items-center cursor-pointer gap-2 text-gray-600"
          >
            FILTERS
            <img
              className={`h-3 md:hidden transition-transform duration-300 ${showFilter ? "rotate-90" : ""}`}
              src={assets.dropdown_icon}
              alt=""
            />
          </p>

          <div
            className={`border border-gray-300 pl-5 py-3 my-5 ${showFilter ? "block" : "hidden"} md:block`}
          >
            {/* ------- GENRES ------- */}
            <p
              onClick={() => setShowGenreFilter(!showGenreFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              GENRES
              <img
                className={`h-3 transition-transform duration-300 ${showGenreFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showGenreFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your genre checkboxes exactly as before ... */}
                {/* (keep all your <label> items here unchanged) */}
              </div>
            )}

            {/* ------- ACT SIZE ------- */}
            <p
              onClick={() => setShowActSizeFilter(!showActSizeFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              ACT SIZE
              <img
                className={`h-3 transition-transform duration-300 ${showActSizeFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showActSizeFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your act size checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- DJ SERVICES ------- */}
            <p
              onClick={() => setShowDjServicesFilter(!showDjServicesFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              DJ SERVICES
              <img
                className={`h-3 transition-transform duration-300 ${showDjServicesFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showDjServicesFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your DJ services checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- INSTRUMENTS ------- */}
            <p
              onClick={() => setShowInstrumentsFilter(!showInstrumentsFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              INSTRUMENTS
              <img
                className={`h-3 transition-transform duration-300 ${showInstrumentsFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showInstrumentsFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your instruments checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- WIRELESS ------- */}
            <p
              onClick={() => setShowWirelessFilter(!showWirelessFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              WIRELESS
              <img
                className={`h-3 transition-transform duration-300 ${showWirelessFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showWirelessFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your wireless checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- SONG & ARTIST SEARCH ------- */}
            <p
              onClick={() => setShowSongFilter(!showSongFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              SONG & ARTIST SEARCH
              <img
                className={`h-3 transition-transform duration-300 ${showSongFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showSongFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your song search input unchanged ... */}
              </div>
            )}

            {/* ------- ACT NAME SEARCH ------- */}
            <p
              onClick={() => setShowActFilter(!showActFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              ACT NAME SEARCH
              <img
                className={`h-3 transition-transform duration-300 ${showActFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showActFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your act name input unchanged ... */}
              </div>
            )}

            {/* ------- SOUND LIMITERS ------- */}
            <p
              onClick={() => setShowSoundLimitersFilter(!showSoundLimiterFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              SOUND LIMITERS
              <img
                className={`h-3 transition-transform duration-300 ${showSoundLimiterFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showSoundLimiterFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your sound limiter checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- SETUP & SOUNDCHECK ------- */}
            <p
              onClick={() => setShowSetupAndSoundcheckFilter(!showSetupAndSoundcheckFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              SETUP & SOUNDCHECK
              <img
                className={`h-3 transition-transform duration-300 ${showSetupAndSoundcheckFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showSetupAndSoundcheckFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your setup & soundcheck checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- PA & LIGHTS ------- */}
            <p
              onClick={() => setShowPaAndLightsFilter(!showPaAndLightsFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              PA & LIGHTS
              <img
                className={`h-3 transition-transform duration-300 ${showPaAndLightsFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showPaAndLightsFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your PA & lights checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- PLI ------- */}
            <p
              onClick={() => setShowPliFilter(!showPliFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              PLI
              <img
                className={`h-3 transition-transform duration-300 ${showPliFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showPliFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your PLI checkboxes unchanged ... */}
              </div>
            )}

            {/* ------- EXTRA SERVICES ------- */}
            <p
              onClick={() => setShowExtraServicesFilter(!showExtraServicesFilter)}
              className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
            >
              EXTRA SERVICES
              <img
                className={`h-3 transition-transform duration-300 ${showExtraServicesFilter ? "rotate-90" : ""}`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            {showExtraServicesFilter && (
              <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                {/* ... your extra services checkboxes unchanged ... */}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* RIGHT: Results */}
      <main className="col-span-12 md:col-span-8 lg:col-span-9">
        <div className="text-center md:text-left py-2">
          <Title text1="ALL" text2="ACTS" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-6">
          {cards.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">
              No acts to show yet.
            </p>
          ) : (
            cards.map((item) => (
              <div
                key={String(item.actId || item._id || item.id)}
                style={{ contentVisibility: "auto", containIntrinsicSize: "320px 420px" }}
              >
                <ActItem actData={item} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  </div>
);
};

export default Acts;