// frontend/src/context/CardFilterShopContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import calculateActPricing from "../pages/utils/pricing";
import CustomToast from "../components/CustomToast";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash.debounce";

export const CardFilterShopContext = createContext();

const ALLOWED_ACT_NAMES = new Set(["Motown Magic", "Dancefloor Magic"]);

const CardFilterShopProvider = (props) => {
  const currency = "£";
  const delivery_fee = 10;
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // --- Core UI / data ---
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [acts, setActs] = useState([]);
  // Lightweight listing cards from /api/act/cards
  const [actCards, setActCards] = useState([]);
  // --- CART STATE ---
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem("cartItems");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [cartUpdated, setCartUpdated] = useState(false);

  // --- Persist cart to localStorage whenever it changes ---
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch (err) {
      console.warn("⚠️ Failed to persist cartItems:", err.message);
    }
  }, [cartItems]);

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [selectedVocalists, setSelectedVocalists] = useState({});
  const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  // --- User / shortlist (single sources of truth) ---
  const [userId, setUserId] = useState(null);
  const setUser = (userObj) => {
    if (userObj?._id) {
      setUserId(userObj._id);
      localStorage.setItem("user", JSON.stringify(userObj));
    }
  };
  const [shortlistedActs, setShortlistedActs] = useState(() => {
    try {
      const s = localStorage.getItem("shortlistItems");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  const [shortlistItems, setShortlistItems] = useState(() => {
    try {
      const s = localStorage.getItem("shortlistItems");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  // In ShopContext (new helper; do NOT change existing functions)
const searchActCards = React.useCallback(async (payload) => {
  try {
    const BASE = (import.meta.env.VITE_BACKEND_URL || "https://tsc-backend-v2.onrender.com").replace(/\/+$/, "");
    const res = await fetch(`${BASE}/api/v2/act-cards/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return Array.isArray(data?.cards) ? data.cards : [];
  } catch (e) {
    console.warn("searchActCards failed:", e?.message || e);
    return [];
  }
}, []);

  const CARD_STATUSES = "approved,live,approved_changes_pending";
 const ALLOWED_STATUSES_SET = new Set(
    String(CARD_STATUSES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
// Be conservative: match common “test” prefixes without blocking legit names
  const TEST_NAME_RE = /^(test|demo)\b|^\s*(test|demo)\s*[-–—]/i;

  const isTestLike = (item = {}) => {
    // explicit flags from backend/card payloads
    const raw = item?.isTest;
    const flag = raw === true || raw === "true" || raw === 1 || raw === "1";

    // name-based fallback
    const name = String(item?.tscName || item?.name || "").trim();

    return flag || TEST_NAME_RE.test(name);
  };

  const statusOk = (act = {}) => {
    const st = String(act?.status || "").trim();
    return ALLOWED_STATUSES_SET.size === 0 || ALLOWED_STATUSES_SET.has(st);
  };

  const AGENT_OVERRIDE_IDS = new Set(["680fb453a2de6618675ca9ed"]);

  const canSeeTestActs = (user) => {
    const id = String(user?._id || user?.id || "");
    const role = String(user?.role || "");

    return role === "agent" || AGENT_OVERRIDE_IDS.has(id);
  };

  const shouldIncludeActItem = (act, opts) => {
    const allowTestActs = !!(
      opts &&
      typeof opts === "object" &&
      opts.allowTestActs
    );

    // agents can see everything (including test/demo + any statuses)
    if (allowTestActs) return true;

    // normal users: must be in allowed statuses AND not test-like
    return statusOk(act) && !isTestLike(act);
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const getAllowTestActs = () => canSeeTestActs(getStoredUser());

// ============ Grid cards (fast) — hoisted so it can be called above ============
async function fetchActsForGrid() {
  const base = String(backendUrl || "").replace(/\/+$|^\s+|\s+$/g, "");
  const urlCards = `${base}/api/act/cards?status=${CARD_STATUSES}&sort=-createdAt&limit=200`;
  console.log("🛒[ShopContext] fetchActsForGrid:", urlCards);

  const buildCardFromAct = (a) => {
    const pickImage = (obj) =>
      (Array.isArray(obj?.profileImage) && obj.profileImage[0]?.url) ||
      obj?.profileImage?.url ||
      (Array.isArray(obj?.coverImage) && obj.coverImage[0]?.url) ||
      obj?.coverImage?.url ||
      (Array.isArray(obj?.images) && obj.images[0]?.url) ||
      obj?.images?.[0]?.url ||
      "";

    const smallestLineup = (() => {
      const ls = Array.isArray(a?.lineups) ? a.lineups : [];
      if (!ls.length) return null;

      const sizeOf = (l) => {
        const m = String(l?.act_size || l?.actSize || "").match(/(\d+)/);
        if (m) return parseInt(m[1], 10);
        return Array.isArray(l?.bandMembers) ? l.bandMembers.length : 9999;
      };

      return [...ls].sort((x, y) => sizeOf(x) - sizeOf(y))[0] || null;
    })();

    const lineupBase = Number(smallestLineup?.base_fee?.[0]?.total_fee);
    const basePrice = Number.isFinite(lineupBase)
      ? Math.ceil(lineupBase * 1.33)
      : null;

    return {
      actId: String(a?._id || a?.actId || ""),
      tscName: a?.tscName || a?.name || "",
      name: a?.name || "",
      slug: a?.slug || "",
      imageUrl: pickImage(a),
      images: pickImage(a) ? [{ url: pickImage(a) }] : [],
      basePrice,
      createdAt: a?.createdAt || null,
      updatedAt: a?.updatedAt || null,
      bestseller: Boolean(a?.bestseller ?? a?.bestSeller),
      minDisplayPrice: Number.isFinite(Number(a?.minDisplayPrice))
        ? Number(a.minDisplayPrice)
        : null,
      availabilityBadge: null,
      status: a?.status || "",
      genres: Array.isArray(a?.genres)
        ? a.genres
        : Array.isArray(a?.genre)
          ? a.genre
          : [],
      instruments: Array.isArray(a?.instruments) ? a.instruments : [],
      leadRole: a?.leadRole || "",
      vocalist: a?.vocalist || "",
      loveCount: Number(a?.loveCount ?? a?.numberOfShortlistsIn ?? 0) || 0,
      timesShortlisted: Number(a?.timesShortlisted || 0) || 0,
      numberOfShortlistsIn: Number(a?.numberOfShortlistsIn || 0) || 0,
    };
  };

  const fallbackFromActs = async () => {
    const candidates = [
      `/api/act/list?status=${CARD_STATUSES}&limit=200&sort=-createdAt`,
    ];

    for (const path of candidates) {
      const url = `${base}${path}`;
      console.log("🛒[ShopContext] Fallback fetch acts:", { url });

      try {
        const res = await axios.get(url, {
          headers: { accept: "application/json" },
        });

        const data = res?.data || {};
        const arr = Array.isArray(data?.acts)
          ? data.acts
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];

        if (arr.length) {
          const cards = arr.map(buildCardFromAct);
          const allowTestActs = getAllowTestActs();
          const filtered = cards.filter((a) =>
            shouldIncludeActItem(a, { allowTestActs }),
          );

          setActCards(filtered);

          try {
            window.__TSC_ACTS__ = cards;
          } catch {}
          return;
        }
      } catch (err) {
        console.warn("⚠️[ShopContext] Fallback acts fetch failed:", {
          url,
          msg: err?.message,
        });
      }
    }

    setActCards([]);
  };

  try {
    const res = await axios.get(urlCards, {
      headers: { accept: "application/json" },
    });

    const arr = Array.isArray(res?.data?.acts) ? res.data.acts : [];

    const cards = arr.map((c) => {
      const imageUrl =
        c?.imageUrl ||
        (Array.isArray(c?.profileImage) && c.profileImage[0]?.url) ||
        c?.profileImage?.url ||
        (Array.isArray(c?.coverImage) && c.coverImage[0]?.url) ||
        c?.coverImage?.url ||
        (Array.isArray(c?.images) && c.images[0]?.url) ||
        c?.images?.[0]?.url ||
        "";

      return {
        ...c,
        actId: String(c?.actId || c?._id || ""),
        tscName: c?.tscName || c?.name || "",
        name: c?.name || "",
        slug: c?.slug || "",
        imageUrl,
        images:
          Array.isArray(c?.images) && c.images.length
            ? c.images
            : imageUrl
              ? [{ url: imageUrl }]
              : [],
        basePrice: Number.isFinite(Number(c?.basePrice))
          ? Number(c.basePrice)
          : null,
        availabilityBadge: c?.availabilityBadge || null,
        status: c?.status || "",
        genres: Array.isArray(c?.genres) ? c.genres : [],
        instruments: Array.isArray(c?.instruments) ? c.instruments : [],
        leadRole: c?.leadRole || "",
        vocalist: c?.vocalist || "",
        loveCount: Number(c?.loveCount ?? c?.numberOfShortlistsIn ?? 0) || 0,
        timesShortlisted: Number(c?.timesShortlisted || 0) || 0,
        numberOfShortlistsIn: Number(c?.numberOfShortlistsIn || 0) || 0,
        createdAt: c?.createdAt || null,
        minDisplayPrice: Number.isFinite(Number(c?.minDisplayPrice))
          ? Number(c.minDisplayPrice)
          : null,
        updatedAt: c?.updatedAt || null,
        bestseller: Boolean(c?.bestseller ?? c?.bestSeller),
      };
    });

    if (cards.length === 0) {
      await fallbackFromActs();
      return;
    }

    const allowTestActs = getAllowTestActs();
    const filtered = cards.filter((a) =>
      shouldIncludeActItem(a, { allowTestActs }),
    );

    setActCards(filtered);

    try {
      window.__TSC_ACTS__ = cards;
    } catch {}
  } catch (err) {
    console.warn("⚠️[ShopContext] fetchActsForGrid failed:", err?.message);
    await fallbackFromActs();
  }
}

useEffect(() => {
  console.log("🛒[CardFilterShopContext] Mount — backendUrl:", backendUrl);
  if (!backendUrl) {
    console.warn("⚠️[CardFilterShopContext] VITE_BACKEND_URL is missing; cannot fetch acts");
    setActCards([]);
    return;
  }
  // 👉 Fast cards for listing UIs
  getActCardsData().catch((e) => console.error("❌[CardFilterShopContext] getActCardsData threw:", e));
  // ⛔ Do not call getActsData() here; it will overwrite cards in grids.
}, [backendUrl]);

  // --- Availability map for selectedDate (tri-state: true / false / undefined) ---
  const [availableMap, setAvailableMap] = useState({});
  const [availLoading, setAvailLoading] = useState(false);

  // --- Location / date (synced with sessionStorage) ---
  const [selectedAddress, setSelectedAddress] = useState(
    sessionStorage.getItem("selectedAddress") || ""
  );
  const [selectedDate, setSelectedDate] = useState(
    sessionStorage.getItem("selectedDate") || ""
  );

  // Always build absolute API URLs
  const api = (path) =>
    `${backendUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const selectVocalistForAct = (actId, musicianId) => {
    setSelectedVocalists((prev) => ({
      ...prev,
      [actId]: musicianId,
    }));
  };

  const ensureLeadIncluded = useCallback((actId, leadId) => {
    setSelectedVocalists((prev) => {
      const s = new Set(toArray(prev?.[actId]));
      if (leadId) s.add(String(leadId));
      const after = Array.from(s);
      return { ...prev, [actId]: after };
    });
  }, []);

  const toggleVocalistForAct = useCallback((actId, musicianId) => {
    setSelectedVocalists((prev) => {
      const before = new Set(toArray(prev?.[actId]));
      if (before.has(String(musicianId))) before.delete(String(musicianId));
      else before.add(String(musicianId));
      const after = Array.from(before);
      return { ...prev, [actId]: after };
    });
  }, []);

  const getActById = async (actId) => {
    if (!actId) return null;
    const base = String(backendUrl || "").replace(/\/+$/, "");
    const candidates = [
      `${base}/api/act/${actId}`,
  
    ];

    for (const url of candidates) {
      try {
        const res = await axios.get(url, { headers: { accept: "application/json" } });
        const data = res?.data;
        const act = data?.act || data?.data || data?.result || data;
        if (act && typeof act === "object" && act._id) {
          return act;
        }
      } catch (err) {
        // try next
      }
    }
    console.warn("⚠️ getActById (CardFilterShopcontext): no act found via any endpoint", { actId });
    return null;
  };

  // Fetch + cache availability map for a given date (YYYY-MM-DD or ISO)
  const loadAvailabilityForDate = async (dateISO) => {
    const d = String(dateISO || "").slice(0, 10);
    if (!d) return;

    const cacheKey = `availMap:${d}`;

    // 1) Warm from cache if present (instant UI)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") setAvailableMap(parsed);
      }
    } catch {}

    // Helper to build tri-state map from various backend shapes
    const toMap = (payload = {}) => {
      const map = {};
      const unavailable = Array.isArray(payload.unavailableActIds)
        ? payload.unavailableActIds
        : [];
      const available = Array.isArray(payload.availableActIds)
        ? payload.availableActIds
        : [];
      const actIds = Array.isArray(payload.actIds) ? payload.actIds : [];

      unavailable.forEach((id) => {
        map[id] = false;
      });
      available.forEach((id) => {
        if (!(id in map)) map[id] = true;
      });

      // Compat: some endpoints only return actIds ⇒ treat as available
      if (!payload.unavailableActIds && actIds.length) {
        actIds.forEach((id) => {
          if (!(id in map)) map[id] = true;
        });
      }
      return map;
    };

    setAvailLoading(true);
    try {
      // 2) Try the canonical acts-by-date endpoint
      const url1 = api(
        `api/v2/availability/acts-by-dateV2?date=${encodeURIComponent(d)}`
      );
      let res = await fetch(url1, { headers: { accept: "application/json" } });
      let text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {}

      // 3) If missing (404) or not OK, attempt fallback to acts-available
      if (!res.ok) {
        if (res.status === 404) {
          const url2 = api(
            `api/availability/acts-available?date=${encodeURIComponent(d)}`
          );
          res = await fetch(url2, { headers: { accept: "application/json" } });
          text = await res.text();
          try {
            data = text ? JSON.parse(text) : {};
          } catch {}
        }
        if (!res.ok) {
          const msg =
            data?.message || data?.error || text || `HTTP ${res.status}`;
          throw new Error(msg);
        }
      }

      const map = toMap(data);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(map));
      } catch {}
      setAvailableMap(map);
    } catch (e) {
      console.warn("[avail] load failed:", e?.message || e);
      // Keep any cached UI; don't overwrite with empty on error
    } finally {
      setAvailLoading(false);
    }
  };

  // Re-load when date changes
  useEffect(() => {
    if (selectedDate) loadAvailabilityForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Convenience helpers for components
  const isActUnavailableForSelectedDate = (actId) =>
    !!selectedDate && availableMap[String(actId)] === false;
  const isActAvailableForSelectedDate = (actId) =>
    !!selectedDate && availableMap[String(actId)] === true;

  // ---- Availability (lead/deputy) driven by SSE ----
  const [availabilityStatus, setAvailabilityStatus] = useState({});
  // shape: { [actId]: { status: 'lead' | 'deputy', musicianName, dateISO, message } }

  // Cooldown map for global auto-trigger (per actId:dateISO)
  const lastAutoTriggerRef = useRef({});

  const formatShortDate = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // --- State container kept for compatibility with callers in your app ---
  const [state, setState] = useState({
    selectedExtras: [],
    selectedAddress: selectedAddress || "",
    selectedDate: selectedDate || "",
    shortlistItems: {},
  });

  // Normalise various list payload shapes into an array of acts
  const coerceActsArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    // common nests
    if (Array.isArray(payload.acts)) return payload.acts;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.docs)) return payload.docs;
    if (Array.isArray(payload.items)) return payload.items;

    // nested under acts: { docs/items }
    if (payload.acts && typeof payload.acts === "object") {
      if (Array.isArray(payload.acts.docs)) return payload.acts.docs;
      if (Array.isArray(payload.acts.items)) return payload.acts.items;
    }

    return [];
  };

  // Pick the smallest lineup for a quick "from" price
  const pickSmallestLineup = (act) => {
    try {
      if (!act || !Array.isArray(act.lineups) || !act.lineups.length) return null;
      const parseSize = (s) => {
        if (!s) return Infinity;
        const m = String(s).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : Infinity;
      };
      const scored = act.lineups.map((l, i) => ({
        l,
        n: Number.isFinite(parseSize(l?.act_size || l?.actSize))
          ? parseSize(l?.act_size || l?.actSize)
          : (Array.isArray(l?.bandMembers) ? l.bandMembers.length : 9999),
        i,
      }));
      scored.sort((a, b) => a.n - b.n || a.i - b.i);
      return scored[0]?.l || act.lineups[0];
    } catch {
      return Array.isArray(act?.lineups) ? act.lineups[0] : null;
    }
  };

  // ============ Grid cards (fast) ============
async function getActCardsData() {
  const base = String(backendUrl || "").replace(/\/+$/, "");
  const url = `${base}/api/act/cards?status=${CARD_STATUSES}&sort=-createdAt&limit=200`;
  console.log("🛒[ShopContext] Fetching act cards:", url);

  try {
    const res = await axios.get(url, {
      headers: { accept: "application/json" },
    });

    const arr = Array.isArray(res?.data?.acts) ? res.data.acts : [];

    const normalized = arr.map((a) => {
      const imageUrl =
        a?.imageUrl ||
        (Array.isArray(a?.profileImage) && a.profileImage[0]?.url) ||
        a?.profileImage?.url ||
        (Array.isArray(a?.coverImage) && a.coverImage[0]?.url) ||
        a?.coverImage?.url ||
        (Array.isArray(a?.images) && a.images[0]?.url) ||
        a?.images?.[0]?.url ||
        "";

      return {
        ...a,
        actId: String(a?.actId || a?._id || a?.id || ""),
        tscName: a?.tscName || a?.name || "",
        name: a?.name || a?.tscName || "",
        slug: a?.slug || "",
        imageUrl,
        images:
          Array.isArray(a?.images) && a.images.length
            ? a.images
            : imageUrl
              ? [{ url: imageUrl }]
              : [],
        basePrice: Number.isFinite(Number(a?.basePrice))
          ? Number(a.basePrice)
          : null,
        minDisplayPrice: Number.isFinite(Number(a?.minDisplayPrice))
          ? Number(a.minDisplayPrice)
          : null,
        loveCount: Number(a?.loveCount ?? a?.numberOfShortlistsIn ?? 0) || 0,
        timesShortlisted: Number(a?.timesShortlisted || 0) || 0,
        numberOfShortlistsIn: Number(a?.numberOfShortlistsIn || 0) || 0,
      };
    });
   
      // Be conservative: match common “test” prefixes without blocking legit names
  const TEST_NAME_RE = /^(test|demo)\b|^\s*(test|demo)\s*[-–—]/i;

  const isTestLike = (item = {}) => {
    // explicit flags from backend/card payloads
    const raw = item?.isTest;
    const flag = raw === true || raw === "true" || raw === 1 || raw === "1";

    // name-based fallback
    const name = String(item?.tscName || item?.name || "").trim();

    return flag || TEST_NAME_RE.test(name);
  };

    const CARD_STATUSES = "approved,live,approved_changes_pending";


   const ALLOWED_STATUSES_SET = new Set(
    String(CARD_STATUSES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const statusOk = (act = {}) => {
    const st = String(act?.status || "").trim();
    return ALLOWED_STATUSES_SET.size === 0 || ALLOWED_STATUSES_SET.has(st);
  };

  const AGENT_OVERRIDE_IDS = new Set(["680fb453a2de6618675ca9ed"]);

    
  const canSeeTestActs = (user) => {
    const id = String(user?._id || user?.id || "");
    const role = String(user?.role || "");

    return role === "agent" || AGENT_OVERRIDE_IDS.has(id);
  };

  const shouldIncludeActItem = (act, opts) => {
    const allowTestActs = !!(
      opts &&
      typeof opts === "object" &&
      opts.allowTestActs
    );

    // agents can see everything (including test/demo + any statuses)
    if (allowTestActs) return true;

    // normal users: must be in allowed statuses AND not test-like
    return statusOk(act) && !isTestLike(act);
  };

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

    const getAllowTestActs = () => canSeeTestActs(getStoredUser());


    const allowTestActs = getAllowTestActs();
    const filtered = normalized.filter((a) =>
      shouldIncludeActItem(a, { allowTestActs }),
    );

    setActCards(filtered);

    try {
      window.__TSC_ACT_CARDS__ = normalized;
    } catch {}
  } catch (err) {
    console.warn("⚠️[ShopContext] fetch act cards failed:", err?.message);
    setActCards([]);
  }
}



  // Compute a "from" price with travel on demand for a card when it's on screen
  const getCardPriceWithTravel = async (actId) => {
    try {
      if (!actId) return null;
      if (!selectedDate || !selectedAddress) return null; // need both
      const act = await getActById(actId);
      if (!act) return null;
      const lineup = pickSmallestLineup(act);
      if (!lineup) return null;

      const county = selectedAddress?.split(",").slice(-2)[0]?.trim() || "";
      const result = await calculateActPricing(
        act,
        county,
        selectedAddress,
        selectedDate,
        lineup
      );
      const total = Number(result?.total || 0);
      return Number.isFinite(total) ? Math.ceil(total) : null;
    } catch (e) {
      console.warn("⚠️[CardFilterShopContext] getCardPriceWithTravel failed:", e?.message || e);
      return null;
    }
  };

  // ============ Data loaders ============
  const getActsData = async () => {
    const base = String(backendUrl || "").replace(/\/+$/, "");

    // Try several endpoints & query variants
    const candidates = [
      "/api/act/list",
      
      "/api/act/list?status=live",
     
      "/api/v2/acts/list",
      "/api/actV2/list",
      "/api/v2/act/list",
      // some backends expose un-paginated or different names
      "/api/act/all",
  
    ];

    for (const path of candidates) {
      const url = `${base}${path}`;
      console.log("🛒[CardFilterShopContext] Fetching acts:", { url });
      try {
        const res = await axios.get(url, { headers: { accept: "application/json" } });
        const data = res?.data;

        // Log keys for shape discovery
        console.log("🛒[CardFilterShopContext] Raw list payload keys:", Object.keys(data || {}));

        const actsArr = coerceActsArray(data);
        const meta = data?.meta || data?.pagination || data?.acts || {};
        const hintedTotal = meta?.total || meta?.totalDocs || data?.total || data?.count || actsArr.length;

        console.log("🛒[CardFilterShopContext] Acts response:", {
          status: res.status,
          success: data?.success,
          count: actsArr.length,
          hintedTotal,
          sampleId: actsArr?.[0]?._id,
          sampleName: actsArr?.[0]?.tscName || actsArr?.[0]?.name,
          sampleLineupsType: Array.isArray(actsArr?.[0]?.lineups) ? "array" : typeof actsArr?.[0]?.lineups,
        });

        if (actsArr.length > 0) {
          // newest first by createdAt/updatedAt
          const sorted = [...actsArr].sort((a, b) => {
            const at = new Date(a.createdAt || a.updatedAt || 0).getTime();
            const bt = new Date(b.createdAt || b.updatedAt || 0).getTime();
            return bt - at;
          });
          setActs(sorted);
          try { window.__TSC_ACTS__ = sorted; } catch {}
          return; // ✅ success
        }

        // If server says there should be data (hintedTotal > 0) but our parser found none,
        // stash raw for inspection and keep trying alternates.
        if ((hintedTotal || 0) > 0) {
          try { window.__TSC_ACTS_RAW__ = data; } catch {}
          console.warn("⚠️[CardFilterShopContext] list response hinted non-zero total but no parsed acts; trying next endpoint");
        }
      } catch (err) {
        const status = err?.response?.status;
        const body = err?.response?.data;
        console.warn("⚠️[CardFilterShopContext] Acts fetch failed:", { url, status, body, msg: err?.message });
        // try next candidate…
      }
    }

    // If all candidates fail or return empty
    console.error("❌[CardFilterShopContext] Could not load acts from any known endpoint.", { backendUrl });
    try { window.__TSC_ACTS_FAILED__ = { backendUrl }; } catch {}
    setActs([]);
  };



  // Log any updates to acts for quick visibility
  useEffect(() => {
    console.log("🛒[CardFilterShopContext] acts updated:", {
      length: Array.isArray(acts) ? acts.length : "non-array",
      first: acts?.[0]?._id,
      firstName: acts?.[0]?.tscName || acts?.[0]?.name,
      firstHasLineups: Array.isArray(acts?.[0]?.lineups),
    });
  }, [acts]);

  // Log actCards updates
  useEffect(() => {
    console.log("🛒[CardFilterShopContext] actCards updated:", {
      length: Array.isArray(actCards) ? actCards.length : "non-array",
      first: actCards?.[0]?.actId,
      firstName: actCards?.[0]?.tscName || actCards?.[0]?.name,
    });
  }, [actCards]);

  // 🧩 Bridge for legacy list UIs that still read `acts`:
  // If we have cards but `acts` is empty, project minimal act objects so pages render.
  useEffect(() => {
    if (Array.isArray(actCards) && actCards.length && (!Array.isArray(acts) || acts.length === 0)) {
      const minimalActs = actCards.map((c) => ({
        _id: String(c.actId || c._id || ""),
        actId: String(c.actId || c._id || ""),
        tscName: c.tscName || c.name || "",
        name: c.name || "",
        slug: c.slug || "",
        images: c.imageUrl ? [{ url: c.imageUrl }] : [],
        status: c.status || "",
        lineups: [], // grid pages don't require full lineups
      }));
      setActs(minimalActs);
    }
  }, [actCards]); // only populate when cards arrive and acts is empty


  // Try to refresh one act (used after SSE inbound). If single-act endpoint is missing,
  // we fall back to reloading the list.
  const refreshActById = async (actId) => {
    if (!actId) return;
    try {
      const r = await axios.get(`${backendUrl}/api/act/${actId}`);
      if (r.data?.success && r.data?.act) {
      setActs((prev) => {
  const idx = Array.isArray(prev)
    ? prev.findIndex((a) => String(a?._id || a?.actId) === String(actId))
    : -1;
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = r.data.act; // promote to full doc
    return next;
  }
  return [r.data.act, ...(Array.isArray(prev) ? prev : [])];
});
        return;
      }
    } catch {
      // ignore and try list
    }
    try {
      await getActsData();
    } catch {
      // swallow
    }
  };



  // ✅ Hydrate logged-in user + shortlist once
  useEffect(() => {
    (async () => {
      try {
        const storedUserRaw = localStorage.getItem("user");
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;

        if (storedUser?._id) {
          setUserId(storedUser._id);
          const res = await axios.get(
            `${backendUrl}/api/availability/user/${storedUser._id}/shortlisted`
          );
          const ids = (res.data?.acts || []).map((a) => String(a._id));
          setShortlistedActs(ids);
          setShortlistItems(ids);
          localStorage.setItem("shortlistItems", JSON.stringify(ids));
        }
      } catch (err) {}
    })();
  }, [backendUrl]);

  // 🧷 Persist shortlist locally whenever it changes (mirrors the cart pattern)
  useEffect(() => {
    try {
      localStorage.setItem("shortlistItems", JSON.stringify(shortlistedActs));
    } catch {}
  }, [shortlistedActs]);

  // Mirror shortlistItems to always track shortlistedActs
  useEffect(() => {
    setShortlistItems(shortlistedActs);
  }, [shortlistedActs]);

  // ✅ After login, resume any pending "Add to Cart" action we saved pre-login
  useEffect(() => {
    (async () => {
      try {
        const raw = sessionStorage.getItem("pendingCartPayload");
        const storedUserRaw = localStorage.getItem("user");
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
        const uid = storedUser?._id || userId;
        if (!raw || !uid) return;

        // Clear first to avoid re-entry loops
        sessionStorage.removeItem("pendingCartPayload");

        let p = {};
        try {
          p = JSON.parse(raw) || {};
        } catch {}
        if (!p?.actId || !p?.lineupId) return;

        await addToCart(
          p.actId,
          p.lineupId,
          Array.isArray(p.selectedExtras) ? p.selectedExtras : [],
          Array.isArray(p.selectedAfternoonSets) ? p.selectedAfternoonSets : [],
          Array.isArray(p.songSuggestions) ? p.songSuggestions : []
        );

        try {
          toast(
            <CustomToast type="success" message="Act added to your cart." />
          );
        } catch {}
      } catch {}
    })();
  }, [userId]);

  // Keep sessionStorage in sync for date/address
  useEffect(() => {
    if (selectedDate) {
      sessionStorage.setItem("selectedDate", selectedDate);
      setState((s) => ({ ...s, selectedDate }));
    }
  }, [selectedDate]);
  useEffect(() => {
    if (selectedAddress) {
      sessionStorage.setItem("selectedAddress", selectedAddress);
      setState((s) => ({ ...s, selectedAddress }));
    }
  }, [selectedAddress]);

  // inside ShopProvider, near other cart helpers
  const updatePerformance = (actId, lineupId, patch) => {
    setCartItems((prev) => {
      const next = structuredClone(prev || {});
      if (!next[actId] || !next[actId][lineupId]) return prev; // nothing to update

      const current = next[actId][lineupId].performance || {
        arrivalTime: "",
        setupAndSoundcheckedBy: "",
        startTime: "",
        finishTime: "",
        finishDayOffset: 0,
        paLightsFinishTime: "",
        paLightsFinishDayOffset: 0,
      };
      next[actId][lineupId].performance = { ...current, ...patch };
      return next;
    });
  };

  // ============ Availability helpers ============

  // Gate by act name — only allow specific acts
const isActAllowed = (actId) => {
  const idStr = String(actId);
  const item =
    (Array.isArray(acts) ? acts.find((a) => String(a?._id || a?.actId) === idStr) : null) ||
    (Array.isArray(actCards) ? actCards.find((a) => String(a?._id || a?.actId) === idStr) : null);
  const name = item?.tscName || item?.name || "";
  return ALLOWED_ACT_NAMES.has(name);
};

  // Compute vocalist-specific “fee” for messaging (optional/nice-to-have)
  const computeVocalistFeeForMessage = async ({
    act,
    lineup,
    address,
    date,
  }) => {
    try {
      // members & base per-head
      const members = Array.isArray(lineup?.bandMembers)
        ? lineup.bandMembers
        : [];
      const lineupTotal =
        Number(lineup?.base_fee?.[0]?.total_fee) ||
        Number(act?.base_fee?.[0]?.total_fee) ||
        0;
      const perHead = members.length > 0 ? lineupTotal / members.length : 0;

      // try a basic travel component (very light touch; your pricing util can be heavier)
      // we won’t overfit here—this is just for the message number
      const vocalist =
        members.find((m) =>
          [
            "Lead Male Vocal",
            "Lead Female Vocal",
            "Lead Vocal",
            "vocalist-guitarist",
          ].includes(m.instrument)
        ) || members[0];

      let travelFee = 0;
      if (vocalist?.postCode && act?.costPerMile > 0 && address) {
        // We can omit the distance API for now to avoid extra latency — per your current code you often fallback.
        // travelFee stays 0 (or you can add a fixed heuristic if you prefer)
      }
      const fee = Math.ceil(Math.max(0, perHead + travelFee));
      return fee > 0 ? String(fee) : null;
    } catch {
      return null;
    }
  };

  // Deduped availability trigger
  const requestVocalistAvailability = (() => {
    // Persistent cache across renders
    const inFlight = new Map();

    return async ({ actId, lineupId }) => {
      try {
        if (!selectedDate || !selectedAddress) return;
        if (!isActAllowed(actId)) return;

        // Create a unique key for the current request
        const dateKey = new Date(selectedDate).toISOString().slice(0, 10);
        const key = `${actId}:${lineupId || "none"}:${dateKey}`;

        // Guard: if a request for this combo is already in flight or was just sent, skip
        const existing = inFlight.get(key);
        if (existing && Date.now() - existing < 8000) {
          return;
        }

        // Mark as in-flight
        inFlight.set(key, Date.now());

        // Compose payload
        const payload = {
          actId: String(actId),
          lineupId: lineupId != null ? String(lineupId) : null,
          date: dateKey,
          address: String(selectedAddress),
          userId,
        };

        // Make the API call
        const base = String(backendUrl || "").replace(/\/+$/, "");
        const url = `${base}/api/availability/request`;
        await axios.post(url, payload, {
          headers: { accept: "application/json" },
          timeout: 15000,
        });
      } catch (err) {
        console.warn(
          "⚠️ requestVocalistAvailability failed:",
          err?.message || err
        );
      }
    };
  })();

  // 🔁 Global AUTO-TRIGGER: when user adds date+address AFTER shortlisting,
  // ping availability for ALL shortlisted acts (with 6h per-act cooldown).
  useEffect(() => {
    (async () => {
      try {
        if (!selectedDate || !selectedAddress) return;
        const shortlistIds = Array.isArray(shortlistedActs)
          ? shortlistedActs
          : [];
        if (!shortlistIds.length) return;

        const dateISO = new Date(selectedDate).toISOString().slice(0, 10);

        for (const actId of shortlistIds) {
          if (!actId) continue;
          if (!isActAllowed(actId)) continue;

          const key = `${actId}:${dateISO}`;
          const now = Date.now();
          const last = lastAutoTriggerRef.current[key] || 0;
          // 6 hours
          if (now - last < 6 * 60 * 60 * 1000) continue;

          try {
            // ✅ Skip if already YES recorded (call absolute backend URL)
            const res = await fetch(
              api(
                `api/availability/check-latest?actId=${encodeURIComponent(actId)}&dateISO=${encodeURIComponent(dateISO)}`
              ),
              { headers: { accept: "application/json" } }
            );
            const text = await res.text();
            let j = {};
            try {
              j = text ? JSON.parse(text) : {};
            } catch {}
            if (res.ok && j?.latestReply === "yes") continue;

            lastAutoTriggerRef.current[key] = now;
          } catch (e) {
            // swallow per design
          }
        }
      } catch (e) {
        // swallow
      }
    })();
  }, [selectedDate, selectedAddress, shortlistedActs, backendUrl]);

  // 🔌 SSE subscription: update toast + force-refresh act to pull fresh badge/photo
  useEffect(() => {
    let sse;
    // 🔒 Deduplicate identical toasts (e.g., legacy "availability_yes" + "leadYes")
    const recentToastKeys = new Map();
    // ⏳ Delay single-token lead names to "prefer" the richer (first+last) event
    const pendingLeadTimers = new Map(); // key: `${actId}|${dateISO}` → timeoutId

    const buildDedupeKey = (normalizedType, p) => {
      // For LEAD: key only by act+date so double-emits (different musicianName shapes) collapse.
      if (normalizedType === "leadYes") {
        return ["leadYes", p?.actId || "", p?.dateISO || ""].join("|");
      }
      // For DEPUTY: keep musician in the key so multiple deputies can each toast.
      return [
        normalizedType,
        p?.actId || "",
        (p?.musicianId || p?.musicianName || "").toString(),
        p?.dateISO || "",
      ].join("|");
    };

    const shouldToast = (normalizedType, p) => {
      try {
        const k = buildDedupeKey(normalizedType, p);
        const now = Date.now();
        const last = recentToastKeys.get(k) || 0;
        if (now - last < 5000) return false; // 5s hold-off window
        recentToastKeys.set(k, now);
        return true;
      } catch {
        return true;
      }
    };
    // put this near the top of the useEffect, before sse.addEventListener("message", …)
    const shortDisplayName = (full) => {
      if (!full) return "";
      const cleaned = String(full).trim().replace(/\s+/g, " ");
      const parts = cleaned.split(" ");
      if (parts.length === 1) return parts[0]; // mononym
      const first = parts[0];
      // last token, strip non-letters but keep hyphen/apostrophe edge cases
      const last = parts[parts.length - 1].replace(/[^A-Za-zÀ-ÿ'-]/g, "");
      const initial = last ? last[0].toUpperCase() : "";
      return initial ? `${first} ${initial}` : first;
    };
    try {
      const url = api("api/availability/subscribe");
      sse = new EventSource(url);

      console.log("🔌 [SSE] Initialized:", url);

      /* -------------------------------------------------------------------------- */
      /* 🔵 Open                                                                    */
      /* -------------------------------------------------------------------------- */
      sse.addEventListener("open", () => {
        console.log("📡 [SSE] Connection established");
      });

      /* -------------------------------------------------------------------------- */
      /* 📨 Message received                                                        */
      /* -------------------------------------------------------------------------- */
      sse.addEventListener("message", async (evt) => {
        if (!evt?.data) {
          console.log("⚪ [SSE] Empty message event received");
          return;
        }

        let payload = null;
        try {
          payload = JSON.parse(evt.data);
        } catch (err) {
          console.warn("⚠️ [SSE] JSON parse failed:", err, evt.data);
          return;
        }

        console.log("📨 [SSE] RAW PAYLOAD:", payload);

        if (!payload?.actId) {
          console.log("⚪ [SSE] Ignored payload (no actId)", payload);
          return;
        }

        /* ---------------------------------------------------------------------- */
        /* 🟦 AVAILABILITY_BADGE_UPDATED (slot-based badge)                        */
        /* ---------------------------------------------------------------------- */
        if (payload.type === "availability_badge_updated") {
          const badge = payload.badge;

          // ✅ Check if ANY slot contains a real singer before doing anything
          const slotHasValidSinger = badge?.slots?.some(
            (s) => s.musicianId && s.photoUrl?.startsWith("http")
          );

          if (!slotHasValidSinger) {
            return;
          }

          // 🔬 Deep slot-level debugging
          if (badge?.slots?.length) {
            badge.slots.forEach((s) => {});
          } else {
            console.warn(
              "🧹 [SSE] ❌ No slots[] array found in badge broadcast"
            );
          }

          /* --------------------------------------------- */
          /* ♻️ Refresh Act                                 */
          /* --------------------------------------------- */
          await refreshActById(payload.actId);

          return; // ✅ done handling badge update
        }

        /* ---------------------------------------------------------------------- */
        /* 🟩 NORMAL YES EVENTS (lead or deputy)                                   */
        /* ---------------------------------------------------------------------- */
        const normalizedType =
          payload.type === "availability_yes" ? "leadYes" : payload.type;

        const isLead = normalizedType === "leadYes";

        const isDeputy =
          normalizedType === "availability_deputy_yes" ||
          payload.isDeputy === true;

        const shortDate = formatShortDate(payload.dateISO);
        const nameForToast =
          shortDisplayName(payload.musicianName) ||
          (isDeputy ? "Deputy" : "Lead vocalist");
        const toastMsg = isDeputy
          ? `${nameForToast} is available to perform with ${payload.actName} on ${shortDate}.`
          : `${nameForToast} from ${payload.actName} is available for ${shortDate}.`;

        // Helpers for lead: prefer richer "first + last initial" over bare first-name
        const keyLead = `${payload?.actId || ""}|${payload?.dateISO || ""}`;
        const hasSurname = /\s/.test(String(payload?.musicianName || ""));

        const pushToast = () => {
          if (normalizedType === "leadYes") {
            if (shouldToast("leadYes", payload)) {
              toast(<CustomToast type="success" message={toastMsg} />);
            }
          } else if (normalizedType === "availability_deputy_yes") {
            if (shouldToast("availability_deputy_yes", payload)) {
              toast(<CustomToast type="success" message={toastMsg} />);
            }
          }
        };

        if (normalizedType === "leadYes") {
          if (hasSurname) {
            // ✅ Prefer this richer event: cancel any pending bare-first timer, then toast.
            const t = pendingLeadTimers.get(keyLead);
            if (t) {
              clearTimeout(t);
              pendingLeadTimers.delete(keyLead);
            }
            pushToast();
          } else {
            // ⏳ Bare first name — queue briefly in case a richer one lands shortly.
            if (!pendingLeadTimers.has(keyLead)) {
              const t = setTimeout(() => {
                pendingLeadTimers.delete(keyLead);
                pushToast();
              }, 600);
              pendingLeadTimers.set(keyLead, t);
            }
          }
        } else if (normalizedType === "availability_deputy_yes") {
          // Deputies toast immediately (deduped by musician)
          pushToast();
        }

        await refreshActById(payload.actId);
      });

      /* -------------------------------------------------------------------------- */
      /* ❌ Error                                                                    */
      /* -------------------------------------------------------------------------- */
      sse.addEventListener("error", (err) => {
        console.warn("❌ [SSE] ERROR:", err);
      });
    } catch (e) {
      console.error("❌ [SSE] Initialization FAILED:", e);
    }

    return () => {
      // 🧹 Clear any pending lead timers
      try {
        pendingLeadTimers.forEach((t) => clearTimeout(t));
        pendingLeadTimers.clear();
      } catch {}
      if (sse) {
        sse.close();
      }
    };
  }, []); // ✅ run once on mount

  // --- Auto-sync backend when both date + address are present ---
  const handleDateOrAddressChange = debounce(async (actId) => {
    try {
      if (!selectedDate || !selectedAddress || !userId) return;

      const dateISO = new Date(selectedDate).toISOString().slice(0, 10);
      console.log(
        "📅 [CardFilterShopContext] Updating shortlist with date + address...",
        {
          actId,
          dateISO,
          selectedAddress,
          userId,
        }
      );

      await fetch(`${backendUrl}/api/shortlist/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actId,
          dateISO,
          formattedAddress: selectedAddress,
          userId,
        }),
      });
    } catch (err) {
      console.warn("⚠️ [CardFilterShopContext] Failed to update shortlist:", err.message);
    }
  }, 1000);

  // --- Trigger when both date & address exist ---
  useEffect(() => {
    if (!selectedDate || !selectedAddress) return;
    const dateISO = new Date(selectedDate).toISOString().slice(0, 10);
    shortlistedActs.forEach((actId) => {
      handleDateOrAddressChange(actId, dateISO);
    });
  }, [selectedDate, selectedAddress]);

  // ============ Shortlist helpers ============

  // Public helper to refresh shortlist from backend
  const fetchShortlistedActs = async (uid) => {
    try {
      const u = uid || userId;
      if (!u) return;
      const res = await axios.get(
        `${backendUrl}/api/availability/user/${u}/shortlisted`
      );
      if (res.data.success) {
        const ids = (res.data.acts || []).map((a) => String(a._id));
        setShortlistedActs(ids);
        setShortlistItems(ids);
        localStorage.setItem("shortlistItems", JSON.stringify(ids));
      }
    } catch (err) {}
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Small helper: nudge user to log in and remember where they were
  const promptLogin = (
    msg = "Please log in to save acts to your shortlist.",
    actId = null,
    actName = null
  ) => {
    try {
      toast(<CustomToast type="info" message={msg} />);
    } catch {}

    const next = `${location.pathname}${location.search || ""}`;
    sessionStorage.setItem("postLoginNext", next);

    // 🪄 Store act info so we can auto-add and show act name in toast after login
    if (actId) {
      sessionStorage.setItem("pendingShortlistActId", actId);
      if (actName) sessionStorage.setItem("pendingShortlistActName", actName);
    }

    window.dispatchEvent(new CustomEvent("tsc:auth_gate", { detail: { msg: "..." } }));
  };

  // Add to shortlist (uses toggle route + triggers availability if date/address present)
  const addToShortlist = async (itemId, selectedLineup) => {
    // keep signature for callers, but route through shortlistAct (toggle)
    const storedUserRaw = localStorage.getItem("user");
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    const u = storedUser?._id || userId;
    if (!u) {
      promptLogin("Please log in to save acts to your shortlist.");
      return;
    }
    await shortlistAct(u, String(itemId));
  };

  // ✅ Toggle shortlist via PATCH routes with optimistic UI
 const shortlistAct = async (uid, actId) => {

    const storedUserRaw = localStorage.getItem("user");
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    const userId = uid || storedUser?._id; // ✅ consistent naming

    if (!actId) return;

    // ✅ Only consider date/address if user actually provided BOTH (no placeholders)
    const hasDate = !!selectedDate;
    const hasAddress = !!(selectedAddress && String(selectedAddress).trim());

    const selectedDateFinal = hasDate
      ? new Date(selectedDate).toISOString().slice(0, 10)
      : null;
    const selectedAddressFinal = hasAddress ? String(selectedAddress).trim() : null;

    // Build payload WITHOUT placeholder date/address to avoid accidental availability triggers
    const clientPayload = {
      userId,
      clientEmail: storedUser?.email || "",
      clientName:
        storedUser?.firstName || storedUser?.name || storedUser?.surname || "",
    };
    if (selectedDateFinal && selectedAddressFinal) {
      clientPayload.selectedDate = selectedDateFinal;
      clientPayload.selectedAddress = selectedAddressFinal;
    }

    if (!userId) {
      promptLogin("Please log in to manage your shortlist.");
      return;
    }

    const idStr = String(actId);
    const isShortlistedNow =
      Array.isArray(shortlistedActs) && shortlistedActs.includes(idStr);

    // ⚡ Optimistic update
    const prev = Array.isArray(shortlistedActs) ? [...shortlistedActs] : [];
    const next = isShortlistedNow
      ? prev.filter((id) => id !== idStr)
      : [...new Set([...prev, idStr])];

    setShortlistedActs(next);
    setShortlistItems(next);
    try {
      localStorage.setItem("shortlistItems", JSON.stringify(next));
    } catch {}

    try {
      if (isShortlistedNow) {
        // 🔵 Removing from shortlist
        await axios.patch(
          `${backendUrl}/api/availability/act/${idStr}/decrement-shortlist`,
          clientPayload
        );
      } else {
        // 🟢 Adding to shortlist
        await axios.patch(
          `${backendUrl}/api/availability/act/${idStr}/increment-shortlist`,
          clientPayload
        );

        // 🩵 Only sync date/address (and any downstream availability) when BOTH are present
        if (selectedDateFinal && selectedAddressFinal && isActAllowed(idStr)) {
          await axios.patch(`${backendUrl}/api/shortlist/update`, {
            actId: idStr,
            dateISO: selectedDateFinal,
            formattedAddress: selectedAddressFinal,
            ...clientPayload,
          });
        }
      }
    } catch (err) {
      console.error("❌ shortlistAct error:", err.message);

      // 🔁 Revert on failure
      setShortlistedActs(prev);
      setShortlistItems(prev);
      try {
        localStorage.setItem("shortlistItems", JSON.stringify(prev));
      } catch {}
      try {
        toast(
          <CustomToast type="error" message="Could not update shortlist." />
        );
      } catch {}
    }
  };

  // ============ Invoicing helpers ============
  const computeBalanceDueDate = (eventISO) => {
    try {
      if (!eventISO) return null;
      const d = new Date(eventISO);
      if (Number.isNaN(d.getTime())) return null;
      d.setDate(d.getDate() - 14);
      // Normalise to 00:00 local time
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    } catch {
      return null;
    }
  };

  /**
   * Schedule a balance invoice (due 14 days before the event) and set up reminders.
   * The backend endpoint should:
   *  - create/update an invoice in DB with status="scheduled" and dueDate
   *  - create reminder jobs (e.g. 7d and 3d before due date + on due date)
   *  - optionally create a Stripe Invoice (draft) tied to a Customer and send at reminder time
   */
  const scheduleBalanceInvoice = async ({
    bookingId,
    actId,
    customerId, // Stripe customer id or your internal id
    eventDateISO, // event date (ISO)
    currency = "GBP",
    amountPence, // integer in pence for the remaining balance
    metadata = {},
  }) => {
    try {
      if (!bookingId || !eventDateISO || !amountPence) {
        return { success: false, error: "missing_fields" };
      }

      const dueAtISO = computeBalanceDueDate(eventDateISO);
      const payload = {
        bookingId,
        actId,
        customerId,
        currency,
        amountPence,
        eventDateISO,
        dueAtISO,
        metadata,
      };

      const res = await axios.post(
        `${backendUrl}/api/invoices/schedule-balance`,
        payload
      );
      return res.data || { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "request_failed" };
    }
  };

  // ============ Cart helpers ============

  const removeFromCart = (actId, lineupId) => {
    const updated = structuredClone(cartItems);

    if (updated[actId]) {
      delete updated[actId][lineupId];
      if (Object.keys(updated[actId]).length === 0) {
        delete updated[actId]; // if no lineups left, remove act
      }
    }

    setCartItems(updated);
  };

  // Accepts: actId, lineupId, selectedExtras, selectedAfternoonSets, songSuggestions
  const addToCart = async (
    actId,
    lineupId,
    selectedExtras = [],
    selectedAfternoonSets = [],
    songSuggestions = []
  ) => {
    if (!actId || !lineupId) {
      return;
    }
    const actKey = String(actId);
    const lineupKey = String(lineupId);

    // Normalize inputs: accept a single object or an array
    const extrasInput = Array.isArray(selectedExtras)
      ? selectedExtras.filter(Boolean)
      : selectedExtras
        ? [selectedExtras]
        : [];

    const afternoonInput = Array.isArray(selectedAfternoonSets)
      ? selectedAfternoonSets.filter(Boolean)
      : selectedAfternoonSets
        ? [selectedAfternoonSets]
        : [];

    const suggestionsInput = Array.isArray(songSuggestions)
      ? songSuggestions.filter(Boolean)
      : songSuggestions
        ? [songSuggestions]
        : [];

    // Split extras vs ceremony/afternoon sets
    const allSelectedExtras = [];
    const allAfternoonSets = [];
    extrasInput.forEach((item) => {
      if (["ceremony", "afternoon", "both"].includes(item?.type)) {
        allAfternoonSets.push(item);
      } else {
        allSelectedExtras.push(item);
      }
    });

    // 🔐 Require login to proceed; save pending payload and redirect to login
    const storedUserRaw = localStorage.getItem("user");
    const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    const uid = storedUser?._id || userId;
    if (!uid) {
      try {
        const pending = {
          actId: actKey,
          lineupId: lineupKey,
          selectedExtras: allSelectedExtras.length
            ? allSelectedExtras
            : extrasInput,
          selectedAfternoonSets: [...afternoonInput, ...allAfternoonSets],
          songSuggestions: suggestionsInput,
        };
        sessionStorage.setItem("pendingCartPayload", JSON.stringify(pending));
      } catch {}
      promptLogin(
        "Please log in to add this act to your cart and get availability updates.",
        actKey,
        null
      );
      return;
    }

    // Clone cart
    const updated = structuredClone(cartItems || {});
    // single-lineup-per-act model: clear existing
    if (updated[actKey]) {
      delete updated[actKey];
    }

    updated[actKey] = {
      [lineupKey]: {
        quantity: 1,
        selectedExtras: allSelectedExtras,
        selectedAfternoonSets: [...afternoonInput, ...allAfternoonSets],
        songSuggestions: suggestionsInput,
        dismissedExtras: [],
        performance: {
          arrivalTime: "",
          setupAndSoundcheckedBy: "",
          startTime: "",
          finishTime: "",
          finishDayOffset: 0,
          paLightsFinishTime: "",
          paLightsFinishDayOffset: 0,
        },
      },
    };

    setCartItems(updated);

    // Trigger availability (gated) if we have date+address and the act is allowed
    if (selectedDate && selectedAddress && isActAllowed(actKey)) {
      requestVocalistAvailability({ actId: actKey, lineupId: lineupKey });
    }

    // Optional: sync cart to backend
    if (token) {
      try {
        await axios.post(
          `${backendUrl}/api/cart/add`,
          {
            actId: actKey,
            lineupId: lineupKey,
            selectedExtras: allSelectedExtras,
            selectedAfternoonSets: [...afternoonInput, ...allAfternoonSets],
            songSuggestions: suggestionsInput,
          },
          { headers: { token } }
        );
      } catch (err) {}
    }
  };

  const getCartCount = () => {
    return Object.values(cartItems).reduce((total, act) => {
      return (
        total +
        Object.values(act).reduce(
          (sum, lineup) => sum + (lineup.quantity || 0),
          0
        )
      );
    }, 0);
  };

  const updateQuantity = (actId, lineupId, quantity) => {
    const updated = structuredClone(cartItems);

    if (quantity > 0) {
      if (!updated[actId]) updated[actId] = {};

      const existingExtras = updated[actId][lineupId]?.selectedExtras || [];
      updated[actId][lineupId] = {
        quantity,
        selectedExtras: existingExtras,
      };
    } else {
      if (updated[actId]) {
        delete updated[actId][lineupId];
        if (Object.keys(updated[actId]).length === 0) {
          delete updated[actId];
        }
      }
    }
    setCartItems(updated);
  };

  const updateExtras = async (actId, lineupId, newExtra) => {
    const updated = structuredClone(cartItems);

    if (updated[actId] && updated[actId][lineupId]) {
      const rawExtras = updated[actId][lineupId].selectedExtras;
      const extras = Array.isArray(rawExtras)
        ? rawExtras
        : rawExtras
          ? [rawExtras]
          : [];

      const exists = extras.find((e) => e.key === newExtra.key);

      if (exists) {
        // remove
        if (newExtra.quantity === 0) {
          updated[actId][lineupId].selectedExtras = extras.filter(
            (e) => e.key !== newExtra.key
          );
        } else {
          // update
          updated[actId][lineupId].selectedExtras = extras.map((e) =>
            e.key === newExtra.key
              ? { ...e, price: newExtra.price, quantity: newExtra.quantity }
              : e
          );
        }
      } else {
        // add
        if (newExtra.quantity > 0) {
          updated[actId][lineupId].selectedExtras = [...extras, newExtra];
        }
      }

      setCartItems(updated);

      if (token) {
        try {
          await axios.post(
            `${backendUrl}/api/cart/update`,
            {
              actId,
              lineupId,
              quantity: updated[actId][lineupId].quantity,
              selectedExtras: updated[actId][lineupId].selectedExtras,
            },
            { headers: { token } }
          );
        } catch (err) {}
      }
    }
  };

 const getCartAmount = async () => {
  let totalAmount = 0;

  for (const actId in cartItems) {
    // Try to find a full doc first, otherwise fetch it
    let actData =
      (Array.isArray(acts) ? acts.find((a) => String(a._id || a.actId) === String(actId)) : null) ||
      null;

    if (!actData || !Array.isArray(actData.lineups)) {
      actData = await getActById(actId);
      if (!actData) continue;
    }

      for (const lineupId in cartItems[actId]) {
        const cartItem = cartItems[actId][lineupId];
        const {
          quantity,
          selectedExtras = [],
          selectedAfternoonSets = [],
        } = cartItem;

        const lineup =
          actData.lineups.find(
            (l) => String(l.lineupId) === String(lineupId)
          ) || actData.lineups.find((l) => String(l._id) === String(lineupId));
        if (!lineup) continue;

        const result = await calculateActPricing(
          actData,
          selectedAddress?.split(",").slice(-2)[0]?.trim() || "",
          selectedAddress,
          selectedDate,
          lineup
        );

        const basePrice = Number(result?.total || 0);
        const extrasTotal = [
          ...selectedExtras,
          ...selectedAfternoonSets,
        ].reduce((sum, e) => sum + (e.price || 0), 0);
        const itemTotal = (basePrice + extrasTotal) * (quantity || 1);

        totalAmount += itemTotal;
      }
    }

    return Math.ceil(totalAmount);
  };

  // Wrap the availability trigger in a debounce to avoid double-fire from rapid clicks or React rerenders
  const debouncedRequestVocalistAvailability = debounce(
    (params) => requestVocalistAvailability(params),
    500, // wait 500ms before allowing another
    { leading: true, trailing: false }
  );

  // ============ Simple helpers ============

  const getShortlistCount = () => shortlistedActs.length;

  const isShortlisted = (actId) => {
    const id = String(actId);
    return Array.isArray(shortlistedActs) && shortlistedActs.includes(id);
  };

  // 🚪 Logout: clears storage and resets state
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("shortlistItems");
    sessionStorage.removeItem("selectedAddress");
    sessionStorage.removeItem("selectedDate");
    localStorage.removeItem("cartItems"); // 🧹 clear cart
    sessionStorage.removeItem("pendingCartPayload");
    setToken("");
    setUserId(null);
    setShortlistItems([]);
    setShortlistedActs([]);
    setCartItems({});
    setSelectedAddress("");
    setSelectedDate("");
    setActs([]);
    setAvailabilityStatus({});
    navigate("/"); // clean redirect without reload
  };

  const value = {
    // core
    acts,
    // prefer cards for grids; fall back to acts
    displayActs: (Array.isArray(actCards) && actCards.length) ? actCards : acts,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    backendUrl,
    getActById,
searchActCards,
    // listing cards
    actCards,
    fetchActsForGrid,
    // on-demand card pricing
    getCardPriceWithTravel,

    // cart
    cartItems,
    setCartItems,
    addToCart,
    updateQuantity,
    updateExtras,
    removeFromCart,
    getCartCount,
    getCartAmount,
    updatePerformance,
    // location/date
    selectedAddress,
    setSelectedAddress,
    selectedDate,
    setSelectedDate,

    // shortlist
    addToShortlist,
    shortlistedActs,
    setShortlistedActs,
    shortlistItems,
    setShortlistItems,
    shortlistAct,
    getShortlistCount,
    isShortlisted,
    fetchShortlistedActs,

    // availability (frontend)
    availableMap,
    availLoading,
    loadAvailabilityForDate,
    isActUnavailableForSelectedDate,
    isActAvailableForSelectedDate,

    // availability
    availabilityStatus,
    setAvailabilityStatus,
    requestVocalistAvailability: debouncedRequestVocalistAvailability,
    // auth
    token,
    setToken,
    userId,
    setUserId,

    // misc
    state,
    setState,
    logout,
    computeBalanceDueDate,
    scheduleBalanceInvoice,
    handleDateOrAddressChange,
    selectedVocalists,
    selectVocalistForAct,
    toggleVocalistForAct,
    ensureLeadIncluded,
    setUser,
  };

  return (
    <CardFilterShopContext.Provider value={value}>{props.children}</CardFilterShopContext.Provider>
  );
};

export default CardFilterShopProvider;


