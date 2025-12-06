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
    <div className="my-10">

       {/* Filter options */}
      <div className="min-w-60 max-w-60">
        <p
          onClick={() => setShowFilter(!showFilter)}
          className="my-2 text-l flex items-center cursor-pointer gap-2 text-gray-600"
        >
          FILTERS
          <img
            className={`h-3 sm:hidden transition-transform duration-300 ${showFilter ? "rotate-90" : ""}`}
            src={assets.dropdown_icon}
            alt=""
          />
        </p>

        <div
          className={`border border-gray-300 pl-5 py-3 my-5 ${showFilter ? "" : "hidden"} sm:block`}
        >
          {/* Genre filter */}
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

          {/* Genre options dropdown */}
          {showGenreFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Soul & Motown"}
                  onChange={toggleGenre}
                  checked={genre.includes("Soul & Motown")}
                />{" "}
                Soul & Motown
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Funk & Disco"
                  onChange={toggleGenre}
                  checked={genre.includes("Funk & Disco")}
                />{" "}
                Funk & Disco
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Indie & Rock"
                  onChange={toggleGenre}
                  checked={genre.includes("Indie & Rock")}
                />{" "}
                Indie & Rock
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Alternative & Punk"
                  onChange={toggleGenre}
                  checked={genre.includes("Alternative & Punk")}
                />{" "}
                Alternative & Punk
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Pop & Classic Pop"
                  onChange={toggleGenre}
                  checked={genre.includes("Pop & Classic Pop")}
                />{" "}
                Pop & Classic Pop
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Dance & Electronic"
                  onChange={toggleGenre}
                  checked={genre.includes("Dance & Electronic")}
                />{" "}
                Dance & Electronic
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Reggae & Afrobeat"
                  onChange={toggleGenre}
                  checked={genre.includes("Reggae & Afrobeat")}
                />{" "}
                Reggae & Afrobeat
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="RnB, HipHop & Garage"
                  onChange={toggleGenre}
                  checked={genre.includes("RnB, HipHop & Garage")}
                />{" "}
                RnB, HipHop & Garage
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="90s"
                  onChange={toggleGenre}
                  checked={genre.includes("90s")}
                />{" "}
                90s
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Latin"
                  onChange={toggleGenre}
                  checked={genre.includes("Latin")}
                />{" "}
                Latin
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Folk & Acoustic"
                  onChange={toggleGenre}
                  checked={genre.includes("Folk & Acoustic")}
                />{" "}
                Folk & Acoustic
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Roaming"
                  onChange={toggleGenre}
                  checked={genre.includes("Roaming")}
                />{" "}
                Roaming
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Jazz & Swing"
                  onChange={toggleGenre}
                  checked={genre.includes("Jazz & Swing")}
                />{" "}
                Jazz & Swing
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Classical"
                  onChange={toggleGenre}
                  checked={genre.includes("Classical")}
                />{" "}
                Classical
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value="Israeli"
                  onChange={toggleGenre}
                  checked={genre.includes("Israeli")}
                />{" "}
                Israeli
              </label>{" "}
            </div>
          )}

          {/* Act Size filter */}
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

          {/* Acts Size options dropdown */}
          {showActSizeFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Solo"}
                  onChange={toggleActSize}
                  checked={act_size.includes("Solo")}
                />{" "}
                Solo
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Duo"}
                  onChange={toggleActSize}
                  checked={act_size.includes("Duo")}
                />{" "}
                Duo
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Trio"}
                  onChange={toggleActSize}
                  checked={act_size.includes("Trio")}
                />{" "}
                Trio
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"4-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("4-Piece")}
                />{" "}
                4-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"5-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("5-Piece")}
                />{" "}
                5-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"6-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("6-Piece")}
                />{" "}
                6-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"7-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("7-Piece")}
                />{" "}
                7-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"8-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("8-Piece")}
                />{" "}
                8-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"9-Piece"}
                  onChange={toggleActSize}
                  checked={act_size.includes("9-Piece")}
                />{" "}
                9-Piece
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"10-Piece +"}
                  onChange={toggleActSize}
                  checked={act_size.includes("10-Piece +")}
                />{" "}
                10-Piece +
              </label>
            </div>
          )}

          {/* DJ Services filter */}
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

          {/*DJ Service Dropdown Options */}
          {showDjServicesFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"background_music_playlist"}
                  onChange={toggleDjServices}
                  checked={djServices.includes("background_music_playlist")}
                />{" "}
                Background Playlist Music
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"up_to_3_hours_manned_playlist"}
                  onChange={toggleDjServices}
                  checked={djServices.includes("up_to_3_hours_manned_playlist")}
                />{" "}
                Manned Playlist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"up_to_3_hours_band_member_DJ"}
                  onChange={toggleDjServices}
                  checked={djServices.includes("up_to_3_hours_band_member_DJ")}
                />{" "}
                Band Member DJing
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"DJ_live_sax_3x30mins"}
                  onChange={toggleDjServices}
                  checked={djServices.includes("DJ_live_sax_3x30mins")}
                />{" "}
                DJ Live with Saxophone
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"DJ_live_bongos_3x30mins"}
                  onChange={toggleDjServices}
                  checked={djServices.includes("DJ_live_bongos_3x30mins")}
                />{" "}
                DJ Live with Bongos
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"DJ_live_bongos_and_sax_3x30mins"}
                  onChange={toggleDjServices}
                  checked={djServices.includes(
                    "DJ_live_bongos_and_sax_3x30mins"
                  )}
                />{" "}
                DJ Live with Saxophone & Bongos
              </p>
            </div>
          )}

          {/* Instruments filter */}
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

          {/* Instruments Dropdown Options */}
          {showInstrumentsFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Lead Female Vocal"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Lead Female Vocal")}
                />{" "}
                Female Vocalist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Lead Male Vocal"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Lead Male Vocal")}
                />{" "}
                Male Vocalist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Lead Vocal"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Lead Vocal")}
                />{" "}
                Lead Vocalist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"MC/Rapper"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("MC/Rapper")}
                />{" "}
                MC/Rapper
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Vocalist-Guitarist"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Vocalist-Guitarist")}
                />{" "}
                Vocalist-Guitarist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Guitar"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Guitar")}
                />{" "}
                Guitar
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Keyboard"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Keyboard")}
                />{" "}
                Keyboard
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Drums"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Drums")}
                />{" "}
                Drums
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Bass"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Bass")}
                />{" "}
                Bass
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Saxophone"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Saxophone")}
                />{" "}
                Saxophone
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Trumpet"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Trumpet")}
                />{" "}
                Trumpet
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Trombone"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Trombone")}
                />{" "}
                Trombone
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Violin / Fiddle"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Violin / Fiddle")}
                />{" "}
                Violin / Fiddle
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Banjo"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Banjo")}
                />{" "}
                Banjo
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Mandolin"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Mandolin")}
                />{" "}
                Mandolin
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Acoustic Guitar"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Acoustic Guitar")}
                />{" "}
                Acoustic Guitar
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Percussion"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Percussion")}
                />{" "}
                Percussion
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Cello"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Cello")}
                />{" "}
                Cello
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Flute & Clarinet"}
                  onChange={toggleInstruments}
                  checked={instruments.includes("Flute & Clarinet")}
                />{" "}
                Flute & Clarinet
              </p>
            </div>
          )}
          {/* Wireless filter */}
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

          {/* Wireless options dropdown */}
          {showWirelessFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Vocal"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Vocal")}
                />{" "}
                Vocal
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Saxophone"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Saxophone")}
                />{" "}
                Saxophone
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Guitar"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Guitar")}
                />{" "}
                Guitar
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Bass"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Bass")}
                />{" "}
                Bass
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Keytar"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Keytar")}
                />{" "}
                Keytar
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"Trumpet"}
                  onChange={toggleWireless}
                  checked={wireless.includes("Trumpet")}
                />{" "}
                Trumpet
              </label>{" "}
            </div>
          )}

          {/*Repertoire filter */}
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

          {/* Song & Artist Search Input */}
          {showSongFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <input
                type="text"
                placeholder="Search song or artist..."
                value={songSearch.join(", ")}
                onChange={(e) =>
                  setSongSearch(
                    e.target.value
                      .split(",")
                      .map((searchTerm) => searchTerm.trimStart())
                  )
                }
                className="border p-1 w-11/12"
              />
            </div>
          )}

          {/*Act Name filter */}
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

          {/* Act Search Input */}
          {showActFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <input
                type="text"
                placeholder="Search for act by name..."
                value={actSearch.join(", ")}
                onChange={(e) =>
                  setActSearch(
                    e.target.value
                      .split(",")
                      .map((searchTerm) => searchTerm.trimStart())
                  )
                }
                className="border p-1 w-11/12"
              />
            </div>
          )}

          {/* Soundlimiter filter */}
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

          {/* soundlimiter options dropdown */}
          {showSoundLimiterFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"electric_drums"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("electric_drums")}
                />{" "}
                Has Electric Drum Kit
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"iems"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("iems")}
                />{" "}
                Uses In-ear Monitoring
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"can_you_make_act_acoustic"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("can_you_make_act_acoustic")}
                />{" "}
                Can Make Act Acoustic
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"remove_drums"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("remove_drums")}
                />{" "}
                Can Remove Drums From Lineup
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"80-89db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("80-89db")}
                />{" "}
                80-89db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"90db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("90db")}
                />{" "}
                90db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"91db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("91db")}
                />{" "}
                91db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"92db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("92db")}
                />{" "}
                92db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"93db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("93db")}
                />{" "}
                93db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"94db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("94db")}
                />{" "}
                94db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"95db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("95db")}
                />{" "}
                95db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"96db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("96db")}
                />{" "}
                96db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"97db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("97db")}
                />{" "}
                97db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"98db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("98db")}
                />{" "}
                98db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"99db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("99db")}
                />{" "}
                99db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"100db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("100db")}
                />{" "}
                100db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"101db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("101db")}
                />{" "}
                101db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"102db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("102db")}
                />{" "}
                102db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"103db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("103db")}
                />{" "}
                103db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"104db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("104db")}
                />{" "}
                104db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"105db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("105db")}
                />{" "}
                105db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"106db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("106db")}
                />{" "}
                106db
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"107db"}
                  onChange={toggleSoundLimiters}
                  checked={soundLimiters.includes("107db")}
                />{" "}
                107db +
              </label>{" "}
            </div>
          )}

          {/* Setup & Soundcheck Time filter */}
          <p
            onClick={() =>
              setShowSetupAndSoundcheckFilter(!showSetupAndSoundcheckFilter)
            }
            className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
          >
            SETUP & SOUNDCHECK
            <img
              className={`h-3 transition-transform duration-300 ${showSetupAndSoundcheckFilter ? "rotate-90" : ""}`}
              src={assets.dropdown_icon}
              alt=""
            />
          </p>

          {/* Setup and Soundcheck filter */}
          {showSetupAndSoundcheckFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"setup_and_soundcheck_time_60min"}
                  onChange={toggleSetupAndSoundcheck}
                  checked={setupAndSoundcheck.includes(
                    "setup_and_soundcheck_time_60min"
                  )}
                />{" "}
                60min Setup & Soundcheck
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"setup_and_soundcheck_time_90min"}
                  onChange={toggleSetupAndSoundcheck}
                  checked={setupAndSoundcheck.includes(
                    "setup_and_soundcheck_time_90min"
                  )}
                />{" "}
                90min Setup & Soundcheck
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"speedy_setup"}
                  onChange={toggleSetupAndSoundcheck}
                  checked={setupAndSoundcheck.includes("speedy_setup")}
                />{" "}
                60min Speedy Setup & Soundcheck
              </p>
            </div>
          )}

          {/* PA and Lights filter */}
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

          {/* PA and Lights  dropdown */}
          {showPaAndLightsFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"small_pa_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("small_pa_size")}
                />{" "}
                Small PA System
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"medium_pa_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("medium_pa_size")}
                />{" "}
                Medium PA System
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"large_pa_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("large_pa_size")}
                />{" "}
                Large PA System
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"small_light_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("small_light_size")}
                />{" "}
                Small Light System
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"medium_light_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("medium_light_size")}
                />{" "}
                Medium Light System
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"large_light_size"}
                  onChange={togglePaAndLights}
                  checked={paAndLights.includes("large_light_size")}
                />{" "}
                Large Light System
              </p>
            </div>
          )}

          {/* PLI filter */}
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

          {/* pli options dropdown */}
          {showPliFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={1}
                  onChange={togglePli}
checked={pli.includes(1)}
                />{" "}
                Up to £1m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={2}
                  onChange={togglePli}
checked={pli.includes(2)}                />{" "}
                Up to £2m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={3}
                  onChange={togglePli}
checked={pli.includes(3)}                />{" "}
                Up to £3m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={4}
                  onChange={togglePli}
checked={pli.includes(4)}                />{" "}
                Up to £4m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={5}
                  onChange={togglePli}
checked={pli.includes(5)}                />{" "}
                Up to £5m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={10}
                  onChange={togglePli}
checked={pli.includes(10)}                />{" "}
                Up to £10m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={15}
                  onChange={togglePli}
checked={pli.includes(15)}                />{" "}
                Up to £15m
              </label>
              <label className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={20}
                  onChange={togglePli}
checked={pli.includes(20)}                />{" "}
                Up to £20m
              </label>
            </div>
          )}

          {/*Extra services filter */}
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

          {/*Extra services filter */}
          {showExtraServicesFilter && (
            <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"ceremony_solo"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("ceremony_solo")}
                />{" "}
                Ceremony Solo
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"duo_ceremony"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("duo_ceremony")}
                />{" "}
                Ceremony Duo
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"trio_ceremony"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("trio_ceremony")}
                />{" "}
                Ceremony Trio
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"four_piece_ceremony"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("four_piece_ceremony")}
                />{" "}
                Ceremony 4-piece
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"afternoon_solo"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("afternoon_solo")}
                />{" "}
                Afternoon Reception Solo
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"afternoon_duo"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("afternoon_duo")}
                />{" "}
                Afternoon Reception Duo
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"afternoon_trio"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("afternoon_trio")}
                />{" "}
                Afternoon Reception Trio
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"afternoon_4piece"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("afternoon_4piece")}
                />{" "}
                Afternoon Reception 4-piece
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"early_arrival"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("early_arrival")}
                />{" "}
                Early Arrival
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"late_stay"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("late_stay")}
                />{" "}
                Late Stay
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"extra_song"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("extra_song")}
                />{" "}
                Extra Song Requests
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"extra_sets"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("extra_sets")}
                />{" "}
                Extra Main Performance Sets
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"add_another_vocalist"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("add_another_vocalist")}
                />{" "}
                Add Another Vocalist
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"sound_engineering_for_another_act"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes(
                    "sound_engineering_for_another_act"
                  )}
                />{" "}
                Sound Engineering for Another Act
              </p>
              <p className="flex gap-2">
                <input
                  className="w-3"
                  type="checkbox"
                  value={"israeli_sets"}
                  onChange={toggleExtraServices}
                  checked={extraServices.includes("israeli_sets")}
                />{" "}
                Israeli Dancing Sets
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1"></div>
      <div className="text-center py-8 text-3xl">
        <Title text1="ALL" text2="ACTS" />
        
      </div>
   

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {cards.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No acts to show yet.</p>
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
    </div>
       
  );
};

export default Acts;