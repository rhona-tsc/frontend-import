import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { ShopContext } from "../context/ShopContext.jsx";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import Title from "../components/Title";
import CardFilterItem from "../components/CardFilterItem";
import { assets } from "../assets/assets";

// --- DEBUG HELPERS ---------------------------------------------------------
const ACTS_DBG = (...args) => console.log("🎯 [Acts]", ...args);
const GROUP = (label) => {
  try {
    console.groupCollapsed(label);
  } catch (_) {}
};
const ENDGROUP = () => {
  try {
    console.groupEnd();
  } catch (_) {}
};




// Keep this ABOVE any usage
const DEBUG_FILTER = true;
// Temporarily disable server search until backend /search is aligned
const ENABLE_SERVER_SEARCH = true;

// Canonical API path builder (uses backend, never the Netlify origin)
const api = (path = "") => {
  const BASE = (
    import.meta.env.VITE_BACKEND_URL || "https://tsc-backend-v2.onrender.com"
  ).replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${BASE}/${p}`;
};

const norm = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Helper for normalising ACT SIZE values
const norm2 = (s) => {
  if (!s) return "";

  let v = String(s).toLowerCase().trim();

  // convert word numbers → digits
  v = v
    .replace(/\bone\b/g, "1")
    .replace(/\btwo\b/g, "2")
    .replace(/\bthree\b/g, "3")
    .replace(/\bfour\b/g, "4")
    .replace(/\bfive\b/g, "5")
    .replace(/\bsix\b/g, "6")
    .replace(/\bseven\b/g, "7");

  // "4 piece" → "4-piece"
  v = v.replace(/[\s_]+/g, "-");

  // fix: "4piece" → "4-piece"
  v = v.replace(/^(\d)-?piece$/g, "$1-piece");

  // clean double hyphens
  v = v.replace(/-+/g, "-");

  // special standard mapping
  if (v === "1-piece") return "solo";
  if (v === "2-piece") return "2-piece";
  if (v === "3-piece") return "3-piece";

  return v;
};

const flat1 = (v) =>
  Array.isArray(v) ? (v.flat ? v.flat() : [].concat(...v)) : v;

const imagesFromImageUrl = (imageUrl) => {
  if (Array.isArray(imageUrl)) {
    return imageUrl
      .map((x) =>
        typeof x === "string"
          ? { url: x }
          : x && typeof x === "object" && x.url
            ? { url: x.url, title: x.title || "" }
            : null
      )
      .filter(Boolean);
  }
  if (imageUrl && typeof imageUrl === "object" && imageUrl.url) {
    return [{ url: imageUrl.url, title: imageUrl.title || "" }];
  }
  if (typeof imageUrl === "string" && imageUrl) {
    return [{ url: imageUrl }];
  }
  return null;
};

const toYMD = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};


const addMonthsClamped = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();

  const target = new Date(d);
  target.setDate(1);
  target.setMonth(target.getMonth() + months);

  // last day of target month
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));

  return target;
};

const PRESETS = {
  "dj-options": {
    djServices: [
      "up_to_3_hours_band_member_DJ",
      "DJ_live_sax_3x30mins",
      "DJ_live_bongos_3x30mins",
      "DJ_live_bongos_and_sax_3x30mins",
    ],
  },

  "motown-soul": {
    genres: ["Soul & Motown"],
  },

  pop: {
    genres: ["Pop & Classic Pop"],
  },
};

const Acts = ({ userRole, email }) => {
  const {
    actsFilterPageCards,
    getFilterCardActsPageCards,
    setShowSearch,
    selectedDate,
    selectedAddress,
    setSelectedDate,
    setSelectedAddress,
    userId,
    showSearch,
    search,
    isShortlisted,
    shortlistAct,
    searchActCards,
  } = useContext(ShopContext);
  const [searchParams] = useSearchParams();
  const appliedOnceRef = useRef(false);

  const [showFilter, setShowFilter] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [genre, setGenre] = useState([]);
  const [isGenreSelected, setIsGenreSelected] = useState(false); // Track if any checkbox is checked
  const [isActSizeSelected, setIsActSizeSelected] = useState(false); // Track if any checkbox is checked
  const [isDjServicesSelected, setIsDjServicesSelected] = useState(false); // Track if any checkbox is checked
  const [isInstrumentsSelected, setIsInstrumentsSelected] = useState(false); // Track if any checkbox is checked
  const [isWirelessSelected, setIsWirelessSelected] = useState(false); // Track if any checkbox is checked
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
  const [act_size, setActSize] = useState([]);
  const [djServices, setDjServices] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [soundLimiters, setSoundLimiters] = useState([]);
  const [setupAndSoundcheck, setSetupAndSoundcheck] = useState([]);
  const [paAndLights, setPaAndLights] = useState([]);
  const [pli, setPli] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [wireless, setWireless] = useState([]);
  const [sortType, setSortType] = useState("relevant");
  const [songSearch, setSongSearch] = useState([]);
  const [actSearch, setActSearch] = useState([]);
  const [updatingResults, setUpdatingResults] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [availableMap, setAvailableMap] = useState({});
  const [availLoading, setAvailLoading] = useState(false);
  const [filterProducts, setFilterProducts] = useState([]);
const [enrichedCards, setEnrichedCards] = useState([]);
  const [showActSizeFilter, setShowActSizeFilter] = useState(false);
  const [showWirelessFilter, setShowWirelessFilter] = useState(false);
  const navigate = useNavigate();
  const storedPlace = sessionStorage.getItem("selectedPlace") || "";
  const [selectedCounty, setSelectedCounty] = useState(
    sessionStorage.getItem("selectedCounty")?.trim().toLowerCase() || ""
  );

  // near the top
  const FILTER_DATA_ENDPOINTS = [api("api/v2/act-cards/search")];


  const PRESET_LOCATIONS = {
  london: {
    county: "greater london",
    postcode: "SW1A 1AA",
    address: "London SW1A 1AA, UK",
    placeLabel: "London",
  },
  essex: {
    county: "essex",
    postcode: "CM1 1AA",
    address: "Chelmsford CM1 1AA, UK",
    placeLabel: "Essex",
  },
  kent: {
    county: "kent",
    postcode: "ME14 1AA",
    address: "Maidstone ME14 1AA, UK",
    placeLabel: "Kent",
  },
};


const { preset } = useParams();


const lastPresetKeyRef = useRef("");

useEffect(() => {
  const key = searchParams.toString();
  if (key === lastPresetKeyRef.current) return;
  lastPresetKeyRef.current = key;

  const presetKey = searchParams.get("preset");
  const presetObj = presetKey ? PRESETS[presetKey] : null;

  if (presetObj?.genres?.length) setGenre(presetObj.genres);
  if (presetObj?.djServices?.length) setDjServices(presetObj.djServices);

  const dateParam = searchParams.get("date");
  if (dateParam === "6m") {
    const d = addMonthsClamped(new Date(), 6);
    setSelectedDate(toYMD(d));
  }
}, [searchParams]);

const applyPresetLocation = (key) => {
  const p = PRESET_LOCATIONS[String(key || "").toLowerCase()];
  if (!p) return;

  // update local state used by pricing
  setSelectedCounty(p.county);

  // update context (you already have these in Acts)
  setSelectedAddress(p.address);

  // optional: wipe date so it behaves like “browse this region”
  // (pricing won't calculate until date is chosen)
const storedDate =
  sessionStorage.getItem("selectedDate") ||
  localStorage.getItem("selectedDate") ||
  "";

if (storedDate) {
  setSelectedDate(storedDate);
} else {
  // leave empty if you truly want “browse”
  setSelectedDate("");
}
  // store for persistence
  sessionStorage.setItem("selectedCounty", p.county);
  sessionStorage.setItem("selectedAddress", p.address);
  sessionStorage.setItem("selectedPostcode", p.postcode);
  sessionStorage.setItem("selectedPlace", p.placeLabel);

  // if you also store these in context elsewhere, this keeps it consistent
  // (only do this if these setters exist in your ShopContext)
  // setSelectedPostcode?.(p.postcode);
  // setSelectedCounty?.(p.county);

  // hide the search box if open
    try {
    ACTS_DBG("applyPresetLocation() -> setShowSearch(false)", {
      presetKey: key,
      county: p.county,
      address: p.address,
      placeLabel: p.placeLabel,
      before_showSearch: showSearch,
    });
  } catch {}

  setShowSearch(false);

  // ensure we're on /acts (optional)
  // navigate("/acts"); // only if you don't want the preset param in URL
};


useEffect(() => {
  if (!preset) return;
  applyPresetLocation(preset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [preset]);

  const aliasGenre = (g) => {
    const raw = String(g || "");
    return [raw, raw.replace(/&/g, "and")];
  };
  const normGenreToken = (s) =>
    String(s)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

      

  function buildServerPayload(filters) {
    const raw = filters.genres ?? filters.genre ?? [];
    const expanded = [...new Set(raw.flatMap(aliasGenre))];
    const tokens = [...new Set(expanded.map(normGenreToken))];
    return {
      includeStatuses: [
        "approved",
        "live",
        "approved_changes_pending",
        "live_changes_pending",
      ],
      excludeTests: true,
      genres: expanded, // keep raw/alias
      genres_norm: tokens, // optional if you add it server-side
      lineupSizes: filters.lineupSizes ?? filters.act_size ?? [],
      instruments: filters.instruments ?? [],
      wireless: filters.wireless ?? [],
      soundLimiters: filters.soundLimiters ?? [],
      paAndLights: filters.paAndLights ?? [],
      pli: filters.pli ?? [],
      setupAndSoundcheck: filters.setupAndSoundcheck ?? [],
      songSearch: filters.songSearch ?? [],
      extraServices: filters.extraServices ?? [],
      djServices: filters.djServices ?? [],
      actSearch: filters.actSearch ?? [],
    };
  }

  // Is any server-side filter actually set?
  const hasActiveFilters = (f = {}) => {
    const keys = [
      "genres",
      "lineupSizes",
      "instruments",
      "wireless",
      "soundLimiters",
      "setupAndSoundcheck",
      "paAndLights",
      "pli",
      "songSearch",
      "extraServices",
      "djServices",
      "actSearch",
    ];
    return keys.some((k) => Array.isArray(f[k]) && f[k].length);
  };

  // Extract IDs regardless of server response shape
  const extractIds = (res) => {
    if (!res) return [];
    if (Array.isArray(res?.ids)) return res.ids;
    if (Array.isArray(res?.items))
      return res.items.map((x) => x?._id || x?.id || x?.actId).filter(Boolean);
    if (Array.isArray(res))
      return res.map((x) => x?._id || x?.id || x?.actId).filter(Boolean);
    return [];
  };

  async function fetchActFilterData({
    ids,
    status = "approved,live",
    limit = 200,
  }) {
    const idParam = Array.isArray(ids) ? ids.join(",") : String(ids || "");
    const qs = `?ids=${encodeURIComponent(idParam)}&status=${encodeURIComponent(status)}&limit=${limit}`;

    // Try GET first across candidates
    for (const base of FILTER_DATA_ENDPOINTS) {
      try {
        const { data } = await axios.get(`${base}${qs}`);
        if (data) return data;
      } catch {}
    }

    // Fallback to POST payload across candidates
    const payload = {
      ids: Array.isArray(ids) ? ids : idParam ? idParam.split(",") : [],
      status: status.split(","),
      limit,
    };

    for (const base of FILTER_DATA_ENDPOINTS) {
      try {
        const { data } = await axios.post(base, payload);
        if (data) return data;
      } catch {}
    }

    console.warn(
      "⚠️ search: no matching endpoint found (all candidates failed)."
    );
    return null;
  }
  // ---- search helper (acts enrichment) ----
  const normalize = (arr) =>
    Array.isArray(arr) ? arr.map((x) => String(x).toLowerCase().trim()) : [];

  // --- Extras key normaliser + matcher (DJ services etc) ----------------------
const normalizeExtraKey = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const getStored = (key) =>
  sessionStorage.getItem(key) ||
  localStorage.getItem(key) ||
  "";

const hasStoredLocation = () => {
  const addr = getStored("selectedAddress");
  const county = getStored("selectedCounty");
  const place = getStored("selectedPlace");
  // choose your rule: address is the main one
  return Boolean(addr || county || place);
};

  function mergeFilterDataIntoCards(cards = [], enrich = []) {
    if (!cards.length || !enrich.length) return cards;

    const byId = new Map(
      enrich.map((x) => [String(x._id || x.actId || x.id), x])
    );

    return cards.map((c) => {
      const add = byId.get(String(c.actId || c._id || c.id));
      if (!add) return c;

      const rawGenres = add.genres || add.genres_raw || [];
      const genres_norm = normalize(add.genres_norm || rawGenres);

      return {
        ...c,
        slug: add.slug ?? c.slug ?? "",
        status: add.status ?? c.status ?? "",
        genres_raw: rawGenres,
        genres_norm,
        lineupSizes: add.lineupSizes || add.act_sizes || c.lineupSizes || [],
        instruments: add.instruments || c.instruments || [],
        pliAmount: add.pliAmount ?? c.pliAmount ?? null,
        paTrue: typeof add.paTrue === "boolean" ? add.paTrue : c.paTrue,
        lightTrue:
          typeof add.lightTrue === "boolean" ? add.lightTrue : c.lightTrue,
        extrasTrue:
          typeof add.extrasTrue === "boolean" ? add.extrasTrue : c.extrasTrue,
        lineupsCount: Array.isArray(add.lineups)
          ? add.lineups.length
          : c.lineupsCount || 0,
        hasImages: Array.isArray(add.images)
          ? add.images.length > 0
          : !!c.hasImages,
      };
    });
  }

  const filterRunIdRef = useRef(0);

  const lastFiltersRef = useRef({});
  useEffect(() => {
    if (!DEBUG_FILTER) return;
    const next = buildServerFilterPayload();
    const prev = lastFiltersRef.current || {};
    console.groupCollapsed("🧾 FILTERS CHANGED → server payload snapshot");
    console.log("prev:", prev);
    console.log("next:", next);
    console.groupEnd();
    lastFiltersRef.current = next;
  }, [
    genre,
    act_size,
    djServices,
    instruments,
    wireless,
    soundLimiters,
    setupAndSoundcheck,
    paAndLights,
    pli,
    extraServices,
    songSearch,
    actSearch,
  ]);

  // helper to package your current UI state into the server payload
  const buildServerFilterPayload = () => ({
    genres: genre,
    lineupSizes: Array.isArray(act_size) ? act_size : [], // send original values, not normalized
    instruments,
    wireless,
    soundLimiters,
    setupAndSoundcheck,
    paAndLights,
    pli,
    extraServices,
    djServices,
    actSearch,
    songSearch,
    includeStatuses: [
      "approved",
      "live",
      "approved_changes_pending",
      "live_changes_pending",
    ],
    excludeTests: true,
  });

  useEffect(() => {
    getFilterCardActsPageCards(); /* once */
  }, []);

  // --- FILTER TOGGLE DEBUG ---------------------------------------------------

    useEffect(() => {
    if (!DEBUG_FILTER) return;

    const storedDate = getStored("selectedDate");
    const storedAddress = getStored("selectedAddress");
    const storedCounty = getStored("selectedCounty");
    const storedPlace = getStored("selectedPlace");

    ACTS_DBG("STATE SNAPSHOT", {
      showSearch,
      initializing,
      updatingResults,
      preset,
      appliedOnce: appliedOnceRef.current,
      selectedDate,
      selectedAddress,
      selectedCounty,
      storedDate,
      storedAddress,
      storedCounty,
      storedPlace,
      noLocation: !storedAddress && !storedCounty && !storedPlace,
      hasStoredLocation: hasStoredLocation(),
    });
  }, [
    showSearch,
    initializing,
    updatingResults,
    preset,
    selectedDate,
    selectedAddress,
    selectedCounty,
  ]);

  const uniqPush = (arr = [], v) => (arr.includes(v) ? arr : [...arr, v]);

  const logToggle = (group, { value, checked, before = [], after = [] }) => {
    if (!DEBUG_FILTER) return;
    try {
      const ts = new Date().toLocaleTimeString();
      console.groupCollapsed(
        `☑️ [${ts}] ${group} — ${checked ? "ADD ➕" : "REMOVE ❌"} "${value}"`
      );
      console.log("before (%d):", before.length, before);
      console.log("after  (%d):", after.length, after);
      console.groupEnd();
    } catch {}
  };

  // 🔎 Snapshot Acts-page cards every time they change
  useEffect(() => {
    if (!actsFilterPageCards) {
      console.log("🧾 actsFilterPageCards = ", actsFilterPageCards);
      return;
    }
    if (!Array.isArray(actsFilterPageCards)) {
      console.warn("🧾 actsFilterPageCards not an array:", actsFilterPageCards);
      return;
    }

    console.groupCollapsed(
      `🧾 actsFilterPageCards FULL (${actsFilterPageCards.length})`
    );
    actsFilterPageCards.forEach((c, i) => {
      console.log(`#${i} keys:`, Object.keys(c || {}));
      try {
        console.log(`#${i} snapshot:`, JSON.stringify(c, null, 2));
      } catch {}

      // 👇👇👇 Robust genre flatten/normalise logging
      const rawArr = Array.isArray(c?.genres)
        ? c.genres
        : Array.isArray(c?.genre)
          ? c.genre
          : typeof c?.genre === "string"
            ? [c.genre]
            : Array.isArray(c?.genres_raw)
              ? c.genres_raw
              : Array.isArray(c?.genresNormalized)
                ? c.genresNormalized
                : Array.isArray(c?.genres_norm)
                  ? c.genres_norm
                  : [];

      const genresRaw = flat1(rawArr);
      const genresNorm = genresRaw.map(NORM_GENRE);

      console.log(`#${i} genres_raw:`, genresRaw);
      console.log(`#${i} genres_norm:`, genresNorm);
      // ☝️☝️☝️ END robust genre logging

      if (c?.availabilityBadge)
        console.log(`#${i} availabilityBadge:`, c.availabilityBadge);
      if (c?.travelConfig) console.log(`#${i} travelConfig:`, c.travelConfig);

      if (Array.isArray(c?.extras)) {
        const preview = c.extras.slice(0, 8);
        console.log(
          `#${i} extras (${c.extras.length}):`,
          preview,
          c.extras.length > 8 ? `…+${c.extras.length - 8} more` : ""
        );
      }
    });
    console.groupEnd();
  }, [actsFilterPageCards]);

  // ---- server enrich (search) ----
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Whatever array you render before enrichment; your logs call it actsFilterPageCards/actCards.
        const base =
          Array.isArray(actsFilterPageCards) && actsFilterPageCards.length
            ? actsFilterPageCards
            : [];
        if (!base.length) return;

        const ids = Array.from(
          new Set(base.map((c) => c.actId || c._id || c.id).filter(Boolean))
        );

        if (!ids.length) {
          // nothing to enrich — keep current cards
          setEnrichedCards(base);
          return;
        }

        const enrich = await fetchActFilterData({
          ids,
          status: "approved,live,approved_changes_pending,live_changes_pending",
          limit: 200,
        });

        if (!alive) return;

        const merged =
          Array.isArray(enrich) && enrich.length
            ? mergeFilterDataIntoCards(base, enrich)
            : base;

        // If you keep a local “actsPageCards” state, set it here; otherwise push to your pipeline:
        setEnrichedCards(merged);
      } catch (err) {
        console.warn("search enrich failed:", err?.message || err);
        // IMPORTANT: fall back to current cards instead of wiping to []
        const base =
          Array.isArray(actsFilterPageCards) && actsFilterPageCards.length
            ? actsFilterPageCards
            : [];
        setEnrichedCards(base);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actsFilterPageCards]);

  const items = Array.isArray(actsFilterPageCards) ? actsFilterPageCards : [];

  // --- GENRES helpers ------------------------------------------------------
  const NORM_GENRE = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Pull genres from multiple places and return a deduped list
  const getActGenres = (item) => {
    const fromAct = Array.isArray(item?.genres)
      ? item.genres
      : typeof item?.genres === "string"
        ? [item.genres]
        : [];

    const fromCard = Array.isArray(item?.__card?.genres)
      ? item.__card.genres
      : typeof item?.__card?.genres === "string"
        ? [item.__card.genres]
        : [];

    const fromTags = Array.isArray(item?.genreTags) ? item.genreTags : [];

    // Some older data might store singular fields
    const maybeSingle = item?.genre
      ? [item.genre]
      : item?.__card?.genre
        ? [item.__card.genre]
        : [];

    const all = [...fromAct, ...fromCard, ...fromTags, ...maybeSingle].filter(
      Boolean
    );
    return Array.from(new Set(all));
  };

  const triggerSearch = () => {
    try {
      ACTS_DBG("triggerSearch()", {
        before_showSearch: showSearch,
        storedAddress: getStored("selectedAddress"),
        storedCounty: getStored("selectedCounty"),
        storedPlace: getStored("selectedPlace"),
        selectedDate,
        selectedAddress,
        selectedCounty,
      });
    } catch {}

    setShowSearch(true); // ✅ Open the search box

    try {
      ACTS_DBG("triggerSearch() -> setShowSearch(true) called", {
        after_call_showSearch: showSearch,
      });
    } catch {}

    window.scrollTo(0, 0); // ✅ Ensure it stays on the acts page
  };
  const toggleGenre = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setGenre((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsGenreSelected(after.length > 0);
      logToggle("GENRES", { value, checked, before, after });
      return after;
    });
  };

  const toggleActSize = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setActSize((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsActSizeSelected(after.length > 0);
      logToggle("ACT SIZE", { value, checked, before, after });
      return after;
    });
  };

  const toggleDjServices = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setDjServices((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsDjServicesSelected(after.length > 0);
      logToggle("DJ SERVICES", { value, checked, before, after });
      return after;
    });
  };

  const toggleInstruments = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setInstruments((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsInstrumentsSelected(after.length > 0);
      logToggle("INSTRUMENTS", { value, checked, before, after });
      return after;
    });
  };

  const toggleWireless = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setWireless((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsWirelessSelected(after.length > 0);
      logToggle("WIRELESS", { value, checked, before, after });
      return after;
    });
  };

  const toggleSoundLimiters = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setSoundLimiters((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsSoundLimitersSelected(after.length > 0);
      logToggle("SOUND LIMITERS", { value, checked, before, after });
      return after;
    });
  };

  const toggleSetupAndSoundcheck = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setSetupAndSoundcheck((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsSetupAndSoundcheckSelected(after.length > 0);
      logToggle("SETUP & SOUNDCHECK", { value, checked, before, after });
      return after;
    });
  };

  const togglePaAndLights = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setPaAndLights((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsPaAndLightsSelected(after.length > 0);
      logToggle("PA & LIGHTS", { value, checked, before, after });
      return after;
    });
  };

  const togglePli = (e) => {
    const value = Number(e.target.value);
    const checked = e.target.checked;
    setPli((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsPliSelected(after.length > 0);
      logToggle("PLI", { value, checked, before, after });
      return after;
    });
  };

  const toggleExtraServices = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setExtraServices((prev) => {
      const before = prev;
      const after = checked
        ? uniqPush(prev, value)
        : prev.filter((x) => x !== value);
      setIsExtraServicesSelected(after.length > 0);
      logToggle("EXTRA SERVICES", { value, checked, before, after });
      return after;
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
    early_arrival_60min_per_band_member: "Early Arrival",
    late_stay_60min_per_band_member: "Late Stay",
    extra_song_request_per_band_member: "Extra Song Requests",
    extra_30min_performance_per_band_member: "Extra Main Performance Sets",
    extra_40min_performance_per_band_member: "Extra Main Performance Sets",
    extra_60min_performance_per_band_member: "Extra Main Performance Sets",
    add_another_vocalist: "Add another vocalist",
    sound_engineering_for_another_act_with_your_acts_PA:
      "Sound engineering for another act",
    israeli_dancing_20mins_per_band_member: "Israeli dancing sets",
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

  // ----- Instruments normalisation helpers -----
  const INSTR_ALIAS = new Map([
    ["lead female vocal", "Lead Female Vocal"],
    ["lead male vocal", "Lead Male Vocal"],
    ["lead vocal", "Lead Vocal"],

    ["mc", "MC/Rapper"],
    ["rapper", "MC/Rapper"],
    ["mc/rapper", "MC/Rapper"],

    ["vocalist-guitarist", "Vocalist-Guitarist"],
    ["vocalist-bassist", "Vocalist-Bassist"],

    ["electric guitar", "Guitar"],
    ["bass guitar", "Bass"],
    ["double bass", "Bass"],
    ["acoustic bass", "Bass"],

    ["violin", "Violin / Fiddle"],
    ["fiddle", "Violin / Fiddle"],

    ["flute", "Flute & Clarinet"],
    ["clarinet", "Flute & Clarinet"],
  ]);

  // Split combos like "Trumpet/Trombone/Rapper", "Lead Male Vocal/Rapper & Guitarist"
  const splitInstrumentTokens = (s) =>
    String(s || "")
      .split(/[,/;&]|\\band\\b|\\bwith\\b|\\+|\\s*-\\s*/i) // / , ; & and with + hyphen separators
      .map((t) => t.trim())
      .filter(Boolean);

  // Canonicalise a single token to your filter labels
  const canonicaliseInstrument = (raw) => {
    const key = String(raw || "")
      .trim()
      .toLowerCase();
    const mapped = INSTR_ALIAS.get(key);
    if (mapped) return mapped;

    // tidy common variants
    if (key === "guitarist") return "Guitar";
    if (key === "sax") return "Saxophone";
    if (key === "keys") return "Keyboard";
    if (key === "drummer") return "Drums";
    if (key === "trumpet/trombone/rapper") return "MC/Rapper"; // handled by splitter anyway

    // leave as-is (e.g., "Trumpet", "Trombone", "Cello", etc.)
    return String(raw).trim();
  };
  // Build a deduped list of instruments an act actually offers
  const deriveActInstruments = (act) => {
    const fromTop = Array.isArray(act.instruments) ? act.instruments : [];
    const fromLineups = (act.lineups || []).flatMap((l) =>
      (Array.isArray(l.bandMembers) ? l.bandMembers : [])
        .map((m) => m?.instrument)
        .filter(Boolean)
    );

    const all = [...fromTop, ...fromLineups];

    // Expand combos then canonicalise and dedupe
    const expanded = all.flatMap((name) => splitInstrumentTokens(name));
    const canonical = expanded.map((v) => {
      const c = canonicaliseInstrument(v);
      // final tweak: plain "Rapper" should count under MC/Rapper
      return c === "Rapper" ? "MC/Rapper" : c;
    });

    return Array.from(new Set(canonical));
  };

  // 🔁 Make the helper accept a list (don’t read global `acts`)
  function getApprovedActs(list) {
    const arr = Array.isArray(list) ? list : [];
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    const effectiveUserRole = String(storedUser.userRole || "").toLowerCase();
    const effectiveUserId = storedUser._id || storedUser.userId || "";
    const effectiveUserEmail = storedUser.email || "";

    const isAgent =
      ["agent", "admin", "moderator"].includes(effectiveUserRole) ||
      effectiveUserId === "680fb453a2de6618675ca9ed" ||
      /@thesupremecollective\.co\.uk$/i.test(effectiveUserEmail);

    const looksLikeTrue = (v) =>
      v === true || v === "true" || v === 1 || v === "1";

    const normalizeStatus = (s) =>
      String(s || "")
        .trim()
        .toLowerCase();

    return arr.filter((item) => {
      const st = normalizeStatus(item.status);
      const isApprovedLike =
        st === "approved" ||
        st === "live" ||
        st === "approved_changes_pending" ||
        st === "live_changes_pending" ||
        st.includes("changes pending");

      const isTest =
        looksLikeTrue(item.isTest) || looksLikeTrue(item.actData?.isTest);

      return isAgent ? isApprovedLike : isApprovedLike && !isTest;
    });
  }

  // ✅ Use the Acts-page cards as the source
  const approvedActs = useMemo(
    () => getApprovedActs(actsFilterPageCards),
    [actsFilterPageCards]
  );

  // Map of id → card/act (work with actId or _id safely)
  const actMap = useMemo(
    () =>
      new Map(
        (approvedActs || []).map((a) => [
          String(a._id || a.actId || a.id || ""),
          a,
        ])
      ),
    [approvedActs]
  );

  // 🔗 Normalised cards array for this page
 const cards = useMemo(() => {
  if (Array.isArray(enrichedCards) && enrichedCards.length) return enrichedCards;
  return Array.isArray(actsFilterPageCards) ? actsFilterPageCards : [];
}, [enrichedCards, actsFilterPageCards]);

  // Simple memo to show counts without recomputing filters
  const approvedActsCount = useMemo(
    () => getApprovedActs(actsFilterPageCards).length,
    [actsFilterPageCards, userRole, userId, email]
  );

  async function applyFilter() {
    const runId = ++filterRunIdRef.current;
    GROUP(`🧪 applyFilter run #${runId}`);
    ACTS_DBG("inputs", {
      genre,
      act_size,
      djServices,
      instruments,
      songSearch,
      actSearch,
      wireless,
      soundLimiters,
      setupAndSoundcheck,
      paAndLights,
      pli,
      extraServices,
      selectedDate,
      selectedAddress,
      selectedCounty,
      availLoading,
      availMapKeys: Object.keys(availableMap || {}).length,
      cardsLen: Array.isArray(cards) ? cards.length : 0,
      actCardsLen: Array.isArray(actsFilterPageCards)
        ? actsFilterPageCards.length
        : 0,
    });

    // ───────────────────────────────────────────────────────────────────────────────
    // ✅ Normalizer + genre utilities
    // ───────────────────────────────────────────────────────────────────────────────
    const NORM = (s) =>
      String(s)
        .toLowerCase()
        .replace(/\s*&\s*/g, " and ")
        .replace(/\s+/g, " ")
        .trim();

    const selectedGenres = Array.isArray(genre) ? genre : [];
    const selectedNorm = selectedGenres.map(NORM);

    const matchByGenre = (card) => {
      const src =
        Array.isArray(card?.genres_norm) && card.genres_norm.length
          ? card.genres_norm
          : (() => {
              const rawArr = Array.isArray(card?.genres)
                ? card.genres
                : Array.isArray(card?.genre)
                  ? card.genre
                  : typeof card?.genre === "string"
                    ? [card.genre]
                    : Array.isArray(card?.genres_raw)
                      ? card.genres_raw
                      : Array.isArray(card?.genresNormalized)
                        ? card.genresNormalized
                        : [];
              return flat1(rawArr);
            })();
      const norm = src.map(NORM);
      // If the card has no genre, do not filter it out
      if (!norm.length || norm.every((g) => !g)) return true;
      // Otherwise, require exact match
      return selectedNorm.every((sel) => norm.includes(sel));
    };

    // ───────────────────────────────────────────────────────────────────────────────
    // Availability gate (skip only that part if loading)
    // ───────────────────────────────────────────────────────────────────────────────
    const skipAvailGate = Boolean(selectedDate && availLoading);
    if (skipAvailGate) {
      console.log("Skipping availability gate due to loading state");
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Server search (feature-flagged)
    // ───────────────────────────────────────────────────────────────────────────────
    const filters = buildServerFilterPayload();
    const payload = buildServerPayload(filters);

    // Detect when DJ services is the only active filter (lets us safely fall back if backend isn't ready)
    const ACTIVE_FILTER_KEYS = [
      "genres",
      "lineupSizes",
      "instruments",
      "wireless",
      "soundLimiters",
      "setupAndSoundcheck",
      "paAndLights",
      "pli",
      "songSearch",
      "extraServices",
      "djServices",
      "actSearch",
    ];

    const activeKeys = ACTIVE_FILTER_KEYS.filter(
      (k) => Array.isArray(filters?.[k]) && filters[k].length
    );

    const onlyDjServices = activeKeys.length === 1 && activeKeys[0] === "djServices";
  
    const postCandidates = async (urls, body) => {
      for (const url of urls) {
        try {
          const { data } = await axios.post(url, body);
          const arr = Array.isArray(data?.cards)
            ? data.cards
            : Array.isArray(data?.results)
              ? data.results
              : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data)
                  ? data
                  : [];
          const ids = arr
            .map((x) => String(x.actId ?? x._id ?? x.id ?? x.act_id ?? ""))
            .filter(Boolean);
          if (ids.length) return new Set(ids);
        } catch {
          /* try next */
        }
      }
      return new Set();
    };

    let serverIds = new Set();
    if (ENABLE_SERVER_SEARCH && hasActiveFilters(filters)) {
      const compatPayload = {
        ...payload,
        status: payload.includeStatuses ||
          payload.status || [
            "approved",
            "live",
            "approved_changes_pending",
            "live_changes_pending",
          ],
        statuses: payload.includeStatuses || payload.status,
        genres_norm:
          payload.genres_norm ||
          (payload.genres || []).map((s) =>
            String(s)
              .toLowerCase()
              .replace(/&/g, "and")
              .replace(/[^a-z0-9]+/g, " ")
              .trim()
          ),
        genreTokens: (payload.genres || []).map((s) =>
          String(s)
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, " ")
            .trim()
        ),
      };
      //, api("api/act/cards/search")
      console.log("📤 sending search payload:", payload, JSON.stringify(payload));
      const SEARCH_ENDPOINTS = [api("api/v2/act-cards/search")];
      serverIds = await postCandidates(SEARCH_ENDPOINTS, compatPayload);

      if (serverIds.size === 0) {
        if (onlyDjServices) {
          console.info(
            "🔶 Server search returned 0 ids for djServices — falling back to client-side DJ filtering."
          );
          // Fall back to client-side DJ services filtering using local cards/extras
          serverIds = new Set();
        } else {
          console.info("🔶 Server search yielded 0 ids — showing no results.");
          setFilterProducts([]);
          ACTS_DBG(
            "No matching records after server search, setting filterProducts to []"
          );
          return;
        }
      }
    } else if (DEBUG_FILTER) {
      console.info("🔶 Server search disabled — using client-only filtering.");
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Build source card set
    // ───────────────────────────────────────────────────────────────────────────────
    const allCards = Array.isArray(cards) ? cards : [];
    let approvedCards = serverIds.size
      ? allCards.filter((c) =>
          serverIds.has(String(c.actId ?? c._id ?? c.id ?? ""))
        )
      : allCards;

    // Debug: print all IDs and names in actsFilterPageCards and approvedCards
    console.log(
      "actsFilterPageCards IDs:",
      (actsFilterPageCards || []).map((a) => ({
        id: a.actId || a._id || a.id,
        name: a.tscName || a.name,
      }))
    );
    console.log(
      "approvedCards IDs:",
      (approvedCards || []).map((a) => ({
        id: a.actId || a._id || a.id,
        name: a.tscName || a.name,
      }))
    );

    // Ensure safe genre fields on every card
    const withSafety = approvedCards.map((c) => {
      // Always flatten genres, even if nested
      let rawArr = [];
      if (Array.isArray(c?.genres)) {
        rawArr = flat1(c.genres);
      } else if (Array.isArray(c?.genre)) {
        rawArr = flat1(c.genre);
      } else if (typeof c?.genre === "string") {
        rawArr = [c.genre];
      } else if (Array.isArray(c?.genres_raw)) {
        rawArr = flat1(c.genres_raw);
      } else if (Array.isArray(c?.genresNormalized)) {
        rawArr = flat1(c.genresNormalized);
      } else if (Array.isArray(c?.genres_norm)) {
        rawArr = flat1(c.genres_norm);
      }

      const genresRaw = rawArr.filter(Boolean);
      const genresNorm =
        Array.isArray(c?.genres_norm) && c.genres_norm.length
          ? flat1(c.genres_norm).map(NORM)
          : genresRaw.map(NORM);

      return { ...c, genres_raw: genresRaw, genres_norm: genresNorm };
    });

    // Debug: print all IDs and names in withSafety
    console.log(
      "withSafety IDs:",
      (withSafety || []).map((a) => ({
        id: a.actId || a._id || a.id,
        name: a.tscName || a.name,
      }))
    );

    const sourceCards = withSafety;

    ACTS_DBG("sourceCards", { len: sourceCards.length });
    // ...existing code...

    console.groupCollapsed("🧪 Pre-filter probe (withSafety) — first 30");
    console.table(
      (withSafety || []).slice(0, 30).map((c) => ({
        id: String(c.actId || c._id || ""),
        name: c.tscName || c.name || "(untitled)",
        genres: Array.isArray(c.genres)
          ? c.genres.join(" | ")
          : String(c.genres || ""),
        lineupSizes: Array.isArray(c.lineupSizes)
          ? c.lineupSizes.join(" | ")
          : "",
        instruments: Array.isArray(c.instruments)
          ? c.instruments.join(" | ")
          : "",
        pliAmount: c.pliAmount ?? "",
        paTrue:
          c.pa && typeof c.pa === "object"
            ? Object.entries(c.pa)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(",")
            : "",
        lightTrue:
          c.light && typeof c.light === "object"
            ? Object.entries(c.light)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(",")
            : "",
        extrasKeys: c.extras
          ? Object.keys(c.extras).slice(0, 10).join(",")
          : "",
      }))
    );
    console.groupEnd();

    // ───────────────────────────────────────────────────────────────────────────────
    // Prefer full Act objects; fall back to cards
    // ───────────────────────────────────────────────────────────────────────────────
    const pickImages = (obj = {}) =>
      obj.images ||
      obj.coverImages ||
      obj.heroImages ||
      obj.gallery ||
      obj.hero ||
      null;

    let actsCopy = withSafety
      .map((card) => {
        const id = String(card.actId || card._id || card.id || "");
        const act = actMap.get(id);

        // Always ensure lineupSizes is present and is an array
        const safeLineupSizes = Array.isArray(card.lineupSizes)
          ? card.lineupSizes
          : [];

        if (act) {
          const images =
            act.images ||
            pickImages(card) ||
            pickImages(act) ||
            imagesFromImageUrl(card?.imageUrl) ||
            null;
          return {
            ...act,
            __card: card,
            images,
            lineupSizes: Array.isArray(act.lineupSizes)
              ? act.lineupSizes
              : safeLineupSizes,
          };
        }

        return {
          ...card,
          _id: id,
          name: card.tscName || card.name || "Untitled Act",
          tscName: card.tscName,
          genres: Array.isArray(card.genres) ? card.genres : [],
          lineupSizes: safeLineupSizes,
          instruments: Array.isArray(card.instruments) ? card.instruments : [],
          extras: typeof card.extras === "object" ? card.extras : {},
          pliAmount: Number(card.pliAmount) || 0,
          paSystem:
            card.pa && typeof card.pa === "object"
              ? Object.entries(card.pa)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ")
              : "",
          lightingSystem:
            card.light && typeof card.light === "object"
              ? Object.entries(card.light)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ")
              : "",
          lineups: [],
          images:
            pickImages(card) || imagesFromImageUrl(card?.imageUrl) || null,
          __card: card,
        };
      })
      .filter(Boolean);

    ACTS_DBG("actsCopy built (first pass)", {
      len: Array.isArray(actsCopy) ? actsCopy.length : 0,
    });

    const allExtrasKeys = [
      "sound_engineering_for_another_act_with_your_acts_PA",
      "speedy_setup",
      "wired_mic",
      "wireless_mic",
      "background_music_playlist",
      "up_to_3_hours_manned_playlist",
      "up_to_3_hours_band_member_DJ",
      "DJ_live_sax_3x30mins",
      "DJ_live_bongos_3x30mins",
      "DJ_live_bongos_and_sax_3x30mins",
      "extra_30min_performance_per_band_member",
      "extra_40min_performance_per_band_member",
      "extra_60min_performance_per_band_member",
      "late_stay_60min_per_band_member",
      "early_arrival_60min_per_band_member",
      "extra_song_request_per_band_member",
      "israeli_dancing_20mins_per_band_member",
    ];
    
    // ✅ Build lookup by ACT id (card.actId), not card._id
const cardByActId = new Map(
  (withSafety || []).map((c) => [String(c.actId || c._id || c.id || ""), c])
);

actsCopy = actsCopy.map((act) => {
  const id = String(act?._id || act?.actId || act?.id || "");
  const card = cardByActId.get(id) || act.__card || null;

  // merge extras from act OR card
  const extras = (act.extras && typeof act.extras === "object" ? act.extras : null)
    ?? (card?.extras && typeof card.extras === "object" ? card.extras : {})
    ?? {};

  // Ensure all expected keys exist (default false only if missing)
  const filledExtras = { ...extras };
  allExtrasKeys.forEach((key) => {
    if (typeof filledExtras[key] === "undefined") filledExtras[key] = false;
  });

  return {
    ...act,
    __card: card,
    extras: filledExtras,

    // convenience merges so filters can read from the act directly
    genres: act.genres ?? card?.genres ?? act.genres_raw ?? card?.genres_raw ?? [],
    lineupSizes: Array.isArray(act.lineupSizes) && act.lineupSizes.length
      ? act.lineupSizes
      : (card?.lineupSizes || []),
    instruments: act.instruments ?? card?.instruments ?? [],
    pliAmount: act.pliAmount ?? card?.pliAmount ?? 0,
  };
});


    ACTS_DBG("actsCopy after card reattach", {
      len: Array.isArray(actsCopy) ? actsCopy.length : 0,
    });

    // ───────────────────────────────────────────────────────────────────────────────
    // 🎚️ GENRE FILTER (single source of truth)
    // ───────────────────────────────────────────────────────────────────────────────
    if (selectedNorm.length) {
      const before = actsCopy.length;
      actsCopy = actsCopy.filter((c) => matchByGenre(c));

      console.log("🎚️[GENRES] selected", {
        selectedRaw: selectedGenres,
        selectedNorm,
      });
      console.log(
        "🎚️[GENRES] results — kept",
        `${actsCopy.length} / ${before}`
      );

      if (before) {
        console.table(
          sourceCards.slice(0, 24).map((c, i) => {
            const rawArr = Array.isArray(c?.genres)
              ? c.genres
              : Array.isArray(c?.genre)
                ? c.genre
                : typeof c?.genre === "string"
                  ? [c.genre]
                  : Array.isArray(c?.genres_raw)
                    ? c.genres_raw
                    : Array.isArray(c?.genresNormalized)
                      ? c.genresNormalized
                      : Array.isArray(c?.genres_norm)
                        ? c.genres_norm
                        : [];
            const raw = flat1(rawArr);
            const norm = raw.map(NORM);
            const keep = selectedNorm.every((sel) => norm.includes(sel));
            return {
              index: i,
              id: String(c?.actId || c?._id || ""),
              name: c?.tscName || c?.name || "(untitled)",
              genres_raw: raw.join(" | "),
              genres_norm: norm.join(" | "),
              selected: selectedNorm.join(" & "),
              keep,
            };
          })
        );
      }
    }

    // Show something straight away before async pricing completes
    if (runId === filterRunIdRef.current && Array.isArray(actsCopy)) {
      setFilterProducts(actsCopy);
      ACTS_DBG("setFilterProducts (early show)", {
        len: Array.isArray(actsCopy) ? actsCopy.length : 0,
      });
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Other client-side filters
    // ───────────────────────────────────────────────────────────────────────────────
    /* if (wireless.length > 0) {
    actsCopy = actsCopy.filter((item) => {
      const wirelessInstruments = wireless;
      const hasWirelessMatch = item.lineups?.some((lineup) =>
        lineup.bandMembers?.some((member) => {
          const instrument = (member.instrument || "").toLowerCase();
          return wirelessInstruments.some((filterInstrument) => {
            const f = filterInstrument.toLowerCase();
            return instrument.includes(f) && member.wireless === true;
          });
        })
      );
      return hasWirelessMatch;
    });
    ACTS_DBG("after wireless filter", { remain: actsCopy.length });
  }
*/
    /* if (soundLimiters.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      // Map UI option keys to act filter card fields
      const optionMap = {
        electric_drums: "hasElectricDrums",
        iems: "hasIEMs",
        can_you_make_act_acoustic: "canMakeAcoustic",
        remove_drums: "canRemoveDrums",
      };

      // Check for non-db options (boolean flags)
      const hasNonDbOptions = soundLimiters.some((opt) => {
        const field = optionMap[opt];
        if (field) {
          // Check at act level
          if (act[field] === true) return true;
          // Check in lineups if present
          if (Array.isArray(act.lineups)) {
            return act.lineups.some((l) => l[field] === true);
          }
        }
        // Special case for electric drums legacy field
        if (opt === "electric_drums" && Array.isArray(act.lineups)) {
          return act.lineups.some((l) => Array.isArray(l.hasDrums) && l.hasDrums.includes("electric"));
        }
        return false;
      });

      const dbOptions = soundLimiters
        .map((v) => v.match(/\d+/)?.[0])
        .filter(Boolean)
        .map(Number);

      if (dbOptions.length === 0) return hasNonDbOptions;

      const selectedDb = Math.min(...dbOptions);
      const lineupDbs = (act.lineups || [])
        .map((l) => {
          const val = String(l.db || "").match(/\d+/)?.[0];
          return val ? Number(val) : null;
        })
        .filter((v) => v !== null);
      const minDbForAct = lineupDbs.length > 0 ? Math.min(...lineupDbs) : null;
      if (minDbForAct === null) return true;

      return minDbForAct <= selectedDb || hasNonDbOptions;
    });
    ACTS_DBG("after soundLimiters filter", { remain: actsCopy.length });
  }

  if (setupAndSoundcheck.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const setupFilters = setupAndSoundcheck;

      if (setupFilters.includes("setup_and_soundcheck_time_90min")) {
        const has90 = act.lineups?.some((l) => Number(l.totalSetupAndSoundcheckTime) >= 90);
        return has90;
      }

      if (setupFilters.includes("setup_and_soundcheck_time_60min")) {
        const has60 = act.lineups?.some((l) => Number(l.totalSetupAndSoundcheckTime) <= 60);
        return has60;
      }

      if (setupFilters.includes("speedy_setup")) {
        const extraKey = Object.keys(act.extras || {}).find((k) => k.toLowerCase().includes("speedy_setup"));
        if (!extraKey) return false;
        const speedy = act.extras[extraKey];
        if (!speedy) return false;
        return Number(speedy.price) > 0 || speedy.complimentary === true;
      }

      return true;
    });
    ACTS_DBG("after setupAndSoundcheck filter", { remain: actsCopy.length });
  }

  if (paAndLights.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const selected = paAndLights;

      const wantsSmallPA = selected.includes("small_pa_size");
      const wantsMediumPA = selected.includes("medium_pa_size");
      const wantsLargePA = selected.includes("large_pa_size");

      const wantsSmallLight = selected.includes("small_light_size");
      const wantsMediumLight = selected.includes("medium_light_size");
      const wantsLargeLight = selected.includes("large_light_size");

      const pa = (act.paSystem || "").toLowerCase();
      const light = (act.lightingSystem || "").toLowerCase();

      const paMatch =
        (!wantsSmallPA && !wantsMediumPA && !wantsLargePA) ||
        (wantsSmallPA && pa.includes("small")) ||
        (wantsMediumPA && pa.includes("medium")) ||
        (wantsLargePA && pa.includes("large"));

      const lightMatch =
        (!wantsSmallLight && !wantsMediumLight && !wantsLargeLight) ||
        (wantsSmallLight && light.includes("small")) ||
        (wantsMediumLight && light.includes("medium")) ||
        (wantsLargeLight && light.includes("large"));

      return paMatch && lightMatch;
    });
    ACTS_DBG("after paAndLights filter", { remain: actsCopy.length });
  }

  if (pli.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const amount = Number(act.pliAmount) || 0;
      return pli.some((req) => amount >= req);
    });
    ACTS_DBG("after pli filter", { remain: actsCopy.length });
  }

  if (extraServices.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const extras = act.extras || {};
      // DJ/playlist services: check for exact key true in extras
      const djKeys = [
        "background_music_playlist",
        "up_to_3_hours_manned_playlist",
        "DJ_live_sax_3x30mins",
        "DJ_live_bongos_3x30mins",
        "DJ_live_sax_and_bongos_3x30mins",
      ];
      return extraServices.some((selectedKeyRaw) => {
        // DJ/playlist services: direct match
        if (djKeys.includes(selectedKeyRaw)) {
          return extras[selectedKeyRaw] === true;
        }
        // legacy/other extras logic (fragment match)
        const selectedKey = selectedKeyRaw.toLowerCase();
        const fragmentMap = {
          sound_engineering_for_another_act: "sound_engineering_for_another_act",
          add_another_vocalist: "anotherVocalist",
          ceremony_solo: "solo",
          duo_ceremony: "duo",
          trio_ceremony: "trio",
          four_piece_ceremony: "fourpiece",
          afternoon_solo: "solo",
          afternoon_duo: "duo",
          afternoon_trio: "trio",
          afternoon_4piece: "fourpiece",
          early_arrival: "early_arrival",
          late_stay: "late_stay",
          extra_song: "extra_song_request",
          extra_sets: "performance",
          israeli_sets: "israeli_dancing",
        };
        const fragment = fragmentMap[selectedKey];
        if (!fragment) return false;
        const normalizeKey = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
        const extraKeys = Object.keys(extras);
        const extraKeysNorm = extraKeys.map((k) => normalizeKey(k));
        const fragmentNorm = normalizeKey(fragment);
        const index = extraKeysNorm.findIndex((k) => k.includes(fragmentNorm));
        if (index !== -1) {
          const originalKey = extraKeys[index];
          const extra = extras[originalKey];
          return extra && (extra.price > 0 || extra.complimentary === true);
        }
        const lineups = act.lineups || [];
        if (
          [
            "ceremony_solo",
            "duo_ceremony",
            "trio_ceremony",
            "four_piece_ceremony",
            "afternoon_solo",
            "afternoon_duo",
            "afternoon_trio",
            "afternoon_4piece",
          ].includes(selectedKey)
        ) {
          const piece = fragment; // solo/duo/trio/fourpiece
          const isAfternoon = selectedKey.startsWith("afternoon_");
          const type = isAfternoon ? "afternoonSets" : "ceremonySets";
          return lineups.some((l) => {
            const block = l[type]?.[piece];
            return block && Array.isArray(block.amplified) && block.amplified.length > 0;
          });
        }
        if (selectedKey === "add_another_vocalist") {
          return lineups.some((l) => l.anotherVocalist === true);
        }
        return false;
      });
    });
    ACTS_DBG("after extraServices filter", { remain: actsCopy.length });
  }

  if (showSearch && search) {
    const q = String(search).toLowerCase();
    actsCopy = actsCopy.filter((item) => item.name?.toLowerCase().includes(q));
    ACTS_DBG("after text search filter", { remain: actsCopy.length });
  }

  if (act_size.length > 0) {
    const selected = act_size.map(norm2);
    
    ACTS_DBG("selected act sizes (normed):", selected);
     console.log("🟦 ALL lineupSizes normed helper:", actsCopy);
     console.log(
  "🟦 ALL lineupSizes before filtering:",
  actsCopy.map(a => ({
    id: a._id || a.actId,
    name: a.name || a.tscName,
    lineupSizes: a.lineupSizes,
    normed: Array.isArray(a.lineupSizes)
      ? a.lineupSizes.map(norm2)
      : []
  }))
);
    actsCopy = actsCopy.filter((item) => {
      // Prefer lineupSizes array (DB field), fallback to lineups[].actSize
      let sizes = [];
      if (Array.isArray(item.lineupSizes) && item.lineupSizes.length > 0) {
        sizes = item.lineupSizes.map(norm2);
      } else if (Array.isArray(item.lineups)) {
        sizes = item.lineups.map((l) => l?.actSize).filter(Boolean).map(norm2);
      }
      return selected.some((sel) => sizes.includes(sel));
    });
   
    ACTS_DBG("after act_size filter", { remain: actsCopy.length });
  } */

// cards returned from POST /api/v2/act-cards/search (via ShopContext)


    /*if (instruments.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const actInstruments = deriveActInstruments(act);
      return instruments.some((sel) => actInstruments.includes(sel));
    });
    ACTS_DBG("after instruments filter", { remain: actsCopy.length });
  }*/

    /*if (songSearch.length > 0) {
    actsCopy = actsCopy.filter((act) => {
      const songs = Array.isArray(act.selectedSongs)
        ? act.selectedSongs
        : Array.isArray(act.repertoire)
        ? act.repertoire
        : [];
      return songs.some((song) =>
        songSearch.some((term) => {
          const q = String(term).trim().toLowerCase();
          const title = String(song.title ?? song.song_name ?? "").toLowerCase();
          const artist = String(song.artist ?? "").toLowerCase();
          return title.includes(q) || artist.includes(q);
        })
      );
    });
    ACTS_DBG("after songSearch filter", { remain: actsCopy.length });
  }*/

    if (actSearch.length > 0) {
      actsCopy = actsCopy.filter((act) =>
        actSearch.some((searchTerm) =>
          act.tscName?.toLowerCase().includes(String(searchTerm).toLowerCase())
        )
      );
      ACTS_DBG("after actSearch filter (tscName)", { remain: actsCopy.length });
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // Pricing
    // ───────────────────────────────────────────────────────────────────────────────
    const calculateActPricing = async (
      act,
      selectedCounty,
      selectedAddress,
      selectedDate,
      selectedLineup
    ) => {
      ACTS_DBG("$pricing:init", {
        actId: act?._id,
        name: act?.tscName || act?.name,
        selectedCounty,
        hasAddress: !!selectedAddress,
        hasDate: !!selectedDate,
      });

      const BASE = (
        import.meta.env.VITE_BACKEND_URL ||
        "https://tsc-backend-v2.onrender.com"
      ).replace(/\/+$/, "");

      const fetchTravel = async (origin, destination, dateISO) => {
        const url =
          `${BASE}/api/v2/travel/travel-data` +
          `?origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(destination)}` +
          `&date=${encodeURIComponent(String(dateISO).slice(0, 10))}`;

        const res = await fetch(url, {
          headers: { accept: "application/json" },
        });
        const text = await res.text();

        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
        if (!res.ok) throw new Error(`travel http ${res.status}`);

        const legacyEl = data?.rows?.[0]?.elements?.[0];
        const outbound =
          data?.outbound ||
          (legacyEl?.distance && legacyEl?.duration
            ? {
                distance: legacyEl.distance,
                duration: legacyEl.duration,
                fare: legacyEl.fare,
              }
            : undefined);
        const returnTrip = data?.returnTrip;

        return { outbound, returnTrip, raw: data };
      };

      const normalizeWord = (s) =>
        String(s || "")
          .trim()
          .toLowerCase();
      const isManagerLike = (m) => {
        if (m?.isManager === true) return true;
        const fields = [
          m?.role,
          m?.position,
          m?.instrument,
          m?.title,
          ...(Array.isArray(m?.additionalRoles)
            ? m.additionalRoles.map((r) => r?.customRole || r?.role)
            : []),
        ]
          .filter(Boolean)
          .map(normalizeWord);
        return fields.some((f) => f.includes("manager"));
      };

      let travelFee = 0;

      let smallestLineup = null;
      if (selectedLineup && Array.isArray(selectedLineup.bandMembers)) {
        smallestLineup = selectedLineup;
      } else {
        smallestLineup = act.lineups?.reduce((min, lineup) => {
          if (!Array.isArray(lineup.bandMembers)) return min;
          if (!min || lineup.bandMembers.length < min.bandMembers.length)
            return lineup;
          return min;
        }, null);
      }
      if (!smallestLineup || !Array.isArray(smallestLineup.bandMembers))
        return null;

      const northernCounties = new Set([
        "ceredigion",
        "cheshire",
        "cleveland",
        "conway",
        "cumbria",
        "denbighshire",
        "derbyshire",
        "durham",
        "flintshire",
        "greater manchester",
        "gwynedd",
        "herefordshire",
        "lancashire",
        "leicestershire",
        "lincolnshire",
        "merseyside",
        "north humberside",
        "north yorkshire",
        "northumberland",
        "nottinghamshire",
        "rutland",
        "shropshire",
        "south humberside",
        "south yorkshire",
        "staffordshire",
        "tyne and wear",
        "warwickshire",
        "west midlands",
        "west yorkshire",
        "worcestershire",
        "wrexham",
        "rhondda cynon taf",
        "torfaen",
        "neath port talbot",
        "bridgend",
        "blaenau gwent",
        "caerphilly",
        "cardiff",
        "merthyr tydfil",
        "newport",
        "aberdeen city",
        "aberdeenshire",
        "angus",
        "argyll and bute",
        "clackmannanshire",
        "dumfries and galloway",
        "dundee city",
        "east ayrshire",
        "east dunbartonshire",
        "east lothian",
        "east renfrewshire",
        "edinburgh",
        "falkirk",
        "fife",
        "glasgow",
        "highland",
        "inverclyde",
        "midlothian",
        "moray",
        "na h eileanan siar",
        "north ayrshire",
        "north lanarkshire",
        "orkney islands",
        "perth and kinross",
        "renfrewshire",
        "scottish borders",
        "shetland islands",
        "south ayrshire",
        "south lanarkshire",
        "stirling",
        "west dunbartonshire",
        "west lothian",
      ]);

      const isNorthernGig = northernCounties.has(
        String(selectedCounty || "")
          .toLowerCase()
          .trim()
      );

      const chosenMembers =
        act.useDifferentTeamForNorthernGigs && isNorthernGig
          ? act.northernTeam || []
          : smallestLineup.bandMembers || [];

      const performingMembers = (chosenMembers || []).filter(
        (m) => !isManagerLike(m)
      );

      const essentialFees = smallestLineup.bandMembers.flatMap((member) => {
        const baseFee = member.isEssential ? Number(member.fee) || 0 : 0;
        const additionalEssentialFees = (member.additionalRoles || [])
          .filter((role) => role.isEssential)
          .map((role) => Number(role.additionalFee) || 0);
        return [baseFee, ...additionalEssentialFees];
      });

      const fee = essentialFees.reduce((sum, n) => sum + n, 0);

      const memberPostcodes = performingMembers
        .map((m) => m?.postCode)
        .filter(Boolean);
      const destination =
        typeof selectedAddress === "string"
          ? selectedAddress
          : selectedAddress?.postcode || selectedAddress?.address || "";

      if (act.useCountyTravelFee && act.countyFees) {
        const countyKey = String(selectedCounty || "").toLowerCase();
        const feePerMember = Number(act.countyFees[countyKey]) || 0;
        travelFee = feePerMember * memberPostcodes.length;
      } else if (Number(act.costPerMile) > 0) {
        for (const postCode of memberPostcodes) {
          if (!destination) continue;
          try {
            const { outbound, raw } = await fetchTravel(
              postCode,
              destination,
              selectedDate
            );
            const meters =
              outbound?.distance?.value ??
              raw?.rows?.[0]?.elements?.[0]?.distance?.value ??
              0;
            const miles = meters / 1609.34;
            travelFee += miles * Number(act.costPerMile) * 2; // return trip
          } catch (e) {
            console.warn("⚠️ travel fetch failed (per-mile):", e?.message || e);
          }
        }
      } else {
        for (const member of performingMembers) {
          const postCode = member?.postCode;
          if (!postCode || !destination) continue;

          try {
            const { outbound, returnTrip } = await fetchTravel(
              postCode,
              destination,
              selectedDate
            );
            if (!outbound || !returnTrip) continue;

            const outboundDistance = outbound?.distance?.value;
            const returnDistance = returnTrip?.distance?.value;
            const outboundDuration = outbound?.duration?.value;
            const returnDuration = returnTrip?.duration?.value;

            if (
              typeof outboundDistance !== "number" ||
              typeof returnDistance !== "number" ||
              typeof outboundDuration !== "number" ||
              typeof returnDuration !== "number"
            ) {
              continue;
            }

            const totalDistanceMiles =
              (outboundDistance + returnDistance) / 1609.34;
            const totalDurationHours =
              (outboundDuration + returnDuration) / 3600;

            const fuelFee = totalDistanceMiles * 0.56;
            const timeFee = totalDurationHours * 13.23;
            const lateFee = returnDuration / 3600 > 1 ? 136 : 0;
            const tollFee =
              (outbound.fare?.value || 0) + (returnTrip.fare?.value || 0);

            travelFee += fuelFee + timeFee + lateFee + tollFee;
          } catch (e) {
            console.warn("⚠️ travel fetch failed (MU):", e?.message || e);
          }
        }
      }

      const totalPrice = Math.ceil((fee + travelFee) * 1.33); // 33% mark up
      ACTS_DBG("$pricing:done", { actId: act?._id, totalPrice });
      return `${totalPrice}`;
    };

    const updatedActs = await Promise.all(
      actsCopy.map(async (act) => {
        try {
          if (!selectedDate || !selectedAddress) {
            return { ...act, formattedPrice: null };
          }
          const price = await calculateActPricing(
            act,
            selectedCounty,
            selectedAddress,
            selectedDate
          );
          return { ...act, formattedPrice: price };
        } catch {
          return { ...act, formattedPrice: null };
        }
      })
    );
    ACTS_DBG("updatedActs (post pricing)", {
      len: Array.isArray(updatedActs) ? updatedActs.length : 0,
      sample: (Array.isArray(updatedActs) ? updatedActs.slice(0, 5) : []).map(
        (a) => ({
          id: a?._id,
          n: a?.tscName || a?.name,
          price: a?.formattedPrice,
        })
      ),
    });

    // ───────────────────────────────────────────────────────────────────────────────
    // Sort + set
    // ───────────────────────────────────────────────────────────────────────────────
    if (runId === filterRunIdRef.current) {
      let finalActs = [...updatedActs];

      const num = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : NaN;
      };

      if (sortType === "low-high") {
        finalActs.sort((a, b) => {
          const A = num(a.formattedPrice);
          const B = num(b.formattedPrice);
          if (Number.isNaN(A) && Number.isNaN(B)) return 0;
          if (Number.isNaN(A)) return 1;
          if (Number.isNaN(B)) return -1;
          return A - B;
        });
      } else if (sortType === "high-low") {
        finalActs.sort((a, b) => {
          const A = num(a.formattedPrice);
          const B = num(b.formattedPrice);
          if (Number.isNaN(A) && Number.isNaN(B)) return 0;
          if (Number.isNaN(A)) return 1;
          if (Number.isNaN(B)) return -1;
          return B - A;
        });
      }

      ACTS_DBG("finalActs before set", { len: finalActs.length });
      setFilterProducts(finalActs);
      console.log(
        "✅ Filtered products set:",
        finalActs.length,
        finalActs.map((a) => a.name || a.tscName)
      );
      ACTS_DBG("✅ setFilterProducts(final)", { len: finalActs.length });
      ENDGROUP();
    } else {
      ACTS_DBG(`Skipping stale filter run #${runId}`);
      ENDGROUP();
    }
  }

  // 1) Initial boot — keep as-is
useEffect(() => {
  const init = async () => {
    setInitializing(true);

    const storedDate = getStored("selectedDate");
    const storedAddress = getStored("selectedAddress");
    const storedCounty = getStored("selectedCounty");

    if (storedCounty) setSelectedCounty(storedCounty);
    if (storedDate) setSelectedDate(storedDate);
    if (storedAddress) setSelectedAddress(storedAddress);

   const AUTO_OPEN_KEY = "acts:autoOpenSearchDone";

const getStoredLocation = () => ({
  storedAddress: getStored("selectedAddress"),
  storedCounty: getStored("selectedCounty"),
  storedPlace: getStored("selectedPlace"),
});

const hasAnyLocation = () => {
  const { storedAddress, storedCounty, storedPlace } = getStoredLocation();
  return Boolean(
    selectedAddress ||
      selectedCounty ||
      storedAddress ||
      storedCounty ||
      storedPlace
  );
};

useEffect(() => {
  const init = async () => {
    const { storedAddress, storedCounty, storedPlace } = getStoredLocation();

    // ✅ Auto-open search ONCE if there’s no location saved
    // - don’t do this if we’re coming via /acts/:preset
    // - don’t reopen repeatedly if user closes it
    const noLocation = !storedAddress && !storedCounty && !storedPlace;
    const isPresetRoute = Boolean(preset);

    // ✅ if location exists, ensure search is CLOSED
    if (hasAnyLocation()) {
      setShowSearch(false);
    } else {
      // ✅ only auto-open once per session (not every remount)
      const alreadyAutoOpened = sessionStorage.getItem(AUTO_OPEN_KEY) === "1";

      if (!isPresetRoute && !alreadyAutoOpened) {
        sessionStorage.setItem(AUTO_OPEN_KEY, "1");
        setShowSearch(true);
        window.scrollTo(0, 0);
      }
    }

    if (DEBUG_FILTER) {
      ACTS_DBG("INIT auto-open check", {
        preset,
        isPresetRoute,
        noLocation,
        storedDate,
        storedAddress,
        storedCounty,
        storedPlace,
        hasAnyLocation: hasAnyLocation(),
        alreadyAutoOpened: sessionStorage.getItem(AUTO_OPEN_KEY) === "1",
      });
    }

    // warm availability from cache (keep your existing logic)
    try {
      const d = (storedDate || "").slice(0, 10);
      if (d) {
        const cached = sessionStorage.getItem(`availMap:${d}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            setAvailableMap(parsed);
          }
        }
      }
    } catch {}

    await applyFilter();
    setInitializing(false);
  };

  init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ✅ If user selects a location while search is open, close it immediately
useEffect(() => {
  if (showSearch && hasAnyLocation()) {
    if (DEBUG_FILTER) ACTS_DBG("Location detected -> closing search");
    setShowSearch(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedAddress, selectedCounty]);

// 2) When acts arrive (0 → N), run filter
useEffect(() => {
  if (!initializing) {
    // Debug: print all fields from API response for each act
    console.groupCollapsed("actsFilterPageCards FULL API response");
    (Array.isArray(actsFilterPageCards) ? actsFilterPageCards : []).forEach(
      (act, i) => {
        console.log(`#${i} actId:`, act.actId || act._id || act.id, act);
      }
    );
    console.groupEnd();

    applyFilter();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [actsFilterPageCards.length]);

  // 4) Main “filters changed” effect
  useEffect(() => {
    const asyncApply = async () => {
      setUpdatingResults(true);
      await applyFilter();
      setUpdatingResults(false);
    };
    asyncApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // search & UI toggles
    search,
    showSearch,
    genre,
    act_size,
    djServices,
    instruments,
    songSearch,
    actSearch,
    soundLimiters,
    setupAndSoundcheck,
    paAndLights,
    pli,
    extraServices,
    wireless,

    // availability & date
    selectedDate,
    availableMap, // identity changes on setAvailableMap(map)
    availLoading, // re-run after it finishes

    // acts arriving
    approvedActsCount,
  ]);

  const DURATION_KEYS = [
    "extra_30min_performance_per_band_member",
    "extra_40min_performance_per_band_member",
    "extra_60min_performance_per_band_member",
  ];

  const hasAnyDurationExtra = (arr) =>
    Array.isArray(arr) && DURATION_KEYS.some((k) => arr.includes(k));

  // If you manage state directly (have setExtraServices):
  const toggleDurationExtras = () => {
    if (hasAnyDurationExtra(extraServices)) {
      // remove all duration extras
      setExtraServices((prev) =>
        prev.filter((x) => !DURATION_KEYS.includes(x))
      );
    } else {
      // add a sensible default (pick one); here we add 40min
      setExtraServices((prev) => [
        ...prev,
        "extra_40min_performance_per_band_member",
      ]);
    }
  };

// ✅ Sorted results (no state mutation)
const parsePrice = (v) => {
  if (v === null || typeof v === "undefined") return NaN;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;

  const s = String(v).trim();
  if (!s) return NaN;

  // remove currency symbols/spaces and thousands separators
  const cleaned = s.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
};

const getSortPrice = (act) => {
  // If pricing has been calculated (address+date), use it
  const priced = parsePrice(act?.formattedPrice);
  if (!Number.isNaN(priced)) return priced;

  // Otherwise fall back to the card's minimum "from" price
  const candidates = [
    act?.minDisplayPrice,
    act?.minPrice,
    act?.min_price,
    act?.__card?.minDisplayPrice,
    act?.__card?.min_display_price,
    act?.__card?.minPrice,
    act?.__card?.min_price,
    act?.__card?.basePrice,
    act?.basePrice,
  ];

  for (const c of candidates) {
    const n = parsePrice(c);
    if (!Number.isNaN(n)) return n;
  }

  return NaN;
};

const results = useMemo(() => {
  const arr = Array.isArray(filterProducts) ? filterProducts : [];
  if (sortType === "relevant") return arr;

  const dir = sortType === "low-high" ? 1 : -1;

  return [...arr].sort((a, b) => {
    const A = getSortPrice(a);
    const B = getSortPrice(b);

    // Missing/NaN prices go to the end consistently
    const bothNaN = Number.isNaN(A) && Number.isNaN(B);
    if (bothNaN) return 0;
    if (Number.isNaN(A)) return 1;
    if (Number.isNaN(B)) return -1;

    return dir * (A - B);
  });
}, [filterProducts, sortType]);


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
                className={`h-3 md:hidden transition-transform duration-300 ${
                  showFilter ? "rotate-90" : ""
                }`}
                src={assets.dropdown_icon}
                alt=""
              />
            </p>

            <div
              className={`border border-gray-300 pl-5 py-3 my-5 ${
                showFilter ? "block" : "hidden"
              } md:block`}
            >
              {/* ------- GENRES ------- */}
              <p
                onClick={() => setShowGenreFilter(!showGenreFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                GENRES
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showGenreFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showGenreFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                </div>
              )}

              {/* ------- ACT SIZE ------- */}
              <p
                onClick={() => setShowActSizeFilter(!showActSizeFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                ACT SIZE
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showActSizeFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showActSizeFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          value={"3-Piece"}
                          onChange={toggleActSize}
                          checked={act_size.includes("3-Piece")}
                        />{" "}
                        3-Piece
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
                  )}{" "}
                </div>
              )}

              {/* ------- DJ SERVICES ------- */}
              <p
                onClick={() => setShowDjServicesFilter(!showDjServicesFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                DJ SERVICES
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showDjServicesFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showDjServicesFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                  {/*DJ Service Dropdown Options */}
                  {showDjServicesFilter && (
                    <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"background_music_playlist"}
                          onChange={toggleDjServices}
                          checked={djServices.includes(
                            "background_music_playlist"
                          )}
                        />{" "}
                        Background Playlist Music
                      </p>
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"up_to_3_hours_manned_playlist"}
                          onChange={toggleDjServices}
                          checked={djServices.includes(
                            "up_to_3_hours_manned_playlist"
                          )}
                        />{" "}
                        Manned Playlist
                      </p>
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"up_to_3_hours_band_member_DJ"}
                          onChange={toggleDjServices}
                          checked={djServices.includes(
                            "up_to_3_hours_band_member_DJ"
                          )}
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
                          checked={djServices.includes(
                            "DJ_live_bongos_3x30mins"
                          )}
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
                  )}{" "}
                </div>
              )}

              {/* ------- INSTRUMENTS ------- */}
              <p
                onClick={() => setShowInstrumentsFilter(!showInstrumentsFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                INSTRUMENTS
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showInstrumentsFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showInstrumentsFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          value={"Electric Guitar"}
                          onChange={toggleInstruments}
                          checked={instruments.includes("Electric Guitar")}
                        />{" "}
                        Electric Guitar
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
                  )}{" "}
                </div>
              )}

              {/* ------- WIRELESS ------- */}
              <p
                onClick={() => setShowWirelessFilter(!showWirelessFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                WIRELESS
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showWirelessFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showWirelessFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          value={"Keyboard"}
                          onChange={toggleWireless}
                          checked={wireless.includes("Keyboard")}
                        />{" "}
                        Keyboard (/ Keytar)
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
                  )}{" "}
                </div>
              )}

              {/* ------- SONG & ARTIST SEARCH ------- */}
              <p
                onClick={() => setShowSongFilter(!showSongFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                SONG & ARTIST SEARCH
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showSongFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showSongFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                  )}{" "}
                </div>
              )}

              {/* ------- ACT NAME SEARCH ------- */}
              <p
                onClick={() => setShowActFilter(!showActFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                ACT NAME SEARCH
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showActFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showActFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                  )}{" "}
                </div>
              )}

              {/* ------- SOUND LIMITERS ------- */}
              <p
                onClick={() =>
                  setShowSoundLimitersFilter(!showSoundLimiterFilter)
                }
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                SOUND LIMITERS
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showSoundLimiterFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showSoundLimiterFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          checked={soundLimiters.includes(
                            "can_you_make_act_acoustic"
                          )}
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
                  )}{" "}
                </div>
              )}

              {/* ------- SETUP & SOUNDCHECK ------- */}
              <p
                onClick={() =>
                  setShowSetupAndSoundcheckFilter(!showSetupAndSoundcheckFilter)
                }
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                SETUP & SOUNDCHECK
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showSetupAndSoundcheckFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showSetupAndSoundcheckFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                  )}{" "}
                </div>
              )}

              {/* ------- PA & LIGHTS ------- */}
              <p
                onClick={() => setShowPaAndLightsFilter(!showPaAndLightsFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                PA & LIGHTS
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showPaAndLightsFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showPaAndLightsFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                  )}{" "}
                </div>
              )}

              {/* ------- PLI ------- */}
              <p
                onClick={() => setShowPliFilter(!showPliFilter)}
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                PLI
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showPliFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showPliFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          checked={pli.includes(2)}
                        />{" "}
                        Up to £2m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={3}
                          onChange={togglePli}
                          checked={pli.includes(3)}
                        />{" "}
                        Up to £3m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={4}
                          onChange={togglePli}
                          checked={pli.includes(4)}
                        />{" "}
                        Up to £4m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={5}
                          onChange={togglePli}
                          checked={pli.includes(5)}
                        />{" "}
                        Up to £5m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={10}
                          onChange={togglePli}
                          checked={pli.includes(10)}
                        />{" "}
                        Up to £10m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={15}
                          onChange={togglePli}
                          checked={pli.includes(15)}
                        />{" "}
                        Up to £15m
                      </label>
                      <label className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={20}
                          onChange={togglePli}
                          checked={pli.includes(20)}
                        />{" "}
                        Up to £20m
                      </label>
                    </div>
                  )}{" "}
                </div>
              )}

              {/* ------- EXTRA SERVICES ------- */}
              <p
                onClick={() =>
                  setShowExtraServicesFilter(!showExtraServicesFilter)
                }
                className="mb-3 mt-3 text-sm font-medium flex items-center cursor-pointer gap-2"
              >
                EXTRA SERVICES
                <img
                  className={`h-3 transition-transform duration-300 ${
                    showExtraServicesFilter ? "rotate-90" : ""
                  }`}
                  src={assets.dropdown_icon}
                  alt=""
                />
              </p>

              {showExtraServicesFilter && (
                <div className="flex flex-col gap-2 text-sm font-light w-11/12 text-gray-700">
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
                          checked={extraServices.includes(
                            "four_piece_ceremony"
                          )}
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
                          value={"early_arrival_60min_per_band_member"}
                          onChange={toggleExtraServices}
                          checked={extraServices.includes(
                            "early_arrival_60min_per_band_member"
                          )}
                        />{" "}
                        Early Arrival
                      </p>
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"late_stay_60min_per_band_member"}
                          onChange={toggleExtraServices}
                          checked={extraServices.includes(
                            "late_stay_60min_per_band_member"
                          )}
                        />{" "}
                        Late Stay
                      </p>
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"extra_song_request_per_band_member"}
                          onChange={toggleExtraServices}
                          checked={extraServices.includes(
                            "extra_song_request_per_band_member"
                          )}
                        />{" "}
                        Extra Song Requests
                      </p>
                      <p className="flex gap-2 items-center">
                        <input
                          className="w-3"
                          type="checkbox"
                          onChange={toggleDurationExtras}
                          checked={hasAnyDurationExtra(extraServices)}
                        />{" "}
                        Extra Main Performance Sets
                      </p>

                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={
                            "sound_engineering_for_another_act_with_your_acts_PA"
                          }
                          onChange={toggleExtraServices}
                          checked={extraServices.includes(
                            "sound_engineering_for_another_act_with_your_acts_PA"
                          )}
                        />{" "}
                        Sound Engineering for Another Act
                      </p>
                      <p className="flex gap-2">
                        <input
                          className="w-3"
                          type="checkbox"
                          value={"israeli_dancing_20mins_per_band_member"}
                          onChange={toggleExtraServices}
                          checked={extraServices.includes(
                            "israeli_dancing_20mins_per_band_member"
                          )}
                        />{" "}
                        Israeli Dancing Sets
                      </p>
                    </div>
                  )}{" "}
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

          {/* Current Address in State */}
          <div className="flex text-base sm:text-2xl justify-between gap-6">
            {/* Product/Act Sort */}
            <select
              className="border-2 border-gray-300 text-sm px-2"
              onChange={(e) => setSortType(e.target.value)}
              value={sortType}
            >
              <option value="relevant">Sort by: Relevant</option>
              <option value="low-high">Sort by: Low to High</option>
              <option value="high-low">Sort by: High to Low</option>
            </select>
          </div>

          {/* ✅ Now dynamically shows selected date & address */}
          <div>
            {selectedDate && selectedAddress ? (
              <p className="text-sm mt-3 justify-right p-2 text-gray-500">
                Showing Results for:
                <span className="text-gray-700">
                  {" "}
                  {formatDate(selectedDate)} at{" "}
                  {storedPlace && `${storedPlace}, `}
                  {selectedAddress}{" "}
                </span>
                <span
                  onClick={() => triggerSearch()}
                  className="text-blue-600 cursor-pointer underline ml-2"
                >
                  edit search
                </span>
              </p>
            ) : (
              <p className="text-sm mt-3 justify-right p-2 text-gray-500">
                Please select a date and location for an accurate quote!
                <span
                  onClick={() => triggerSearch()}
                  className="text-blue-600 cursor-pointer underline ml-2"
                >
                  Begin Search
                </span>
              </p>
            )}
          </div>

          <div>
            {(genre.length > 0 ||
              act_size.length > 0 ||
              djServices.length > 0 ||
              songSearch.length > 0 ||
              actSearch.length > 0 ||
              instruments.length > 0 ||
              wireless.length > 0 ||
              soundLimiters.length > 0 ||
              setupAndSoundcheck.length > 0 ||
              paAndLights.length > 0 ||
              pli.length > 0 ||
              extraServices.length > 0) && (
              <div className="flex flex-wrap gap-2 p-2 mb-4 border-b">
                {updatingResults && (
                  <div className="w-full sm:ml-0 mb-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded">
                    Updating results…
                  </div>
                )}

                {[
                  ...genre,
                  ...act_size,
                  ...djServices,
                  ...instruments,
                  ...wireless,
                  ...soundLimiters,
                  ...setupAndSoundcheck,
                  ...paAndLights,
                  ...pli,
                  ...extraServices,
                ].map((item) => (
                  <span
                    key={item}
                    className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex items-center gap-2"
                  >
                    {labelMap[item] || item}{" "}
                    {/* Use labelMap to show a friendly name */}
                    <button
                      onClick={() => {
                        if (genre.includes(item))
                          toggleGenre({ target: { value: item } });
                        else if (act_size.includes(item))
                          toggleActSize({ target: { value: item } });
                        else if (djServices.includes(item))
                          toggleDjServices({ target: { value: item } });
                        else if (instruments.includes(item))
                          toggleInstruments({ target: { value: item } });
                        else if (wireless.includes(item))
                          toggleWireless({ target: { value: item } });
                        else if (soundLimiters.includes(item))
                          toggleSoundLimiters({ target: { value: item } });
                        else if (setupAndSoundcheck.includes(item))
                          toggleSetupAndSoundcheck({
                            target: { value: item },
                          });
                        else if (paAndLights.includes(item))
                          togglePaAndLights({ target: { value: item } });
                        else if (pli.includes(item))
                          togglePli({ target: { value: item } });
                        else if (extraServices.includes(item))
                          toggleExtraServices({ target: { value: item } });
                      }}
                      className="text-gray-100 text-xs font-bold"
                    >
                      ✖️
                    </button>
                  </span>
                ))}

                {/* Song or Artist Search */}
                {songSearch.map((item) => (
                  <span
                    key={item}
                    className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex items-center gap-2"
                  >
                    {item} {/* User input appears as a tag */}
                    <button
                      onClick={() =>
                        setSongSearch(
                          songSearch.filter((song) => song !== item)
                        )
                      }
                      className="text-gray-100 text-xs font-bold"
                    >
                      ✖️
                    </button>
                  </span>
                ))}

                {/* Act Name Search */}
                {actSearch.map((item) => (
                  <span
                    key={item}
                    className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded flex items-center gap-2"
                  >
                    {item} {/* User input appears as a tag */}
                    <button
                      onClick={() =>
                        setActSearch(actSearch.filter((act) => act !== item))
                      }
                      className="text-gray-100 text-xs font-bold"
                    >
                      ✖️
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Map products / acts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-6">
            {results.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-10 text-lg font-semibold">
                No matching records
              </div>
            ) : (
              results.map((item) => (
                <CardFilterItem
                  key={item.actId || item._id}
                  actData={{
                    ...item,
                    images:
                      item?.images ??
                      item?.__card?.images ??
                      item?.__card?.coverImages,
                  }}
                  variant="listing"
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Acts;
