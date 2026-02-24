import {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import axios from "axios";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomToast from "../components/CustomToast";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { useNavigate, useParams } from "react-router-dom";
import calculateActPricing from "./utils/pricing";
import CustomTimePicker from "../components/CustomTimePicker";
import "keen-slider/keen-slider.min.css";
import ExtrasCarousel from "../components/ExtrasCarousel";
import { assets } from "../assets/assets";
import { calculateExtraPrice } from "./utils/pricing";
import { addMinutesHHMM } from "./utils/time";
import { FeaturedVocalistBadgeForCart } from "../components/FeaturedVocalistBadgeForCart";
import {  fetchBadgeForActAndDate } from "./utils/helpersforAct";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  import.meta.env.BACKEND_URL?.replace(/\/$/, "") ||
  "";

  // Is this member a vocalist? (checks instrument/role/name + additionalRoles text)
const isVocalistMember = (m = {}) => {
  const extraRoles = Array.isArray(m.additionalRoles) ? m.additionalRoles : [];
  const hay =
    `${m.role || ""} ${m.instrument || ""} ${m.name || ""} ` +
    extraRoles.map(r => r?.role || r?.title || "").join(" ");
  return /\b(vocal|singer|rap(?!tors))\b/i.test(hay);
};

// Is this member essential? (member flag OR any essential additional role)
const isEssentialMember = (m = {}) =>
  m?.isEssential === true ||
  m?.required === true ||
  (Array.isArray(m.additionalRoles) && m.additionalRoles.some(r => r?.isEssential));

// ✅ “Full act” for Cart = has populated lineups with populated bandMembers
const isFullActForCart = (act) => {
  if (!act) return false;
  if (!Array.isArray(act.lineups) || act.lineups.length === 0) return false;

  // require lineup objects (not just IDs)
  const first = act.lineups[0];
  const hasLineupObj = first && typeof first === "object";

  // require bandMembers array exists on at least one lineup (populated)
  const hasBandMembers = act.lineups.some(
    (l) => l && typeof l === "object" && Array.isArray(l.bandMembers)
  );

  // require each lineup has an id (_id or lineupId) so your cart keying works
  const hasIds = act.lineups.every((l) => Boolean(l?._id || l?.lineupId));

  return hasLineupObj && hasBandMembers && hasIds;
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// How many vocalists are required for the selected lineup
const getRequiredVocalCount = (actData, lineupOverride = null) => {
  const lineup =
    lineupOverride ||
    actData?.selectedLineup ||
    (Array.isArray(actData?.lineups) ? actData.lineups[0] : null);

  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];

  // Prefer "required = number of essential vocalist members"
  let count = members.filter(m => isVocalistMember(m) && isEssentialMember(m)).length;

  // Fallback: if that returns 0/1 but we clearly have more vocalists present (even if not flagged essential),
  // use the rough vocalist count (so 6-piece with two vocals will allow 2)
  if (count < 2) {
    const rough = members.filter(isVocalistMember).length;
    count = Math.max(count, rough);
  }

  return Math.max(1, count || 1);
};

// Find the featured lead for this date (lead with photo and not unavailable)
const getLeadIdForDate = (actData, selectedDate, badgesOverride = null) => {
  const allBadges = badgesOverride || actData?.availabilityBadges || {};
  const clean = (selectedDate || "").slice(0, 10);
  const key = Object.keys(allBadges).find((k) => k.includes(clean));
  const badge = key ? allBadges[key] : null;
  const slots = Array.isArray(badge?.slots) ? badge.slots : [];
  const lead = slots.find(
    (s) => s?.state !== "unavailable" && typeof s?.photoUrl === "string" && s.photoUrl.startsWith("http")
  );
  return lead?.musicianId ? String(lead.musicianId) : null;
};

// Normalise selection shape (string or array) -> array
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const isValid24 = (s) => typeof s === "string" && /^[0-9a-f]{24}$/i.test(s);

const Cart = () => {
  const {
    acts,
    cartItems,
    setCartData,
    selectedDate,
    selectedAddress,
    removeFromCart,
    setShowSearch,
    setCartItems,
    availabilityStatus,
    updatePerformance,
    isActUnavailableForSelectedDate,
    toggleVocalistForAct,
  availLoading, setSelectedVocalists, selectedVocalists,ensureLeadIncluded,
  } = useContext(ShopContext);
useEffect(() => {
  console.log("🛒 cartItems(state):", cartItems);
  console.log("🛒 cartItems(storage):", localStorage.getItem("cartItems"));
  console.log("🎭 acts count:", acts?.length, "first ids:", (acts||[]).slice(0,5).map(a=>String(a?._id)));
}, [cartItems, acts]);



  const changingLineupRef = useRef(false);

  // --- DEBUG: lineup change tracing ---
  const prevCartLineupKeysRef = useRef({});

  const summariseLineups = (lineups = []) =>
    (Array.isArray(lineups) ? lineups : []).map((l, i) => {
      const id = String(l?._id || l?.lineupId || l || "");
      const bmLen = Array.isArray(l?.bandMembers) ? l.bandMembers.length : undefined;
      return {
        i,
        id,
        actSize: l?.actSize,
        bandMembers: bmLen,
        setupTime: l?.setupTime,
        soundcheckTime: l?.soundcheckTime,
      };
    });

  const getCartLineupKeys = (ci) => {
    const out = {};
    try {
      Object.keys(ci || {}).forEach((actId) => {
        out[String(actId)] = Object.keys(ci?.[actId] || {}).map(String).sort();
      });
    } catch {}
    return out;
  };

  const diffKeys = (prev = {}, next = {}) => {
    const changes = [];
    const allActs = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
    allActs.forEach((actId) => {
      const a = (prev?.[actId] || []).join("|");
      const b = (next?.[actId] || []).join("|");
      if (a !== b) changes.push({ actId, from: prev?.[actId] || [], to: next?.[actId] || [] });
    });
    return changes;
  };

  const [cartDetails, setCartDetails] = useState([]);
  const [actData, setActData] = useState(null);
  const [availabilityBadgesByAct, setAvailabilityBadgesByAct] = useState({});
  const seededLeadsRef = useRef(new Set());
  const [isYesForSelectedDate, setIsYesForSelectedDate] = useState(null);
const [clearedBadges, setClearedBadges] = useState(new Set());
const [isChangingLineup, setIsChangingLineup] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState("Wedding");
  const [customEventType, setCustomEventType] = useState("");
  const [performancePlans, setPerformancePlans] = useState({});


  const navigate = useNavigate();

  // Used for availability ensure-vocalists payload (avoid ReferenceError)
const user = useMemo(() => getStoredUser(), []);
const cartEnquiryId = null;

// ✅ FULL ACT CACHE (so we don’t refetch repeatedly)
const [fullActsById, setFullActsById] = useState({});

// ✅ Read cached full act from localStorage (only accept if truly "full" for cart)
const readCachedFullAct = useCallback((actId) => {
  const key = `act:${String(actId)}:v2`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const act = parsed?.act || parsed;
    return isFullActForCart(act) ? act : null;
  } catch {
    return null;
  }
}, []);

// ✅ Fetch the full act from backend (try a few common routes; keep the first that works)
const fetchFullActById = useCallback(async (actId) => {
  const id = String(actId);

  const candidates = [
    `${BACKEND_URL}/api/act/${encodeURIComponent(id)}`,
    `${BACKEND_URL}/api/act/get/${encodeURIComponent(id)}`,
    `${BACKEND_URL}/api/act/one/${encodeURIComponent(id)}`,
    `${BACKEND_URL}/api/act/single/${encodeURIComponent(id)}`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) continue;

      const json = await res.json();
      const act = json?.act || json;

      if (isFullActForCart(act)) {
        return act;
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}, []);

const resolveActForCart = useCallback(async (actId) => {
  const id = String(actId);

  // 1) cards list (fast) — BUT only accept if it's truly “full”
  const fromCards = (acts || []).find((a) => String(a?._id) === id);
  if (isFullActForCart(fromCards)) return fromCards;

  // 2) in-memory cache
  const fromState = fullActsById[id];
  if (isFullActForCart(fromState)) return fromState;

  // 3) localStorage cache
  const fromCache = readCachedFullAct(id);
  if (isFullActForCart(fromCache)) {
    setFullActsById((prev) => ({ ...prev, [id]: fromCache }));
    return fromCache;
  }

  // 4) backend fetch
  const fetched = await fetchFullActById(id);
  if (isFullActForCart(fetched)) {
    setFullActsById((prev) => ({ ...prev, [id]: fetched }));
    return fetched;
  }

  // fallback
  return fromCards || fromState || fromCache || fetched || null;
}, [acts, fullActsById, readCachedFullAct, fetchFullActById]);

// ✅ Find lineup safely, and optionally “self-heal” the cart lineupId if stale
const resolveLineupForCart = useCallback((act, lineupId) => {
  const id = String(lineupId || "");
  const list = Array.isArray(act?.lineups) ? act.lineups : [];

  const found = list.find((l) => String(l?._id || l?.lineupId) === id);
  return found || list[0] || null; // fallback to first lineup
}, []);

  // Seed: ensure each act's featured lead (if any) is selected exactly once and locked
  useEffect(() => {
    if (!selectedDate || !cartItems) return;
    const clean = selectedDate.slice(0, 10);

    Object.keys(cartItems || {}).forEach((actId) => {
      const already = seededLeadsRef.current.has(String(actId));
      const badges = availabilityBadgesByAct?.[actId] || {};
      const leadId = getLeadIdForDate({ availabilityBadges: badges }, selectedDate, badges);
      if (!leadId) return;

      const current = toArray(selectedVocalists?.[actId]);
     if (!current.includes(leadId)) {
  ensureLeadIncluded(actId, leadId);
}
      if (!already) {
        seededLeadsRef.current.add(String(actId));
      }
    });
  }, [availabilityBadgesByAct, cartItems, selectedDate, selectedVocalists, toggleVocalistForAct]);


      useEffect(() => {
    if (actData) {
      console.log("🎭 [Act.jsx] actData loaded:", {
        name: actData.name,
        numberOfSets: actData.numberOfSets,
        lengthOfSets: actData.lengthOfSets,
        lineups: actData.lineups?.length,
      });
    }
  }, [actData]);

  // ✅ Safe merge to prevent infinite loop
  useEffect(() => {
    if (!actData) return;
  
    setActData((prev) => {
      if (!prev) return actData;
  
      // Compare shallowly — skip update if same object
      const prevBadges = prev.availabilityBadges || {};
      const newBadges = actData.availabilityBadges || {};
  
      // Skip if badge data hasn’t changed
      if (JSON.stringify(prevBadges) === JSON.stringify(newBadges)) {
        return prev;
      }
  
      const merged = {
        ...actData,
        availabilityBadges: { ...newBadges },
      };
      clearedBadges.forEach((d) => {
        delete merged.availabilityBadges?.[d];
      });
      return merged;
    });
  }, [clearedBadges]); // 👈 removed actData from deps

  useEffect(() => {
    const evtSource = new EventSource(`${BACKEND_URL}/api/availability/subscribe`);

    evtSource.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`📡 SSE event received:`, data);

        const validTypes = [
          "availability_yes",
          "availability_deputy_yes",
          "availability_badge_updated",
        ];
        if (!validTypes.includes(data.type)) return;

        const cleanDate = data.dateISO?.slice(0, 10) || selectedDate?.slice(0, 10);
        if (!cleanDate) return;

        // 🧠 For each act currently in cart
        for (const actId of Object.keys(cartItems || {})) {
          if (String(data.actId) !== String(actId)) continue;

          // 🧹 Badge clear
          if (data.type === "availability_badge_updated" && data.badge === null) {
            console.log("🧹 Explicit badge clear:", data);
            setClearedBadges((prev) => new Set(prev).add(cleanDate));
            setAvailabilityBadgesByAct((prev) => {
              const next = { ...(prev || {}) };
              const actKey = String(actId);
              const actMap = { ...(next[actKey] || {}) };
              delete actMap[cleanDate];
              delete actMap[`${cleanDate}_tbc`];
              next[actKey] = actMap;
              return next;
            });
            continue;
          }

          // ♻️ Update latest badge
          const badge = await fetchBadgeForActAndDate(actId, cleanDate, BACKEND_URL);
          if (badge) {
            console.log(`♻️ Updated badge via SSE for ${actId}:`, badge);
            setAvailabilityBadgesByAct((prev) => {
              const next = { ...(prev || {}) };
              const actKey = String(actId);
              next[actKey] = { ...(next[actKey] || {}), [cleanDate]: badge };
              return next;
            });
          }
        }
      } catch (err) {
        console.error("⚠️ SSE message error:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.warn("⚠️ SSE connection error", err);
    };

    return () => evtSource.close();
  }, [cartItems, selectedDate]);
  
useEffect(() => {
  if (!selectedDate || !cartItems) return;

  const cleanDate = selectedDate.slice(0, 10);
  console.log("📡 Fetching badges for all cart acts:", { cleanDate });

  Object.keys(cartItems || {}).forEach((actId) => {
    fetchBadgeForActAndDate(actId, cleanDate, BACKEND_URL).then((badge) => {
      if (!badge) {
        console.log(`🪶 No badge returned for ${actId}`);
        return;
      }

      setAvailabilityBadgesByAct((prev) => {
        const next = { ...(prev || {}) };
        const actKey = String(actId);
        next[actKey] = { ...(next[actKey] || {}), [cleanDate]: badge };
        return next;
      });
    });
  });
}, [cartItems, selectedDate]);



// ✅ basic UK postcode detector (good enough for gating)
const hasUkPostcode = (value = "") => {
  const s = String(value).toUpperCase().trim();
  // special case
  if (/\bGIR\s*0AA\b/.test(s)) return true;
  // common UK formats (allows optional space)
  return /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/.test(s);
};

const canProceedToBooking = Boolean(
  selectedDate &&
  selectedAddress &&
  hasUkPostcode(selectedAddress)
);

const handleProceedToBooking = () => {
  if (!selectedDate || !selectedAddress) {
    toast(<CustomToast type="error" message="Please select a date and venue address." />);
    triggerSearch();
    return;
  }

  if (!hasUkPostcode(selectedAddress)) {
    toast(
      <CustomToast
        type="error"
        message="Please select a venue address that includes a postcode (e.g. SW1A 1AA)."
      />
    );
    triggerSearch(); // sends them back to add/fix address
    return;
  }

  commitStandardTimesIfMissing();
  navigate("/place-booking");
};



  const mergedUpdateExtras = useMergedUpdateExtras(cartItems, setCartItems);


  // NEW: track which lineups got auto-added extras so the banner shows the right text.
  // key shape: `${actId}:${lineupId}` -> 'late' | 'early'
  const [autoAddedFlags, setAutoAddedFlags] = useState({});
  const makeKey = (actId, lineupId) => `${actId}:${lineupId}`;
  const markAutoAdded = (actId, lineupId, kind /* 'late' | 'early' */) =>
    setAutoAddedFlags((prev) => ({
      ...prev,
      [makeKey(actId, lineupId)]: kind,
    }));
  const resolvePerMemberNet = (act, key, fallback = 0) => {
    const raw = act?.extras?.get ? act.extras.get(key) : act?.extras?.[key];
    if (typeof raw === "number") return Number(raw) || 0;
    if (raw && typeof raw === "object" && raw.price != null)
      return Number(raw.price) || 0;
    return Number(fallback) || 0;
  };
  const normLineupId = (l) => String(l?._id || l?.lineupId || "");

  const idToString = (val) => {
    if (!val) return "";
    // If an object with _id/lineupId was passed, extract and stringify
    if (typeof val === "object" && (val._id || val.lineupId)) {
      return String(val._id?.toString?.() || val.lineupId?.toString?.() || "");
    }
    // If it's already a primitive (string/number), stringify safely
    return String(val?.toString?.() || val);
  };

  const sameId = (a, b) => idToString(a) === idToString(b);

  // Helpers to exclude managers / non-performers from per-member time charges
  const isManagerLike = (m = {}) => {
    const hasManagerWord = (s = "") =>
      /\b(manager|management)\b/i.test(String(s));

    if (m.isManager === true || m.isNonPerformer === true) return true;

    // Instrument or title fields
    if (hasManagerWord(m.instrument) || hasManagerWord(m.title)) return true;

    // Any additional role name containing manager/management (e.g. "Band Management", "Tour Manager")
    const rolesArr = Array.isArray(m.additionalRoles) ? m.additionalRoles : [];
    if (
      rolesArr.some((r) => hasManagerWord(r?.role) || hasManagerWord(r?.title))
    )
      return true;

    return false;
  };

  const findLineupById = (act, lineupId) => {
    const target = idToString(lineupId);
    return (act?.lineups || []).find(
      (l) => sameId(l._id, target) || sameId(l.lineupId, target)
    );
  };

useEffect(() => {
  if (!cartItems || Object.keys(cartItems).length === 0) {
    setCartData?.([]);
    return;
  }

  const fetchCartData = async () => {
    const tempData = [];

    for (const actId in cartItems) {
      const actData = await resolveActForCart(actId);
      if (!actData) continue;

      const actCart = cartItems[actId];
      if (!actCart || typeof actCart !== "object") continue;

      for (const lineupId in actCart) {
        const cartLine = actCart[lineupId];
        if (!cartLine) continue;

        const lineup = resolveLineupForCart(actData, lineupId);
        if (!lineup) continue;

        // ✅ (optional but recommended) self-heal stale lineupId in cart
        const resolvedLineupId = String(lineup?._id || lineup?.lineupId || "");
        if (resolvedLineupId && String(lineupId) !== resolvedLineupId) {
          console.warn("🛒 lineupId mismatch → healing cart key", {
            actId: String(actId),
            old: String(lineupId),
            new: resolvedLineupId,
          });

          setCartItems((prev) => {
            const next = structuredClone(prev || {});
            const block = next?.[actId]?.[lineupId];
            if (!block) return prev;

            delete next[actId][lineupId];
            next[actId][resolvedLineupId] = block;
            return next;
          });
        }

        const countyFromAddress =
          selectedAddress?.split(",").slice(-2)[0]?.trim() || "";

        let adjustedTotal = 0;
        try {
          const { total } =
            (await calculateActPricing?.(
              actData,
              countyFromAddress,
              selectedAddress,
              selectedDate,
              lineup
            )) || {};
const net = Number(total) || 0;
adjustedTotal = Math.ceil(net * 1.33);
        } catch (err) {
          console.warn("💸 Price calc failed:", err?.message);
        }

        tempData.push({
          _id: actId,
          selectedLineup: String(lineup?._id || lineup?.lineupId || lineupId),
          quantity: cartLine.quantity || 1,
          selectedExtras: Array.isArray(cartLine.selectedExtras)
            ? cartLine.selectedExtras
            : cartLine.selectedExtras
            ? [cartLine.selectedExtras]
            : [],
          dismissedExtras: cartLine.dismissedExtras || [],
          adjustedTotal,
          actData,
          lineup,
        });
      }
    }

    setCartData?.(tempData);
  };

  fetchCartData();
}, [cartItems, selectedAddress, selectedDate, setCartData, resolveActForCart, resolveLineupForCart, setCartItems]);

const triggerSearch = () => {
  setShowSearch?.(true);
  navigate?.("/acts");
  window?.scrollTo?.(0, 0);
};

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

const clearFinishOverride = useCallback(
  (actId) => {
    setPerformancePlans?.((prev) => ({
      ...prev,
      [actId]: { ...prev?.[actId], finishTime: undefined },
    }));
  },
  [setPerformancePlans]
);

  const formatDate = (dateString) => {
    if (!dateString) return "No date selected";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();
    const suffix = ["th", "st", "nd", "rd"][
      day % 10 > 3 ? 0 : ((day % 100) - (day % 10) !== 10) * (day % 10)
    ];
    return `${day}${suffix} of ${month} ${year}`;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  
  useEffect(() => {
    if (!cartItems || Object.keys(cartItems).length === 0) {
      setCartDetails([]);
      return;
    }

    const loadPrices = async () => {
      const results = [];
      const selectedCounty =
        selectedAddress?.split(",").slice(-2)[0]?.trim() || "";

      for (const actId of Object.keys(cartItems || {})) {
        const act = await resolveActForCart(actId);
        if (!act) {
          console.warn("🛒 Could not resolve act for cart", actId);
          continue;
        }

        const actCartBlock = cartItems?.[actId];
        if (!actCartBlock || typeof actCartBlock !== "object") continue;

        for (const lineupId of Object.keys(actCartBlock || {})) {
          const line = actCartBlock?.[lineupId] || {};

          const lineup = resolveLineupForCart(act, lineupId);
          if (!lineup) {
            console.warn("🛒 Could not resolve lineup for cart", { actId, lineupId });
            continue;
          }

          const quantity = Number(line?.quantity) || 1;
          const selectedExtras = Array.isArray(line?.selectedExtras)
            ? line.selectedExtras
            : line?.selectedExtras
            ? [line.selectedExtras]
            : [];

          // Pricing (keep the item even if pricing fails)
          let subtotalWithMargin = 0;
          try {
            const res = await calculateActPricing(
              act,
              selectedCounty,
              selectedAddress,
              selectedDate,
              lineup
            );
const net = Number(res?.total) || 0;
subtotalWithMargin = Math.ceil(net * 1.33);
          } catch (e) {
            console.warn(
              "💸 calculateActPricing failed (keeping item but with £0):",
              e
            );
          }

          const adjustedTotal = subtotalWithMargin;
const basePrice = subtotalWithMargin; // already gross

          const extrasTotal = (selectedExtras || []).reduce(
            (s, ex) => s + (Number(ex?.price) || 0),
            0
          );

          const itemTotal = (adjustedTotal + extrasTotal) * quantity;

          results.push({
            actId: String(actId),
            actName: act.tscName || act.name || "Act",
            image: act.images?.[0],
            lineupId: String(lineup?._id || lineup?.lineupId || lineupId),
            lineup,
            quantity,
            subtotalWithMargin,
            basePrice,
            adjustedTotal,
            extrasTotal,
            total: itemTotal,
            selectedExtras,
            dismissedExtras: line?.dismissedExtras || [],
            allLineups: Array.isArray(act?.lineups) ? act.lineups : [],
            actData: act,
          });
        }
      }

      setCartDetails(results);
    };

    loadPrices();
  }, [cartItems, selectedAddress, selectedDate, resolveActForCart, resolveLineupForCart]);

  // ✅ Persist PA/Lights finish (time + dayOffset) to both performancePlans and cartItems
  const handleOverridePaFinishTime = useCallback(
    (actId, lineupId, { hhmm, dayOffset = 0 }) => {
      // local planner state (for UI calc)
      setPerformancePlans((prev) => ({
        ...prev,
        [actId]: {
          ...(prev[actId] || {}),
          paLightsFinishTime: hhmm,
          paLightsFinishDayOffset: dayOffset,
        },
      }));

      // 🔐 authoritative cart state (what PlaceBooking sends to backend)
      updatePerformance(actId, lineupId, {
        paLightsFinishTime: hhmm,
        paLightsFinishDayOffset: Number(dayOffset) || 0,
      });
    },
    [updatePerformance]
  );

  // ✅ Persist Act finish (time + dayOffset) to both places
  const handleOverrideFinishTime = useCallback(
    (actId, lineupId, { hhmm, dayOffset = 0 }) => {
      setPerformancePlans((prev) => ({
        ...prev,
        [actId]: {
          ...(prev[actId] || {}),
          finishTime: hhmm,
          finishDayOffset: dayOffset,
        },
      }));

      updatePerformance(actId, lineupId, {
        finishTime: hhmm,
        finishDayOffset: Number(dayOffset) || 0,
      });
    },
    [updatePerformance]
  );


 const handleLineupChange = async (actId, oldLineupId, newLineupId) => {
  console.groupCollapsed("[LINEUP CHANGE]");
  const actIdStr = String(actId || "");
  const oldIdStr = String(oldLineupId || "");
  const newIdStr = String(newLineupId || "");

  console.log("[LINEUP CHANGE] validate", {
    actIdStr,
    oldIdStr,
    newIdStr,
    isValidAct: isValid24(actIdStr),
    isValidOld: isValid24(oldIdStr),
    isValidNew: isValid24(newIdStr),
    types: {
      actIdStr: typeof actIdStr,
      oldIdStr: typeof oldIdStr,
      newIdStr: typeof newIdStr,
    },
  });

  if (!actIdStr || !newIdStr || oldIdStr === newIdStr) {
    console.warn("[LINEUP CHANGE] aborted: invalid ids", {
      actIdStr,
      oldIdStr,
      newIdStr,
    });
    console.groupEnd();
    return;
  }

  if (changingLineupRef.current) {
    console.warn("[LINEUP CHANGE] ignored: change already in progress");
    console.groupEnd();
    return;
  }

  changingLineupRef.current = true;
  setIsChangingLineup(true);

  try {
    // ✅ Always resolve the FULL act so lineups exist
    const act = await resolveActForCart(actIdStr);
    if (!act) {
      console.warn("[LINEUP CHANGE] could not resolve act", actIdStr);
      console.groupEnd();
      return;
    }

    console.log("[resolved act]", {
      id: String(act?._id),
      name: act?.tscName || act?.name,
      lineupsCount: Array.isArray(act?.lineups) ? act.lineups.length : 0,
    });
    console.table(summariseLineups(act?.lineups));

    // Resolve the target lineup using normalized id comparison
    const lineup = findLineupById(act, newIdStr);
    if (!lineup) {
      console.warn("[LINEUP CHANGE] could not find lineup", {
        actIdStr,
        newIdStr,
        available: summariseLineups(act?.lineups).map((x) => x.id),
      });
      console.groupEnd();
      return;
    }

    console.log("[target lineup]", {
      newIdStr,
      matchedId: String(lineup?._id || lineup?.lineupId),
      actSize: lineup?.actSize,
      bandMembers: Array.isArray(lineup?.bandMembers)
        ? lineup.bandMembers.length
        : undefined,
    });

    const selectedCounty = selectedAddress?.split(",").slice(-2)[0]?.trim() || "";
    const { total } = await calculateActPricing(
      act,
      selectedCounty,
      selectedAddress,
      selectedDate,
      lineup
    );

    console.log("[pricing]", {
      netTotal: Number(total) || 0,
      gross133: Math.ceil((Number(total) || 0) * 1.33),
      selectedCounty,
      selectedAddress,
      selectedDate,
    });

    const net = Number(total) || 0;
    const priceWithMargin = Math.ceil(net * 1.33);
    const basePrice = priceWithMargin;

    // 1) Move the node in cartItems (old key -> new key) FIRST so effects rebuild cartDetails reliably
    setCartItems((prev) => {
      const before = getCartLineupKeys(prev);
      const updated = structuredClone(prev || {});
      const existing = updated?.[actIdStr]?.[oldIdStr];
      if (!updated[actIdStr]) updated[actIdStr] = {};

      console.log("[setCartItems] existing block?", !!existing);

      if (existing) {
        delete updated[actIdStr][oldIdStr];
        updated[actIdStr][newIdStr] = existing;
      }

      const after = getCartLineupKeys(updated);
      console.log("[setCartItems] keys diff", diffKeys(before, after));
      return updated;
    });

    

    // 2) Optimistically update the rendered details so the dropdown reflects immediately
    setCartDetails((prev) =>
      prev.map((ci) => {
        if (
          String(ci.actId) !== actIdStr ||
          String(ci.lineupId) !== oldIdStr
        )
          return ci;

        const extrasTotal = (ci.selectedExtras || []).reduce(
          (s, e) => s + (Number(e?.price) || 0),
          0
        );

        return {
          ...ci,
          lineupId: newIdStr,
          lineup,
          actData: act,
          allLineups: Array.isArray(act?.lineups) ? act.lineups : ci.allLineups,
          basePrice,
          adjustedTotal: priceWithMargin,
          subtotalWithMargin: priceWithMargin,
          total: (priceWithMargin + extrasTotal) * (ci.quantity || 1),
        };
      })
    );

      // ✅ 3) Ensure vocalist availability (non-blocking; no duplicate WhatsApps)
  try {
    const hasDate = !!selectedDate;
    const hasAddress = !!(selectedAddress && String(selectedAddress).trim());

    if (hasDate && hasAddress && actIdStr && newIdStr) {
      const dateISO =
        typeof selectedDate === "string"
          ? String(selectedDate).slice(0, 10)
          : new Date(selectedDate).toISOString().slice(0, 10);

      const formattedAddress = String(selectedAddress).trim();

      console.log("[ensure-vocalists] calling", {
        actId: actIdStr,
        lineupId: newIdStr,
        dateISO,
        formattedAddress,
      });

      if (!BACKEND_URL) {
        console.warn("BACKEND_URL missing — skipping ensure-vocalists");
      } else {
        await axios.post(`${BACKEND_URL}/api/availability/ensure-vocalists`, {
          actId: actIdStr,
          lineupId: newIdStr,
          dateISO,
          formattedAddress,
          // if you have a cart enquiry id, pass it; otherwise it will still dedupe fine
          enquiryId: cartEnquiryId || null,
          clientUserId: user?._id || null,
          clientName: user?.firstName
            ? `${user.firstName} ${user.surname || ""}`.trim()
            : "",
          clientEmail: user?.email || "",
          skipDuplicateCheck: false,
        });
      }
    } else {
      console.log("[ensure-vocalists] skipped (need date + address)");
    }
  } catch (e) {
    console.warn("⚠️ [ensure-vocalists] failed (non-blocking):", e?.message || e);
  }

    console.log("[done] updated cartDetails + cartItems move queued");
    console.groupEnd();

    toast(<CustomToast type="success" message="Lineup updated in cart!" />, {
      position: "top-right",
      autoClose: 2000,
    });
  } catch (err) {
    console.error("[LINEUP CHANGE] failed", err);
    try {
      console.groupEnd();
    } catch {}
  } finally {
    changingLineupRef.current = false;
    setIsChangingLineup(false);
  }
};

  // Build a friendly lineup description from a lineup object, including roles tail
 const generateDescription = (lineup) => {
  const members = Array.isArray(lineup?.bandMembers) ? lineup.bandMembers : [];

  // Exclude Manager/Admin rows from performer count + instrument list
  const performers = members.filter((m) => {
    const role = String(m?.instrument || "").trim().toLowerCase();
    return role && role !== "manager" && role !== "admin";
  });

  // Prefer explicit actSize if present (e.g. "6-Piece"), else count performers
  const countLabel =
    (lineup?.actSize && String(lineup.actSize).trim()) ||
    `${performers.length}-Piece`;

  // Only essential performer instruments
  const instruments = performers
    .filter((m) => m?.isEssential)
    .map((m) => String(m?.instrument || "").trim())
    .filter(Boolean);

  // Sort: vocals first, drums last (same intent as before)
  instruments.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const isVocal = (str) => str.includes("vocal");
    const isDrums = (str) => str === "drums";

    if (isVocal(aLower) && !isVocal(bLower)) return -1;
    if (!isVocal(aLower) && isVocal(bLower)) return 1;
    if (isDrums(aLower)) return 1;
    if (isDrums(bLower)) return -1;
    return 0;
  });

  // Essential roles, but only from performer members
  const roles = performers.flatMap((member) =>
    (Array.isArray(member?.additionalRoles) ? member.additionalRoles : [])
      .filter((r) => r?.isEssential)
      .map((r) => String(r?.role || "Unnamed Service").trim())
      .filter(Boolean)
  );

  if (performers.length === 0) return "Add a Lineup";

  // Turn ["Lead Female Vocal","Lead Female Vocal","Bass Guitar"] into:
  // ["Lead Female Vocal x 2","Bass Guitar"]
  const formatWithCounts = (arr) => {
    const counts = new Map();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    const expanded = [];
    for (const [name, n] of counts.entries()) {
      expanded.push(n > 1 ? `${name} x ${n}` : name);
    }

    // Keep a stable order based on first appearance in original array
    expanded.sort((x, y) => {
      const baseX = x.replace(/\s+x\s+\d+$/i, "");
      const baseY = y.replace(/\s+x\s+\d+$/i, "");
      return arr.findIndex((v) => v === baseX) - arr.findIndex((v) => v === baseY);
    });

    if (expanded.length === 0) return "";
    if (expanded.length === 1) return expanded[0];
    if (expanded.length === 2) return `${expanded[0]} & ${expanded[1]}`;
    return `${expanded.slice(0, -1).join(", ")} & ${expanded[expanded.length - 1]}`;
  };

  const instrumentsStr = formatWithCounts(instruments);
  const rolesStr = roles.length ? ` (including ${formatWithCounts(roles)} services)` : "";

  return `${countLabel}: ${instrumentsStr}${rolesStr}`;
};

const handlePerformancePlanChange = (actId, lineupId, selectedPlanIndex, actData) => {
   // mirror to local UI state
   setPerformancePlans((prev) => ({
     ...prev,
     [actId]: {
       ...prev[actId],
       planIndex: selectedPlanIndex,
     },
   }));

   // persist into the cart performance block so it reaches checkout → DB
   try {
     const idx = Number(selectedPlanIndex);
     const sets       = Array.isArray(actData?.numberOfSets) ? actData.numberOfSets[idx] : undefined;
     const length     = Array.isArray(actData?.lengthOfSets) ? actData.lengthOfSets[idx] : undefined;
     const minInterval= Array.isArray(actData?.minimumIntervalLength) ? actData.minimumIntervalLength[idx] : undefined;

     updatePerformance(actId, lineupId, {
       planIndex: Number.isFinite(idx) ? idx : null,
       plan: {
         sets: Number(sets) || null,
         length: Number(length) || null,
         minInterval: Number(minInterval) || null,
       },
     });
   } catch (err) {
     console.debug('Failed to update performance plan:', err);
   }
 };

  const toHHMM = (d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateAdjustedTimes = (
    lineup,
    selectedExtras = [],
    startTime,
    setupAndSoundcheckedBy,
    actData,
    performancePlans,
    selectedDate
  ) => {
   try {
  // no-op
} catch (err) {
  console.debug(err);
}

    if (!lineup) {
      const ret = {
        setupTime: 0,
        soundcheckTime: 0,
        changeTime: 0,
        arrivalTime: null,
        finishTime: null,
        needsEarlyArrival: false,
        notEnoughPerformanceWindow: false,
      };
      return ret;
    }

    const eventBase = selectedDate ? new Date(selectedDate) : new Date();
    const eventDay = new Date(
      eventBase.getFullYear(),
      eventBase.getMonth(),
      eventBase.getDate(),
      0,
      0,
      0,
      0
    );

    const parseHHMM = (hhmm, mayBeNextDay = false) => {
      if (!hhmm) return null;
      const [h, m] = String(hhmm).split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      const d = new Date(eventDay);
      d.setHours(h, m, 0, 0);
      if (mayBeNextDay && h < 6) d.setDate(d.getDate() + 1);
      return d;
    };

    const parseWithLog = (hhmm, mayBeNextDay = false, label = "") => {
      const d = parseHHMM(hhmm, mayBeNextDay);
      try {
  // no-op
} catch (err) {
  console.debug(err);
}
      return d;
    };

    let setupTime = Number(lineup.setupTime) || 90;
    let soundcheckTime = Number(lineup.soundcheckTime) || 60;
    let changeTime =
      Number(lineup.changeTimeRequired || lineup.changeTime) || 15;

    const hasSpeedySetup =
      Array.isArray(selectedExtras) &&
      selectedExtras.some((e) =>
        e?.name?.toLowerCase?.().includes("speedy setup")
      );
    if (hasSpeedySetup) {
      setupTime = 30;
      soundcheckTime = 30;
    }
    const totalPreShowTime = setupTime + soundcheckTime + changeTime;

 try {
  // no-op
} catch (err) {
  console.debug(err);
}

    const standardArrival = new Date(eventDay);
    standardArrival.setHours(17, 0, 0, 0); // 17:00

    const midnight = new Date(eventDay);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    const lineupMembers = Array.isArray(lineup?.bandMembers)
      ? lineup.bandMembers
      : [];
    const performersOnly = lineupMembers.filter((m) => !isManagerLike(m));
    const lineupSize = performersOnly.length;
    const earlyArrivalFeePer60 = Number(lineup?.earlyArrivalFeePer60) || 0;
    const lateStayFeePer60 = Number(lineup?.lateStayFeePer60) || 0;

    const inferMinutes = (extra, per60) => {
      if (!extra) return 0;
      const byName = extra.name?.match(/(\d+)\s*mins/i);
      if (byName) return parseInt(byName[1], 10) || 0;
      if (extra.price && per60 && lineupSize) {
        return Math.round((extra.price / (per60 * lineupSize)) * 60);
      }
      if (extra.quantity) return 60 * Number(extra.quantity);
      return 0;
    };

    const earlyArrivalExtra = (selectedExtras || []).find(
      (e) => e?.key === "early_arrival_60min_per_band_member"
    );
    const lateStayExtra = (selectedExtras || []).find(
      (e) => e?.key === "late_stay_60min_per_band_member"
    );
    const earlyArrivalMinutes = inferMinutes(
      earlyArrivalExtra,
      earlyArrivalFeePer60
    );
    const lateStayMinutes = inferMinutes(lateStayExtra, lateStayFeePer60);

    const overrides = performancePlans?.[actData?._id] || {};
    const effectiveSetupAndSCBy =
      setupAndSoundcheckedBy ?? overrides.setupAndSoundcheckedBy ?? null;
    const effectiveStartTime = startTime ?? overrides.startTime ?? null;

    let setupCompleteTime;
    if (effectiveSetupAndSCBy) {
      setupCompleteTime = parseWithLog(
        effectiveSetupAndSCBy,
        false,
        "Setup+Soundcheck complete"
      );
    } else {
      setupCompleteTime = new Date(
        standardArrival.getTime() + totalPreShowTime * 60000
      );
    }

    let arrivalTime = new Date(
      setupCompleteTime.getTime() - totalPreShowTime * 60000
    );

    const arrivalOverride = parseWithLog(
      overrides.arrivalTime,
      false,
      "arrivalOverride"
    );
    if (arrivalOverride) {
      arrivalTime = arrivalOverride;
    }

    const earliestAllowedArrival = new Date(
      standardArrival.getTime() - earlyArrivalMinutes * 60000
    );
    const needsEarlyArrival = arrivalTime < earliestAllowedArrival;

    let chosenStart;
    if (effectiveStartTime) {
      chosenStart = parseWithLog(effectiveStartTime, false, "chosenStart");
    } else {
      const sevenPm = new Date(eventDay);
      sevenPm.setHours(19, 0, 0, 0);
      chosenStart = new Date(
        Math.max(setupCompleteTime.getTime(), sevenPm.getTime())
      );
    }
  // Allow a flexible total on-site duration
const clientOnSiteMinutes =
  overrides.totalOnSiteMinutes && overrides.totalOnSiteMinutes > 0
    ? overrides.totalOnSiteMinutes
    : 7 * 60; // fallback if not specified

const permittedOnSiteMinutes =
  clientOnSiteMinutes + earlyArrivalMinutes + lateStayMinutes;

    const finishOverride = parseWithLog(
      overrides.finishTime,
      true,
      "finishOverride"
    );

    const theoreticalFinishNoClamp = finishOverride
      ? finishOverride
      : new Date(arrivalTime.getTime() + permittedOnSiteMinutes * 60000);

    let rawFinish = finishOverride
      ? finishOverride
      : new Date(
          Math.min(
            arrivalTime.getTime() + permittedOnSiteMinutes * 60000,
            midnight.getTime()
          )
        );

    if (
      rawFinish &&
      chosenStart &&
      rawFinish.getTime() < chosenStart.getTime()
    ) {
      rawFinish = new Date(rawFinish.getTime());
      rawFinish.setDate(rawFinish.getDate() + 1);
    }

   if (!finishOverride && lateStayMinutes <= 0) {
  const latestAllowedNoLateStay = new Date(
    Math.min(
      midnight.getTime(),
      arrivalTime.getTime() + (clientOnSiteMinutes + earlyArrivalMinutes) * 60000
    )
  );
  if (rawFinish.getTime() > latestAllowedNoLateStay.getTime()) {
    rawFinish = latestAllowedNoLateStay;
  }
}

    const finishTime = rawFinish;
    let requiredPerformanceMinutes = 120;
    const planIndex = performancePlans?.[actData?._id]?.planIndex;
    const plan = actData?.performancePlans?.[planIndex];
    if (plan && plan.setLength && plan.numberOfSets) {
      const setLength = parseInt(plan.setLength) || 0;
      const numberOfSets = parseInt(plan.numberOfSets) || 0;
      const interval = parseInt(plan.interval) || 0;
      requiredPerformanceMinutes =
        numberOfSets * setLength + Math.max(0, numberOfSets - 1) * interval;
    }

    const availablePerformanceMinutes = Math.max(
      0,
      Math.round((finishTime - chosenStart) / 60000)
    );
    const notEnoughPerformanceWindow =
      availablePerformanceMinutes < requiredPerformanceMinutes;

    const ret = {
      setupTime,
      soundcheckTime,
      changeTime,
      arrivalTime,
      finishTime,
      needsEarlyArrival,
      notEnoughPerformanceWindow,
      theoreticalFinishNoClamp,
    };
    return ret;
  };

  // --- Standard timings helpers ---
// Build derived "standard" performance times for an item using your existing helpers.
const deriveStandardTimesForItem = (item, performancePlans, selectedDate) => {
  const times = calculateAdjustedTimes(
    item.lineup,
    item.selectedExtras,
    performancePlans[item.actId]?.startTime,
    performancePlans[item.actId]?.setupAndSoundcheckedBy,
    item.actData,
    performancePlans,
    selectedDate
  );

  const arrivalHHMM = toHHMM(times.arrivalTime) || "17:00";
  const totalPre =
    (times.setupTime || 0) + (times.soundcheckTime || 0) + (times.changeTime || 0);

  // Setup & soundcheck complete = Arrival + (setup + soundcheck + change)
  const { hhmm: scByHHMM } = addMinutesHHMM(arrivalHHMM, totalPre);

  // Start time = SC complete + 15 mins
  const { hhmm: startHHMM, dayOffset: startOffset } = addMinutesHHMM(scByHHMM, 15);

  // Default finish (when untouched) = 00:00 next day
  const finishHHMM = "00:00";
  const finishDayOffset = 1;

  return {
    arrivalTime: arrivalHHMM,
    setupAndSoundcheckedBy: scByHHMM,
    startTime: startHHMM,
    startDayOffset: startOffset || 0,
    finishTime: finishHHMM,
    finishDayOffset,
  };
};

// Commit defaults for any missing fields in the cart's performance block
const useCommitStandardTimesIfMissing = ({
  displayCartDetails,
  cartItems,
  updatePerformance,
  setPerformancePlans,
  performancePlans,
  selectedDate,
}) => {
  return useCallback(() => {
    (displayCartDetails || []).forEach((item) => {
      const perf = cartItems?.[item.actId]?.[item.lineupId]?.performance || {};
      const needs =
        !perf?.arrivalTime ||
        !perf?.setupAndSoundcheckedBy ||
        !perf?.startTime ||
        !perf?.finishTime;

      if (!needs) return;

      const std = deriveStandardTimesForItem(item, performancePlans, selectedDate);

      // Write to authoritative cart state (what the booking payload uses)
      updatePerformance(item.actId, item.lineupId, {
        arrivalTime: perf.arrivalTime || std.arrivalTime,
        setupAndSoundcheckedBy: perf.setupAndSoundcheckedBy || std.setupAndSoundcheckedBy,
        startTime: perf.startTime || std.startTime,
        finishTime: perf.finishTime || std.finishTime,
        finishDayOffset:
          Number.isInteger(perf.finishDayOffset) ? perf.finishDayOffset : std.finishDayOffset,
      });

      // Mirror to local UI so pickers display the committed defaults
      setPerformancePlans((prev) => ({
        ...prev,
        [item.actId]: {
          ...(prev?.[item.actId] || {}),
          arrivalTime: perf.arrivalTime || std.arrivalTime,
          setupAndSoundcheckedBy: perf.setupAndSoundcheckedBy || std.setupAndSoundcheckedBy,
          startTime: perf.startTime || std.startTime,
          finishTime: perf.finishTime || std.finishTime,
          finishDayOffset:
            Number.isInteger(perf.finishDayOffset) ? perf.finishDayOffset : std.finishDayOffset,
        },
      }));
    });
  }, [
    displayCartDetails,
    cartItems,
    updatePerformance,
    setPerformancePlans,
    performancePlans,
    selectedDate,
  ]);
};

// DEBUG: log whenever the cart's lineup keys change (this confirms the move oldId -> newId actually happened)
  useEffect(() => {
    const nextKeys = getCartLineupKeys(cartItems);
    const prevKeys = prevCartLineupKeysRef.current || {};
    const changes = diffKeys(prevKeys, nextKeys);

    if (changes.length) {
      console.groupCollapsed(
        "%c[CART] lineup keys changed",
        "color:#22c55e;font-weight:700"
      );
      console.log("changes", changes);
      console.log("full", nextKeys);
      console.groupEnd();
    }

    prevCartLineupKeysRef.current = nextKeys;
  }, [cartItems]);

  useEffect(() => {
    if (!Array.isArray(cartDetails) || cartDetails.length === 0) return;
    if (!acts || acts.length === 0) return;
    const roundUpTo60 = (mins) => (mins <= 0 ? 0 : Math.ceil(mins / 60));
    const formatHoursLabel = (mins) => {
      if (mins % 60 === 0) {
        const h = Math.max(1, Math.round(mins / 60));
        return `${h} hour${h !== 1 ? "s" : ""}`;
      }
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h} hour${h !== 1 ? "s" : ""} ${m} mins` : `${m} mins`;
    };

    cartDetails.forEach((item) => {
      try {
        const times = calculateAdjustedTimes(
          item.lineup,
          item.selectedExtras,
          performancePlans[item.actId]?.startTime,
          performancePlans[item.actId]?.setupAndSoundcheckedBy,
          item.actData,
          performancePlans,
          selectedDate
        );

        const { arrivalTime, finishTime } = times || {};
        if (!arrivalTime || !finishTime) {
         
          
          return;
        }

        const eventBase = selectedDate ? new Date(selectedDate) : new Date();
        const midnight = new Date(
          eventBase.getFullYear(),
          eventBase.getMonth(),
          eventBase.getDate() + 1,
          0,
          0,
          0,
          0
        );


        const dismissed = new Set(item.dismissedExtras || []);
        const keyId = makeKey(item.actId, item.lineupId);

        const setOrRemoveExtra = (key, desired) => {
          if (dismissed.has(key)) {
            if (autoAddedFlags[keyId]) {
              setAutoAddedFlags((prev) => {
                const next = { ...prev };
                delete next[keyId];
                return next;
              });
            }
            // if (desired) { } // Removed empty block
            const existing = (item.selectedExtras || []).find(
              (e) => e.key === key
            );
            if (!desired && !existing) return;
            return;
          }
          const existing = (item.selectedExtras || []).find(
            (e) => e.key === key
          );

          if (!desired) {
            if (!existing) {
              return;
            }
            mergedUpdateExtras(item.actId, item.lineupId, {
              key,
              quantity: 0,
              price: 0,
            });
            setAutoAddedFlags((prev) => {
              const next = { ...prev };
              delete next[keyId];
              return next;
            });
            return;
          }

          const same =
            existing &&
            existing.quantity === desired.quantity &&
            existing.price === desired.price &&
            existing.name === desired.name;

          if (same) {
            return;
          }
          mergedUpdateExtras(item.actId, item.lineupId, { key, ...desired });

          if (key === "late_stay_60min_per_band_member") {
            markAutoAdded(item.actId, item.lineupId, "late");
          } else if (key === "early_arrival_60min_per_band_member") {
            markAutoAdded(item.actId, item.lineupId, "early");
          }
        };

// Use the actual chosen finish (UI override if present, otherwise the clamped default)
const finishForLateCalc = finishTime;

// ── LATE STAY ───────────────────────────────
// Charge ONLY for time on site past midnight
const minutesPastMidnight = Math.max(
  0,
  Math.round((finishForLateCalc.getTime() - midnight.getTime()) / 60000)
);
const lateBlocks = roundUpTo60(minutesPastMidnight);
        if (lateBlocks > 0) {
          const members = Array.isArray(item?.lineup?.bandMembers)
            ? item.lineup.bandMembers.filter((m) => !isManagerLike(m)).length
            : 0;
          const per60Net = resolvePerMemberNet(
            item.actData,
            "late_stay_60min_per_band_member",
            Number(item?.lineup?.lateStayFeePer60) || 0
          );
          const totalMins = lateBlocks * 60;
          const price = Math.ceil((per60Net * members * lateBlocks) * 1.33);
          setOrRemoveExtra("late_stay_60min_per_band_member", {
            name: `Late Stay - ${formatHoursLabel(totalMins)}`,
            quantity: 1,
            price,
          });
        } else {
          setOrRemoveExtra("late_stay_60min_per_band_member", null);
        }

        // ── EARLY ARRIVAL ───────────────────────────
        // Charge early arrival for time before the standard 17:00 arrival.
        const standardArrival = new Date(
          eventBase.getFullYear(),
          eventBase.getMonth(),
          eventBase.getDate(),
          17,
          0,
          0,
          0
        );

        const minutesBeforeStandard = Math.max(
          0,
          Math.round(
            (standardArrival.getTime() - arrivalTime.getTime()) / 60000
          )
        );
        const earlyBlocks = roundUpTo60(minutesBeforeStandard);

        if (earlyBlocks > 0) {
          const members = Array.isArray(item?.lineup?.bandMembers)
            ? item.lineup.bandMembers.filter((m) => !isManagerLike(m)).length
            : 0;
          const per60Net = resolvePerMemberNet(
            item.actData,
            "early_arrival_60min_per_band_member",
            Number(item?.lineup?.earlyArrivalFeePer60) || 0
          );
          const totalMins = earlyBlocks * 60;
          const price = Math.ceil((per60Net * members * earlyBlocks) * 1.33);
          setOrRemoveExtra("early_arrival_60min_per_band_member", {
            name: `Early Arrival - ${formatHoursLabel(totalMins)}`,
            quantity: 1,
            price,
          });
        } else {
          setOrRemoveExtra("early_arrival_60min_per_band_member", null);
        }

        const autoExtras = [
          "late_stay_60min_per_band_member",
          "early_arrival_60min_per_band_member",
        ];
        const stillDismissed = (item.dismissedExtras || []).filter((k) =>
          autoExtras.includes(k)
        );
        if (stillDismissed.length !== (item.dismissedExtras || []).length) {
          setCartItems((prev) => {
            const updated = { ...prev };
            if (updated[item.actId] && updated[item.actId][item.lineupId]) {
              updated[item.actId][item.lineupId].dismissedExtras =
                stillDismissed;
            }
            return updated;
          });
        }

       
      } catch (err) {
  console.debug(err);
}
    });
  }, [
    cartDetails,
    mergedUpdateExtras,
    selectedDate,
    setCartItems,
    performancePlans,
    acts, 
    autoAddedFlags,
    setAutoAddedFlags,
    calculateAdjustedTimes,
    markAutoAdded
  ]);

  useEffect(() => {
    setPerformancePlans((prev) => {
      let next = prev;
      (cartDetails || []).forEach((item) => {
        const paExtra =
          cartItems?.[item.actId]?.[item.lineupId]?.selectedExtras?.find(
            (e) => e.key === "pa_late_stay"
          ) ||
          (item.selectedExtras || []).find((e) => e.key === "pa_late_stay");

        if (paExtra?.finishTime) {
          const offset = paExtra.finishTime < "12:00" ? 1 : 0;
          const cur = next[item.actId] || {};
          if (
            cur.paLightsFinishTime !== paExtra.finishTime ||
            (cur.paLightsFinishDayOffset ?? 0) !== offset
          ) {
            next = {
              ...next,
              [item.actId]: {
                ...cur,
                paLightsFinishTime: paExtra.finishTime,
                paLightsFinishDayOffset: offset,
              },
            };
          }
        }
      });
      return next;
    });

    setCartItems((prev) => {
      let changed = false;
      const next = { ...prev };

      (cartDetails || []).forEach((item) => {
        const actId = item.actId;
        const lineupId = item.lineupId;
        const paExtra =
          prev?.[actId]?.[lineupId]?.selectedExtras?.find(
            (e) => e.key === "pa_late_stay"
          ) ||
          (item.selectedExtras || []).find((e) => e.key === "pa_late_stay");

        if (!paExtra?.finishTime) return;

        const offset = paExtra.finishTime < "12:00" ? 1 : 0;

        const actBlock = next[actId] || {};
        const lineupBlock = actBlock[lineupId] || {};
        const perf = lineupBlock.performance || {};

        if (
          perf.paLightsFinishTime !== paExtra.finishTime ||
          (perf.paLightsFinishDayOffset ?? 0) !== offset
        ) {
          next[actId] = {
            ...actBlock,
            [lineupId]: {
              ...lineupBlock,
              performance: {
                ...perf,
                paLightsFinishTime: paExtra.finishTime,
                paLightsFinishDayOffset: offset,
              },
            },
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [cartDetails, cartItems, setPerformancePlans, setCartItems]);

  // --- availability-aware entries ---
// Hide acts that are explicitly unavailable for the selected date
const displayCartDetails = Array.isArray(cartDetails)
  ? cartDetails.filter((item) => !isActUnavailableForSelectedDate(item.actId))
  : [];

  const commitStandardTimesIfMissing = useCommitStandardTimesIfMissing({
  displayCartDetails,
  cartItems,
  updatePerformance,
  setPerformancePlans,
  performancePlans,
  selectedDate,
});

useEffect(() => {
  if (!selectedDate || !selectedAddress) return;
  if (!displayCartDetails || displayCartDetails.length === 0) return;
  commitStandardTimesIfMissing();
}, [selectedDate, selectedAddress, displayCartDetails, commitStandardTimesIfMissing]);



  return (
    <div className="border-t pt-14">
      <div className="text-2xl mb-3">
        <Title text1={"BOOKING"} text2={"DETAILS"} />
      </div>


      {selectedDate && selectedAddress ? (
        <>
          <p className="text-lg font-medium mt-3 p-2 text-gray-600">
            Date:{" "}
            <span className="text-gray-700">{formatDate(selectedDate)}</span>
          </p>
          <p className="text-lg font-medium p-2 text-gray-600">
            Venue: <span className="text-gray-700">{selectedAddress}</span>
          </p>
          <div className="flex flex-col sm:flex-row items-left gap-2 text-lg font-medium justify-right p-2 text-gray-600">
            <p>Event Type:</p>
            <div className="flex gap-2">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="border px-2 py-1 text-lg rounded text-gray-700 flex-1"
              >
                <option>Wedding</option>
                <option>Israeli Wedding</option>
                <option>Private Party</option>
                <option>Corporate Event</option>
                <option>Award Ceremony</option>
                <option>HM Forces Event</option>
                <option>Summer Ball</option>
                <option>Winter Ball</option>
                <option>Christmas Party</option>
                <option>Festival</option>
                <option>Other</option>
              </select>
              {selectedEventType === "Other" && (
                <input
                  type="text"
                  placeholder="Enter custom event type"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  className="border px-2 py-1 text-sm rounded font-medium flex-1"
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm mt-3 p-2 text-gray-600">
          Please select a date and location to checkout
          <span
            onClick={triggerSearch}
            className="text-blue-600 cursor-pointer underline ml-2"
          >
            Add my date and location
          </span>
        </p>
      )}

      <div className="flex flex-col gap-6 text-lg">
        {selectedDate && availLoading && (
  <div className="p-4 text-center text-gray-600">Checking availability…</div>
)}

{displayCartDetails.length === 0 ? (
  <div className="p-8 text-center text-gray-700">
    <p className="text-xl">Your cart is empty</p>
    <p className="mt-2 text-gray-500">
      Add an act to your cart and let’s get this show on the road!
    </p>
    <button
      onClick={() => navigate("/acts") }
      className="mt-4 px-6 py-3 rounded bg-black text-white hover:bg-[#ff6667] transition"
    >
      Browse acts
    </button>
  </div>
) : (
  <div className="flex flex-col gap-6 text-lg">
    {displayCartDetails.map((item, index) => {
 
          const availableLineupsRaw =
  (Array.isArray(item?.actData?.lineups) && item.actData.lineups) ||
  (Array.isArray(item?.allLineups) && item.allLineups) ||
  [];

const availableLineups = availableLineupsRaw.filter((l) => Boolean(normLineupId(l)));

          const autoManagedKeys = new Set([
            "late_stay_60min_per_band_member",
            "early_arrival_60min_per_band_member",
            "pa_late_stay",
            // ceremony & afternoon performance bundles are priced upstream in AcousticExtrasSelector
            "ceremony_performance",
            "afternoon_performance",
          ]);
          const pricedExtras = (item.selectedExtras || []).map((ex) => {
            if (autoManagedKeys.has(ex.key)) {
              // Trust upstream price/label provided by AcousticExtrasSelector or auto logic
              return ex;
            }
            const unitNet = calculateExtraPrice({
              extra: ex,
              act: item.actData,
              lineup: item.lineup,
              address: selectedAddress,
              date: selectedDate,
            });
            const unitGross = Math.ceil(Number(unitNet || 0) * 1.33);
            const qty = Math.max(1, Number(ex.quantity || 1));
            return { ...ex, price: unitGross * qty };
          });


          // Pull performance values saved in cart (if any)
          const perfFromCart =
            cartItems[item.actId]?.[item.lineupId]?.performance || {};
          const arrivalFromCart =
            typeof perfFromCart.arrivalTime === "string"
              ? perfFromCart.arrivalTime
              : "";


          return (
            <div
              key={`${item.actId}:${item.lineupId}`}
              className="relative flex flex-col sm:flex-row bg-white shadow rounded-lg p-4"
            >
              {/* Mobile: show remove button above the thumbnail, not absolute */}
              <div className="mb-2 -mt-2 flex justify-end md:hidden">
                <button
                  onClick={() => removeFromCart(item.actId, item.lineupId)}
                  title="Remove Act"
                  className="p-1 rounded hover:bg-red-50"
                >
                  <img
                    src={assets.bin_icon}
                    alt="Delete"
                    className="w-5 h-5 opacity-70 hover:opacity-100"
                  />
                </button>
              </div>

              {/* Desktop/tablet: keep absolute button in the card corner */}
              <button
                onClick={() => removeFromCart(item.actId, item.lineupId)}
                title="Remove Act"
                className="hidden md:block absolute top-2 right-2 p-1 rounded hover:bg-red-50"
              >
                <img
                  src={assets.bin_icon}
                  alt="Delete"
                  className="w-5 h-5 opacity-70 hover:opacity-100"
                />
              </button>
<div className="flex flex-col md:flex-row gap-4 items-start w-full">
{item.image && (
  <div className="w-full md:w-auto">
    <img
      src={item.image?.url || item.image || ""}
      alt={item.actName}
      className="w-full h-auto max-h-64 object-cover rounded"
      loading="lazy"
      onError={(e) => (e.target.style.display = "none")}
      onClick={() => navigate(`/act/${item.actId}`)}
      style={{ cursor: "pointer" }}
    />
  </div>
)}
<div className="w-full md:flex-1">

                <div className="flex flex-col w-full flex-1 overflow-hidden">
                  <p className="text-2xl text-gray-700 font-medium">
                    {item.actName}
                  </p>
           {/* Availability badge */}
<div className="mt-6">

<div
  className="flex flex-wrap gap-4 items-left ml-4"
>
{(() => {
  const isHttp = (u) => typeof u === "string" && u.startsWith("http");
const norm = (v) => String(v || "").trim().toLowerCase();

const isYes = (d) => {
  const s = norm(d?.state || d?.reply);
  return s === "yes";
};

const isUnavailable = (d) => norm(d?.state || d?.reply) === "unavailable";
  // Availability badge chooser — per-item, using per-act badges map
  const allBadges = (availabilityBadgesByAct?.[item.actId]) || (item.actData?.availabilityBadges) || {};
  const cleanDate = (selectedDate || "").slice(0, 10);
  const badgeKey = Object.keys(allBadges).find(k => k.includes(cleanDate));
  const badge = badgeKey ? allBadges[badgeKey] : null;
  const slots = Array.isArray(badge?.slots) ? badge.slots : [];

  // --- DEBUG GROUP LOGS ---
  console.group(
    `%c[VOCAL-UI]%c ${item.actName} (${item.actId}) – ${cleanDate}`,
    'color:#8b5cf6;font-weight:bold',
    'color:inherit'
  );
  console.log('[raw badges]', {
    actId: item.actId,
    cleanDate,
    keys: Object.keys(allBadges || {}),
    badgeKey,
    hasBadge: !!badge,
    slotsCount: slots.length,
  });

  // Build a unique selection of ALL people who positively replied (lead + deputies)
  const seen = new Set();
  const selection = [];

  const pushUnique = (p, extra = {}) => {
    const musicianId = String(p?.musicianId || p?.id || p?._id || "").trim();
    if (!musicianId || seen.has(musicianId)) return;
    seen.add(musicianId);
    selection.push({
      isDeputy: !!p?.isDeputy || !!extra.isDeputy,
      musicianId,
      photoUrl:
        p?.photoUrl ||
        p?.imageUrl ||
        p?.profilePicture ||
        p?.musicianProfileImage ||
        "",
      profileUrl:
        p?.profileUrl ||
        (musicianId ? `${window.location.origin}/musician/${musicianId}` : ""),
      setAt: p?.setAt || p?.repliedAt || null,
      vocalistName:
        p?.vocalistName ||
        p?.resolvedName ||
        p?.displayName ||
        p?.name ||
        `${p?.firstName || ""} ${p?.lastName || ""}`.trim(),
    });
  };

  // Include LEADS with positive replies
 slots.forEach((slot) => {
  // ✅ only include leads who explicitly said YES (and are not unavailable)
  if (!isUnavailable(slot) && isYes(slot) && isHttp(slot?.photoUrl)) {
    pushUnique(slot, { isDeputy: false });
  }

  // ✅ only include deputies who explicitly said YES
  const deps = Array.isArray(slot?.deputies) ? slot.deputies : [];
  deps.forEach((dep) => {
    if (!isUnavailable(dep) && isYes(dep) && isHttp(dep?.photoUrl)) {
      pushUnique(dep, { isDeputy: true });
    }
  });
});

  console.log('[selection]', selection.map(p => ({ id: p.musicianId, type: p.isDeputy ? 'deputy' : 'lead' })));

  // Prefer badge slot count (each slot = a vocalist position), fallback to lineup-based detection
  const slotCount = Array.isArray(slots) ? slots.length : 0;
  const requiredVocalCount = Math.max(1, slotCount || getRequiredVocalCount(item.actData, item.lineup));
  const leadIdForDate = getLeadIdForDate(item.actData, selectedDate, allBadges);
  console.log('[caps]', { slotCount, requiredVocalCount, leadIdForDate });

  // Per-act selection for this item
  const actSel = toArray(selectedVocalists?.[item.actId]);
  const chosenCount = actSel.length;
  const titlePlural = requiredVocalCount > 1 ? "vocalists" : "vocalist";
  console.log('[state]', { actSel, chosenCount, titlePlural });

  // click handler that enforces max & keeps lead locked, shows toast on selection
  const handlePick = (person, isSelected, isLocked) => {
    const musicianId = person.musicianId;
    if (isLocked) return; // lead is locked (unclickable)

    const lockedIds = leadIdForDate ? new Set([leadIdForDate]) : new Set();
    const selectedSet = new Set(actSel);
    lockedIds.forEach((id) => selectedSet.add(id));

    const selecting = !isSelected;
    if (selecting) {
      const willHave = new Set(selectedSet);
      willHave.add(musicianId);
      if (willHave.size > requiredVocalCount) {
        toast?.info?.(`You can choose up to ${requiredVocalCount} ${titlePlural}.`);
        return;
      }

      const who = (person.vocalistName || '').trim() || 'Vocalist';
      const phr = requiredVocalCount > 1 ? 'one of your vocalists' : 'your vocalist';
      try { toast(<CustomToast type="success" message={`${who} is selected as ${phr}.`} />); } catch {}
    }

    toggleVocalistForAct(item.actId, musicianId);
  };

  if (!selection.length) {
    console.log('⚪ no selection available — nothing to render');
    console.groupEnd();
    return null;
  }

  console.groupEnd();
 return (
  <div className="mt-2">
    {/* Header */}
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-semibold text-gray-700 leading-tight">
        Choose your {titlePlural}
      </h3>

      {requiredVocalCount > 1 && (
        <p className="text-sm text-gray-500">
          ({Math.min(chosenCount, requiredVocalCount)}/{requiredVocalCount} selected)
        </p>
      )}
    </div>

    {/* Badges */}
    <div className="mt-3 flex flex-wrap gap-4">
      {selection.slice(0, 8).map((person, idx) => {
        const isLeadLocked = person.musicianId === leadIdForDate;
        const isSelected = isLeadLocked ? true : actSel.includes(person.musicianId);
        const keyId = `${(selectedDate || "").slice(0, 10)}_${person.musicianId || idx}`;

        return (
          <div
            key={keyId}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            className="inline-block focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLeadLocked) handlePick(person, isSelected, isLeadLocked);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (!isLeadLocked) handlePick(person, isSelected, isLeadLocked);
              }
            }}
            style={{ cursor: isLeadLocked ? "not-allowed" : "pointer" }}
          >
            <FeaturedVocalistBadgeForCart
              pictureSource={person}
              imageUrl={person.photoUrl}
              size={120}
              variant={person.isDeputy ? "deputy" : "lead"}
              musicianId={person.musicianId}
              cacheBuster={person.setAt}
              isSelected={isSelected}
              disabled={false}
              actContext={item.actName}
              dateContext={selectedDate}
            />
          </div>
        );
      })}
    </div>

    {/* Helper note (under badges) */}
    {requiredVocalCount > 1 && selection.length < requiredVocalCount && (
      <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-sm text-gray-600 leading-relaxed">
          Can’t see all {requiredVocalCount} vocalists right now? You’re welcome to book with{" "}
          <span className="font-semibold text-gray-700">
            {Math.min(chosenCount || 1, requiredVocalCount)} selected
          </span>{" "}
          — we’ll allocate the other lead vocalist if they’re available, or a like-for-like deputy.
        </p>
      </div>
    )}
  </div>
);
})()}
</div>


  
</div>

                  {(() => {
                    const times = calculateAdjustedTimes(
                      item.lineup,
                      item.selectedExtras,
                      performancePlans[item.actId]?.startTime,
                      performancePlans[item.actId]?.setupAndSoundcheckedBy,
                      item.actData,
                      performancePlans,
                      selectedDate
                    );
                    return (
                      <>
                        {cartItems?.[item.actId]?.[item.lineupId]
                          ?.selectedAfternoonSets?.length > 0 && (
                          <div className="mt-2 border-b-1 ml-2">
                            <h2 className="font-semibold text-lg text-gray-700 mt-4 border-b-2 pb-3">
                              {(() => {
                                const setTypes = cartItems[item.actId][
                                  item.lineupId
                                ].selectedAfternoonSets
                                  .map((set) => set.type)
                                  .filter(Boolean);
                                const uniqueTypes = [...new Set(setTypes)];
                                if (uniqueTypes.includes("both"))
                                  return "Ceremony & Afternoon Performances";
                                if (
                                  uniqueTypes.includes("ceremony") &&
                                  uniqueTypes.includes("afternoon")
                                )
                                  return "Ceremony & Afternoon Performances";
                                if (uniqueTypes.includes("ceremony"))
                                  return "Ceremony Performance";
                                if (uniqueTypes.includes("afternoon"))
                                  return "Afternoon Performance";
                                return "Acoustic Performances";
                              })()}
                            </h2>
                            <div className="text-gray-700 text-base whitespace-pre-line p-2">
                              {cartItems[item.actId][
                                item.lineupId
                              ].selectedAfternoonSets
                                .filter((set) => set?.name)
                                .map((set, idx) => {
                                  const displayName = set.name
                                    ?.replace(
                                      /^Ceremony & Afternoon Performances:\s*- /,
                                      ""
                                    )
                                    .replace(/^Ceremony Performance:\s*- /, "")
                                    .replace(
                                      /^Afternoon Performance:\s*- /,
                                      ""
                                    );

                                  return (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center pr-2"
                                    >
                                      <div className="flex">
                                        {" "}
                                        <span className="text-gray-700 text-base whitespace-pre-line">
                                          - {displayName}
                                        </span>
                                        <div className="flex items-center">
                                          <button
                                            className="text-gray-400 hover:text-red-500 text-sm flex items-center"
                                           onClick={() => {
  if (selectedDate && selectedAddress) {
    commitStandardTimesIfMissing();
    handleProceedToBooking();
  }
}}
                                          >
                                            <img
                                              className="w-3 h-3 ml-2"
                                              src={assets.cross_icon}
                                              alt="Remove"
                                            />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-700 whitespace-nowrap">
                                          £{set.price}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                            <h2 className="font-semibold text-lg text-gray-700 mt-4 border-b-2 pb-3">
                              Main Performance
                            </h2>
                          </div>
                        )}

                     <div className="flex items-center justify-between w-full gap-4 mt-2">
  <div className="w-full flex flex-col">
    <label className="block font-semibold text-gray-600 text-base mb-1 mt-2">
      Lineup:
    </label>
    <div className="w-full">
   {(() => {
  console.log("🧩 lineup dropdown", {
    act: item.actId,
    current: item.lineupId,
    options: availableLineups.map((l) => normLineupId(l)),
  });
  return null;
})()}
      <select
        className="w-flex border rounded px-2 py-1 ml-2 text-sm text-gray-700"
        value={String(item.lineupId || "")}
        onChange={(e) => {
          const nextVal = String(e.target.value || "");
          console.log("[UI] lineup dropdown changed", {
            actId: String(item.actId),
            from: String(item.lineupId || ""),
            to: nextVal,
          });
          handleLineupChange(item.actId, String(item.lineupId || ""), nextVal);
        }}
      >
         {availableLineups.length === 0 && (
  <option value="" disabled>
    Loading lineups…
  </option>
)}
       {availableLineups.map((l) => {
  const val = normLineupId(l);
  if (!val) return null;
  return (
    <option key={val} value={val}>
      {l.actSize ||
        (Array.isArray(l.bandMembers)
          ? `${l.bandMembers.length}-Piece`
          : "Lineup")}
    </option>
  );
})}
      </select>
    </div>
  </div>

  <span className="text-sm text-gray-700 whitespace-nowrap pr-2">
    £
    {Number(item.adjustedTotal ?? item.subtotalWithMargin ?? 0)}
  </span>
</div>
                        <div className="flex items-center justify-between w-[80%] gap-4 ml-2 mb-2">
                          <p className="text-sm text-gray-600 mt-1">
                            {generateDescription(item.lineup)}
                          </p>
                          {availabilityStatus?.[item.actId]?.status ===
                            "deputy" && (
                            <p className="text-sm text-blue-700 ml-4 mt-1">
                              {availabilityStatus[item.actId].message}
                              {/* Optional: link to deputy profile once you pass musicianId via SSE */}
                              {/* {' '}— <a className="underline" href={`/musician/${encodeURIComponent(availabilityStatus[item.actId]?.musicianId || '')}`}>view profile</a> */}
                            </p>
                          )}
                        </div>

               <div className="w-full max-w-xs sm:max-w-none">

  <label className="block font-semibold text-gray-600 text-base mb-1 mt-2">
    Arrival Time
  </label>
  <div className="w-full ml-2">
    <CustomTimePicker
      value={
        arrivalFromCart ||
        performancePlans[item.actId]?.arrivalTime ||
        toHHMM(times.arrivalTime) ||
        ""
      }
      onChange={(newTime) => {
        // Persist into cart
        updatePerformance(item.actId, item.lineupId, { arrivalTime: newTime });
        // Mirror into local planner state
        setPerformancePlans((prev) => ({
          ...prev,
          [item.actId]: {
            ...prev[item.actId],
            arrivalTime: newTime,
          },
        }));
      }}
    />
  </div>
</div>
                        <div className="flex flex-row gap-1">
                          <label className="font-semibold block text-gray-600 text-base mt-2 ">
                            Setup Time Required:{" "}
                          </label>
                          <p className="text-gray-600 text-base pt-2">
                            {times.setupTime} mins
                          </p>
                        </div>
                        <div className="flex flex-row gap-1">
                          <label className="font-semibold block text-gray-600 text-base mt-2">
                            Soundcheck Time Required:{" "}
                          </label>
                          <p className="text-gray-600 text-base mt-2">
                            {times.soundcheckTime} mins
                          </p>
                        </div>
                        <div className="flex flex-row gap-1">
                          <label className="font-semibold block text-gray-600 text-base mt-2">
                            Change Time Required:
                          </label>
                          <p className="text-gray-700 text-base pt-2">
                            {times.changeTime} mins
                          </p>
                        </div>

              <div className="w-full max-w-xs sm:max-w-none">
                <label className="block font-semibold text-gray-600 text-base mb-1 mt-2">
                  Setup &amp; Soundchecked By:
                </label>
                <div className="w-full ml-2">
                  {(() => {
       


                    return (
                      <CustomTimePicker
                        value={
                          (cartItems[item.actId]?.[item.lineupId]?.performance?.setupAndSoundcheckedBy) ||
                          // default = arrival + (setup + soundcheck + change)
                          addMinutesHHMM(
                            (cartItems[item.actId]?.[item.lineupId]?.performance?.arrivalTime) ||
                            performancePlans[item.actId]?.arrivalTime ||
                            toHHMM(times.arrivalTime) ||
                            "17:00",
                            (times.setupTime || 0) + (times.soundcheckTime || 0) + (times.changeTime || 0)
                          ).hhmm
                        }
                        minHHMM={
                          addMinutesHHMM(
                            (cartItems[item.actId]?.[item.lineupId]?.performance?.arrivalTime) ||
                            performancePlans[item.actId]?.arrivalTime ||
                            toHHMM(times.arrivalTime) ||
                            "17:00",
                            (times.setupTime || 0) + (times.soundcheckTime || 0) + (times.changeTime || 0)
                          ).hhmm
                        }
                        minDayOffset={0}
                        onChange={(newTime) => {
                          updatePerformance(item.actId, item.lineupId, { setupAndSoundcheckedBy: newTime });
                          setPerformancePlans((prev) => ({
                            ...prev,
                            [item.actId]: { ...prev[item.actId], setupAndSoundcheckedBy: newTime },
                          }));
                        }}
                      />
                    );
                  })()}
                </div>
              </div>

      <div className="w-full max-w-xs sm:max-w-none">
        <label className="block font-semibold text-gray-600 text-base mb-1 mt-2">
          Start Time
        </label>
        <div className="w-full ml-2">
          {(() => {
            const arrivalHHMM =
              (cartItems[item.actId]?.[item.lineupId]?.performance?.arrivalTime) ||
              performancePlans[item.actId]?.arrivalTime ||
              toHHMM(times.arrivalTime) ||
              "17:00";

            const totalPre = (times.setupTime || 0) + (times.soundcheckTime || 0) + (times.changeTime || 0);
            const { hhmm: setupMinHHMM } = addMinutesHHMM(arrivalHHMM, totalPre);
            const { hhmm: startMinHHMM, dayOffset: startMinOffset } = addMinutesHHMM(setupMinHHMM, 15);

            return (
              <CustomTimePicker
                value={
                  (cartItems[item.actId]?.[item.lineupId]?.performance?.startTime) ||
                  startMinHHMM
                }
                minHHMM={startMinHHMM}
                minDayOffset={startMinOffset}
                onChange={(newTime) => {
                  updatePerformance(item.actId, item.lineupId, { startTime: newTime });
                  setPerformancePlans((prev) => ({
                    ...prev,
                    [item.actId]: { ...prev[item.actId], startTime: newTime },
                  }));
                }}
              />
            );
          })()}
        </div>
      </div>
<div className="w-full max-w-xs sm:max-w-none">
  <label className="block font-semibold text-gray-600 text-base mb-1 mt-2">
    Act Finish Time
  </label>
  <div className="w-full ml-2">
    {(() => {
      const perf = cartItems[item.actId]?.[item.lineupId]?.performance || {};
      const startHHMM =
        perf.startTime ||
        performancePlans[item.actId]?.startTime ||
        "";

      const hasSavedFinish =
        typeof perf.finishTime === "string" && perf.finishTime.includes(":");

      return (
        <CustomTimePicker
          value={hasSavedFinish ? perf.finishTime : "00:00"}
          enableDayOffset
          dayOffset={
            hasSavedFinish
              ? (Number.isInteger(perf.finishDayOffset) ? perf.finishDayOffset : 0)
              : 1
          }
          onDayOffsetChange={(v) => {
            updatePerformance(item.actId, item.lineupId, { finishDayOffset: v });
            setPerformancePlans((prev) => ({
              ...prev,
              [item.actId]: { ...prev[item.actId], finishDayOffset: v },
            }));
          }}
          minHHMM={startHHMM || null}
          minDayOffset={0}
          onChange={(newTime) => {
            updatePerformance(item.actId, item.lineupId, { finishTime: newTime });
            setPerformancePlans((prev) => ({
              ...prev,
              [item.actId]: { ...prev[item.actId], finishTime: newTime },
            }));
          }}
        />
      );
    })()}
  </div>
</div>
                        {(() => {
                          const perfFromCart =
                            cartItems?.[item.actId]?.[item.lineupId]
                              ?.performance || {};
                          const plan = performancePlans[item.actId] || {};

                          // Prefer values from cart (persisted), fallback to planner state
                          const arrival =
                            perfFromCart.arrivalTime ||
                            plan.arrivalTime ||
                            null;
                          const finish =
                            perfFromCart.finishTime || plan.finishTime || null;

                          const setupComplete =
                            perfFromCart.setupAndSoundcheckedBy ||
                            plan.setupAndSoundcheckedBy;

                          if (!setupComplete || !arrival || !finish)
                            return null;

                          // Convert HH:MM → Date for math
                          const parseToDate = (hhmm) => {
                            if (!hhmm || !hhmm.includes(":")) return null;
                            const [h, m] = hhmm.split(":").map(Number);
                            const d = new Date();
                            d.setHours(h, m, 0, 0);
                            return d;
                          };

                          const arrivalDate = parseToDate(arrival);
                          const finishDate = parseToDate(finish);
                          if (!arrivalDate || !finishDate) return null;

                          let totalTimeOnSite =
                            (finishDate - arrivalDate) / 60000; // minutes
                          if (totalTimeOnSite < 0) {
                            // Handle overnight (finish past midnight)
                            totalTimeOnSite += 24 * 60;
                          }

                          const hasExtension = (item.selectedExtras || []).some(
                            (e) =>
                              e.key === "early_arrival_60min_per_band_member" ||
                              e.key === "late_stay_60min_per_band_member"
                          );

                          const needsNote =
                            totalTimeOnSite > 420 && !hasExtension; // >7 hours

                          if (!needsNote) return null;

                          const formattedHours = Math.floor(
                            totalTimeOnSite / 60
                          );
                          const formattedMinutes = totalTimeOnSite % 60;

                          return (
                            <div className="mt-2 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded p-2 text-sm">
                              ⚠️ <strong>{item.actName}</strong> may not be able
                              to complete their full performance in their
                              contracted time on site (currently{" "}
                              {formattedHours}h {formattedMinutes}m).
                              <br />
                              Please add an <strong>Early Arrival</strong> if
                              they need to be onsite before 5pm, or a{" "}
                              <strong>Late Stay</strong> for post-midnight
                              performances.
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}

                  {(() => {
                    // 1) Detect PA/Lights presence from catalogue values on this act
                    const paRaw = String(item?.actData?.paSystem ?? "").trim();
                    const lightRaw = String(
                      item?.actData?.lightingSystem ?? ""
                    ).trim();

                    // Only treat these specific keys as “has system”
                    const hasPA = ["smallPA", "mediumPA", "largePA"].includes(
                      paRaw
                    );
                    const hasLights = [
                      "smallLight",
                      "mediumLight",
                      "largeLight",
                    ].includes(lightRaw);

                    // 2) Prefer values saved on cartItems.performance; fall back to planner state
                    const perf =
                      cartItems?.[item.actId]?.[item.lineupId]?.performance ??
                      {};
                    const plan = performancePlans[item.actId] ?? {};

                    const paFinish =
                      (typeof perf.paLightsFinishTime === "string" &&
                        perf.paLightsFinishTime) ||
                      (typeof plan.paLightsFinishTime === "string" &&
                        plan.paLightsFinishTime) ||
                      "";

                    const paFinishOffset = Number.isInteger(
                      perf.paLightsFinishDayOffset
                    )
                      ? perf.paLightsFinishDayOffset
                      : Number.isInteger(plan.paLightsFinishDayOffset)
                        ? plan.paLightsFinishDayOffset
                        : 0;

                    // 3) Nothing to show if no systems or no time set
                    if (!(hasPA || hasLights)) return null;
                    if (!paFinish) return null;

                    // 4) Render
                    return (
                      <div className="flex items-center gap-2">
                        <label className="font-semibold block text-gray-600 text-base p-2 ml-2">
                          {hasPA && hasLights
                            ? "PA & Lights Finish Time:"
                            : hasPA
                              ? "PA Finish Time:"
                              : "Lights Finish Time:"}
                        </label>
                        <span className="text-base text-gray-700 p-2">
                          {paFinish}
                          {paFinishOffset === 1 ? " (next day)" : ""}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Performance Plan */}
                 <div className="w-full flex flex-col mt-2">
                    <label className="font-semibold text-gray-600 text-base">
                      Performance Plan:
                    </label>
                    <div className="w-full mt-1">
                      <select
                        className="w-flex border rounded px-3 py-1 text-sm text-gray-700"
                        value={
                          (cartItems?.[item.actId]?.[item.lineupId]?.performance?.planIndex ??
                            performancePlans[item.actId]?.planIndex ??
                            "")
                        }
                        onChange={(e) =>
                          handlePerformancePlanChange(
                            item.actId,
                            item.lineupId,
                            e.target.value,
                            item.actData
                          )
                        }
                      >
                        {(item.actData?.numberOfSets || []).map((sets, i) => {
                          const length = item.actData.lengthOfSets[i];
                          const interval = item.actData.minimumIntervalLength[i];
                          if (sets && length && interval) {
                            return (
                              <option key={i} value={i}>
                                {sets}x {length} mins sets,{' '}
                                {sets > 2
                                  ? `with at least ${interval}-min breaks`
                                  : `with at least a ${interval}-min break`}
                              </option>
                            );
                          }
                          return null;
                        })}
                        <option value="">TBC</option>
                      </select>
                    </div>
                  </div>

                  {/* Complimentary Inclusions */}
                  {(() => {
                    const comp =
                      item.actData?.extras?.complimentary ||
                      (item.actData?.extras?.background_music_playlist
                        ?.complimentary
                        ? "background_music_playlist"
                        : null);
                    const offReq = item.actData?.offRepertoireRequests;
                    const paSize = item.actData?.paSystem;
                    const lightSize = item.actData?.lightingSystem;

                    if (!comp && !offReq && !paSize && !lightSize) return null;

                    const formatSystem = (type) => {
                      switch (type) {
                        case "smallPA":
                        case "smallLight":
                          return "a small";
                        case "mediumPA":
                        case "mediumLight":
                          return "a medium";
                        case "largePA":
                        case "largeLight":
                          return "a large";
                        default:
                          return "";
                      }
                    };

                    const paLabel = paSize
                      ? `${formatSystem(paSize)} PA system`
                      : "";
                    const lightLabel = lightSize
                      ? `${formatSystem(lightSize)} lighting system`
                      : "";

                    const inclusions = [
                      comp === "background_music_playlist"
                        ? "Background music playlist"
                        : comp
                          ? "complimentary extras"
                          : null,
                      offReq
                        ? `${offReq} special request${offReq > 1 ? "s" : ""}`
                        : null,
                      paLabel,
                      lightLabel,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div className="flex flex-row gap-2">
                        <label className="font-semibold block text-gray-600 text-base mt-2">
                          Complimentary Inclusions:
                        </label>
                        <span className="text-gray-700 text-base pt-2">
                          {inclusions}
                        </span>
                      </div>
                    );
                  })()}

                  {cartItems?.[item.actId]?.[item.lineupId]?.songSuggestions
                    ?.length > 0 && (
                    <div className="flex flex-row gap-2">
                      <p className="font-semibold block text-gray-600 text-base p-2 ml-2">
                        Setlist Suggestions:
                      </p>
                      <ul className="list-disc list-inside text-gray-700 text-base pt-2">
                        {cartItems[item.actId][
                          item.lineupId
                        ].songSuggestions.map((song, idx) => (
                          <li key={`${song.title}-${idx}`}>
                            {song.title} – {song.artist}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="w-full">
                    {/* Enhance Your Booking - EXTRAS Carousel */}
                    <ExtrasCarousel
                      extras={item.actData.extras}
                      pricedExtras={pricedExtras}
                      selectedExtras={item.selectedExtras}
                      lineup={item.lineup}
                      cartItems={cartItems}
                      setCartItems={setCartItems}
                      actId={item.actId}
                      lineupId={item.lineupId}
                      updateExtras={mergedUpdateExtras}
                      actName={item.actName}
                      allLineups={item.allLineups}
                      selectedAddress={selectedAddress}
                      actData={item.actData}
                      onPaFinishChange={handleOverridePaFinishTime}
                      onOverridePaFinishTime={handleOverridePaFinishTime}
                      onOverrideFinishTime={handleOverrideFinishTime}
                      onLateStayRemoved={() => clearFinishOverride(item.actId)}
                      onOverrideArrivalTime={(actId, lineupId, { hhmm }) => {
                        setPerformancePlans((prev) => ({
                          ...prev,
                          [actId]: {
                            ...prev[actId],
                            arrivalTime: hhmm,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            </div>
          );
         })}
  </div>
)}
      
        
      </div>

      {/* Cart Total and Payment Info */}
      <div className="flex flex-col sm:flex-row justify-end my-20 gap-8">
        {/* Payment Info Box */}
        <div className="w-full sm:w-auto sm:max-w-[400px] bg-white border border-gray-200 rounded-md p-4 shadow-sm text-sm text-gray-700 self-start">
          <h3 className="font-semibold text-gray-800 mb-2 text-base">
            Payment Options
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>
              We accept card payments via <strong>Stripe</strong>.
            </li>
            <li>
              You can also pay with <strong>PayPal</strong> (including{" "}
              <strong>PayPal Pay in 3</strong>) and <strong>Klarna</strong> via
              Stripe where available. Eligibility, approval and order limits are
              set by PayPal/Klarna and shown at checkout, and may involve a soft
              credit check.{" "}
            </li>
            <li>
              If your event is more than 28 days away, you’ll pay a deposit now
              and the remaining balance is due 14 days before your event. If
              your event is 28 days or fewer away, the full amount is payable at
              the time of booking.
            </li>
          </ul>
          <div className="flex flex-row items-center gap-2">
            <img
              src={assets.stripe}
              alt="Stripe Payments"
              className="mt-4 w-full max-w-[90px] mx-auto"
            />
            <img
              src={assets.paypal_pay_in_three}
              alt="PayPal Pay in 3"
              className="mt-2 w-full max-w-[90px] mx-auto"
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <img
              src={assets.klarna}
              alt="Klarna"
              className="mt-2 w-full max-w-[90px] mx-auto"
            />
          </div>
        </div>

        {/* Cart Summary and Button */}
        <div className="w-full sm:w-[450px]">
         {cartDetails?.length > 0 ? (
  <CartTotal />
) : (
  <p className="text-gray-500">Your cart is empty.</p>
)}
          <div className="w-full text-end">
         <button
  onClick={handleProceedToBooking}
  className={`hidden sm:inline-block bg-black text-white text-sm my-8 px-8 py-3 rounded transition-colors duration-300 ${
    canProceedToBooking ? "hover:bg-[#ff6667] cursor-pointer" : "opacity-50 cursor-not-allowed"
  }`}
  disabled={!canProceedToBooking}
>
  PROCEED TO BOOK
</button>
            {/* Mobile sticky footer */}
<div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-inner md:hidden z-50">
 <button
  onClick={handleProceedToBooking}
  disabled={!canProceedToBooking}
  className={`w-full bg-black text-white font-semibold py-3 rounded shadow transition ${
    canProceedToBooking ? "hover:bg-black" : "opacity-50 cursor-not-allowed"
  }`}
>
  PROCEED TO BOOK
</button>
</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function useMergedUpdateExtras(cartItems, setCartItems) {
  return useCallback(
    (actId, lineupId, extra) => {
      setCartItems((prev) => {
        // Fast path: if prev is empty and we're trying to remove, do nothing
        if (!extra || !actId || !lineupId) return prev;

        const prevAct = prev[actId];
        const prevLineup = prevAct?.[lineupId];
        const prevExtras = prevLineup?.selectedExtras || [];

        // Find existing entry (if any)
        const existingIdx = prevExtras.findIndex((e) => e.key === extra.key);
        const exists = existingIdx !== -1;

        // If removing (quantity is 0/falsy or extra is null) and it doesn't exist -> no change
        const isRemoval = !extra || Number(extra.quantity) <= 0;
        if (isRemoval && !exists) return prev;

        // If updating/adding and it already exists with identical payload -> no change
        if (
          !isRemoval &&
          exists &&
          prevExtras[existingIdx].quantity === extra.quantity &&
          prevExtras[existingIdx].price === extra.price &&
          prevExtras[existingIdx].name === extra.name
        ) {
          return prev;
        }

        // Build next state immutably, cloning only what we touch
        const next = { ...prev };
        const nextAct = { ...(prevAct || {}) };
        // Start from the existing lineup object so we don't drop other fields
        const nextLineup = {
          ...(prevLineup || {}),
          // Ensure quantity is preserved (default to 1 if truly missing)
          quantity: prevLineup?.quantity ?? 1,
          // Work on a cloned extras array
          selectedExtras: [...prevExtras],
        };

        if (isRemoval) {
          nextLineup.selectedExtras = nextLineup.selectedExtras.filter(
            (e) => e.key !== extra.key
          );
        } else if (exists) {
          nextLineup.selectedExtras[existingIdx] = { ...extra };
        } else {
          nextLineup.selectedExtras.push({ ...extra });
        }

        nextAct[lineupId] = nextLineup;
        next[actId] = nextAct;
       
        return next;
      });
    },
    [setCartItems]
  );
}

export default Cart;

  