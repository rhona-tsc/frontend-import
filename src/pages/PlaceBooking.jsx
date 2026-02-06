// Make sure to install react-signature-canvas:
// npm install react-signature-canvas
import React, { useContext, useState, useEffect, useMemo, useRef } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { ShopContext } from "../context/ShopContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import calculateActPricing from "../pages/utils/pricing";
import SignaturePad from "react-signature-canvas";

// Static booking ID generator: persists same ID for session
const generateBookingId = (dateStr, lastName) => {
  const date = new Date(dateStr);
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, "");
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `${yymmdd}-${(lastName || "TSC").toUpperCase()}-${randomDigits}`;
};

const PlaceBooking = () => {
  const {
    cartItems,
    acts,
    selectedAddress,
    selectedDate,
    backendUrl,
    selectVocalistForAct,
    selectedVocalists,
  } = useContext(ShopContext);

  const [eventType, setEventType] = useState("Wedding");
  const navigate = useNavigate();
  const [actsSummaryState, setActsSummaryState] = useState([]);
  const [bookedActsRemote, setBookedActsRemote] = useState("");
  // Always start at the top when this page mounts
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  // Logged-in user snapshot (from localStorage)
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = storedUser?._id || null;
  const userEmail = storedUser?.email || null;
  console.log("👤 PlaceBooking userId:", userId);

  // Client details to include in contract & booking doc
  const [userAddress, setUserAddress] = useState({
    firstName: "",
    lastName: "",
    email: userEmail || "",
    phone: "",
    street: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
  });

  const [signaturePad, setSignaturePad] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [bookingId, setBookingId] = useState("");

  // Auto-generate a readable bookingId once we have last name + date
  useEffect(() => {
    if (userAddress.lastName && selectedDate && !bookingId) {
      setBookingId(generateBookingId(selectedDate, userAddress.lastName));
    }
  }, [userAddress.lastName, selectedDate, bookingId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserAddress((prev) => ({ ...prev, [name]: value }));
  };

  // ---- Submit (create Stripe session + persist booking) ----
const handleSubmit = async () => {
  // ----------------------------
  // Helpers
  // ----------------------------
  const daysUntilCorrect = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date();
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ev = new Date(dateStr);
    const d1 = new Date(ev.getFullYear(), ev.getMonth(), ev.getDate());
    return Math.ceil((d1 - d0) / (1000 * 60 * 60 * 24));
  };

  const toNumberPrice = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/[^\d.]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const roundToPennies = (n) => Math.round(Number(n || 0) * 100) / 100;
  const roundUpToPound = (n) => Math.ceil(Number(n || 0));

  // ----------------------------
  // Gatekeeping
  // ----------------------------
  const dte = daysUntilCorrect(selectedDate);
  const clientWantsFull = dte != null && dte <= 28;

  if (!termsAccepted) {
    alert("Please accept the terms and conditions before booking.");
    return;
  }
  if (!signaturePad || signaturePad.isEmpty()) {
    alert("Please provide a signature before booking.");
    return;
  }

  // ✅ freshest cart snapshot (state > localStorage)
  const cartItemsFresh = (() => {
    const fromState = cartItems && typeof cartItems === "object" ? cartItems : null;
    if (fromState && Object.keys(fromState).length) return fromState;

    try {
      const raw = localStorage.getItem("cartItems");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  })();

  const actsSummary = [];

  try {
    if (!cartItemsFresh || Object.keys(cartItemsFresh).length === 0) {
      alert("Your cart appears to be empty. Please go back, select a lineup, then try again.");
      return;
    }

    const actsArr = Array.isArray(acts) ? acts : [];

    // ----------------------------
    // Resolve full act + lineup
    // ----------------------------
    const fetchFullAct = async (id) => {
      if (!backendUrl || !id) return null;

      const candidates = [
        `${backendUrl}/api/act/${id}`,
        `${backendUrl}/api/act/get/${id}`,
        `${backendUrl}/api/act/single/${id}`,
        `${backendUrl}/api/act/one/${id}`,
      ];

      for (const url of candidates) {
        try {
          const res = await axios.get(url);
          const payload = res?.data;
          const act = payload?.act || payload?.data || payload;
          if (act && (act?._id || act?.id)) return act;
        } catch {
          // try next
        }
      }
      return null;
    };

    const resolveActFromCart = async (cartActKey) => {
      const direct = actsArr.find((a) => String(a?._id ?? a?.id) === String(cartActKey));
      if (direct) {
        const hasLineups = Array.isArray(direct?.lineups) && direct.lineups.length > 0;
        if (hasLineups) return direct;

        const full = await fetchFullAct(direct?._id || direct?.id || cartActKey);
        return full || direct;
      }

      const fullByKey = await fetchFullAct(cartActKey);
      if (fullByKey) return fullByKey;

      const lineupIdsObj =
        cartItemsFresh &&
        cartItemsFresh[cartActKey] &&
        typeof cartItemsFresh[cartActKey] === "object"
          ? cartItemsFresh[cartActKey]
          : null;

      const lineupIds = lineupIdsObj ? Object.keys(lineupIdsObj) : [];
      if (!lineupIds.length) return null;

      const lineupIdSet = new Set(lineupIds.map((x) => String(x)));

      const byLineup = actsArr.find(
        (a) =>
          Array.isArray(a?.lineups) &&
          a.lineups.some((l) => lineupIdSet.has(String(l?._id ?? l?.lineupId)))
      );

      if (byLineup) {
        const hasLineups = Array.isArray(byLineup?.lineups) && byLineup.lineups.length > 0;
        if (hasLineups) return byLineup;

        const full = await fetchFullAct(byLineup?._id || byLineup?.id);
        return full || byLineup;
      }

      return null;
    };

    const selectedCounty = selectedAddress?.split(",").slice(-2)[0]?.trim() || "";

    console.log("🛒 cartItemsFresh keys:", Object.keys(cartItemsFresh));
    console.log("🎭 acts loaded:", actsArr.length);

    // ----------------------------
    // Build actsSummary (still used for contracts / booking creation)
    // ----------------------------
    for (const actId in cartItemsFresh) {
      let act = await resolveActFromCart(actId);
      const chosenVocalists = selectedVocalists?.[actId] || [];

      if (!act) {
        console.warn("❌ Could not resolve act for cart key:", actId);
        continue;
      }

      if (!Array.isArray(act?.lineups) || act.lineups.length === 0) {
        const full = await fetchFullAct(act?._id || act?.id || actId);
        if (full && Array.isArray(full?.lineups) && full.lineups.length) {
          act = full;
        } else {
          alert(
            "We couldn't load the lineup details for this act at checkout.\n\n" +
              "Please go back to the cart, refresh the page, re-select your lineup, and try again."
          );
          return;
        }
      }

      for (const lineupId in cartItemsFresh[actId]) {
        const cartLine = cartItemsFresh[actId][lineupId] || {};
        const {
          quantity = 1,
          selectedExtras = [],
          selectedAfternoonSets = [],
          dismissedExtras = [],
          formattedPrice,
        } = cartLine;

        let lineup =
          (act.lineups || []).find(
            (l) => String(l._id) === String(lineupId) || String(l.lineupId) === String(lineupId)
          ) || null;

        if (!lineup) {
          const full = await fetchFullAct(act?._id || act?.id || actId);
          if (full && Array.isArray(full?.lineups)) {
            act = full;
            lineup =
              (act.lineups || []).find(
                (l) => String(l._id) === String(lineupId) || String(l.lineupId) === String(lineupId)
              ) || null;
          }
        }

        if (!lineup) {
          alert(
            "Your selected lineup could not be found (it may be out of date).\n\n" +
              "Please go back to the cart, re-select the lineup for this act, then try again."
          );
          return;
        }

        // Pricing snapshot for summary (NOT for Stripe anymore)
        let fee = 0,
          travel = 0,
          travelCalculated = false;

        try {
          const res = await calculateActPricing(
            act,
            selectedCounty,
            selectedAddress,
            selectedDate,
            lineup
          );
          fee = toNumberPrice(res?.fee || 0);
          travel = toNumberPrice(res?.travel || 0);
          travelCalculated = !!res?.travelCalculated;
        } catch {
          // fallback: use formattedPrice as total snapshot if needed
          const totalFallback = toNumberPrice(formattedPrice || 0);
          fee = totalFallback;
          travel = 0;
          travelCalculated = false;
        }

        // performance block (kept)
        const perfSource = cartLine.performance || {};
        const cartPerf = {
          ...perfSource,
          arrivalTime: perfSource.arrivalTime ?? cartLine.arrivalTime ?? "",
          setupAndSoundcheckedBy:
            perfSource.setupAndSoundcheckedBy ?? cartLine.setupAndSoundcheckedBy ?? "",
          startTime: perfSource.startTime ?? cartLine.startTime ?? "",
          finishTime: perfSource.finishTime ?? cartLine.finishTime ?? "",
          finishDayOffset: perfSource.finishDayOffset ?? cartLine.finishDayOffset ?? 0,
          paLightsFinishTime: perfSource.paLightsFinishTime ?? cartLine.paLightsFinishTime ?? "",
          paLightsFinishDayOffset:
            perfSource.paLightsFinishDayOffset ?? cartLine.paLightsFinishDayOffset ?? 0,
          planIndex: perfSource.planIndex ?? cartLine.planIndex,
          plan: perfSource.plan ?? cartLine.plan,
        };

        const toInt = (v, def = 0) => {
          const n = Number(v);
          return Number.isInteger(n) ? n : def;
        };

        const perf = {
          arrivalTime: cartPerf.arrivalTime || "",
          setupAndSoundcheckedBy: cartPerf.setupAndSoundcheckedBy || "",
          startTime: cartPerf.startTime || "",
          finishTime: cartPerf.finishTime || "",
          finishDayOffset: toInt(cartPerf.finishDayOffset, 0),

          planIndex: Number.isFinite(Number(cartPerf.planIndex)) ? Number(cartPerf.planIndex) : undefined,
          plan: cartPerf.plan
            ? {
                sets: Number(cartPerf.plan?.sets) || undefined,
                length: Number(cartPerf.plan?.length) || undefined,
                minInterval: Number(cartPerf.plan?.minInterval) || undefined,
              }
            : undefined,

          paLightsFinishTime: cartPerf.paLightsFinishTime || "",
          paLightsFinishDayOffset: toInt(cartPerf.paLightsFinishDayOffset, 0),
        };

        const lineupSnapshot = {
          lineupId: String(lineup._id || lineup.lineupId || lineupId),
          actSize:
            lineup.actSize ||
            (Array.isArray(lineup.bandMembers) ? `${lineup.bandMembers.length}-Piece` : ""),
          bandMembers: Array.isArray(lineup.bandMembers)
            ? lineup.bandMembers.map((m) => ({
                firstName: m.firstName || "",
                lastName: m.lastName || "",
                instrument: m.instrument || "",
                isEssential: !!m.isEssential,
                additionalRoles: Array.isArray(m.additionalRoles)
                  ? m.additionalRoles.map((r) => ({
                      role: r.role || "",
                      isEssential: !!r.isEssential,
                    }))
                  : [],
              }))
            : [],
        };

        actsSummary.push({
          cartActKey: String(actId),
          actId: String(act?._id ?? actId),
          actName: act.name,
          tscName: act.tscName,
          actSlug: act.slug || null,
          image: act?.profileImage?.[0] || act?.images?.[0] || null,

          bandMembers: lineupSnapshot.bandMembers,
          chosenVocalists: (chosenVocalists || []).map((id) => ({ musicianId: id })),

          lineupId: String(lineupId),
          lineupLabel: lineup?.actSize || "",
          lineup: lineupSnapshot,
          bandMembersCount: Array.isArray(lineup?.bandMembers) ? lineup.bandMembers.length : null,

          quantity: Number(quantity) || 1,

          prices: {
            base: fee,
            travel,
            subtotalWithMargin: fee + travel,
            adjustedTotal: fee + travel,
            travelCalculated,
          },

          selectedExtras: (selectedExtras || []).map((ex) => ({
            key: ex.key,
            name: ex.name,
            quantity: Number(ex.quantity || 0),
            price: toNumberPrice(ex.price || 0),
            finishTime: ex.finishTime || null,
            arrivalTime: ex.arrivalTime || null,
          })),

          selectedAfternoonSets: (selectedAfternoonSets || []).map((s) => ({
            key: s.key,
            name: s.name,
            type: s.type || null,
            price: toNumberPrice(s.price || 0),
          })),

          dismissedExtras: Array.isArray(dismissedExtras) ? [...dismissedExtras] : [],

          performance: perf,
          venueAddress: selectedAddress || "",
          eventDate: selectedDate || null,
        });
      }
    }

    setActsSummaryState([...actsSummary]);

    if (!actsSummary.length) {
      alert("We couldn't build your booking summary. Please refresh and try again.");
      return;
    }

    // ----------------------------
    // ✅ Single-item Stripe total (source of truth)
    // ----------------------------
    // Use actsSummary + extras to compute the total you display in the cart.
    // IMPORTANT: if your cart UI uses a different value, swap this to that exact value.
    const fullAmountRaw = roundToPennies(
      actsSummary.reduce((sum, item) => {
        const perUnit =
          Number(item?.prices?.adjustedTotal || 0) +
          (item.selectedExtras || []).reduce((s, ex) => s + (Number(ex.price) || 0), 0);
        return sum + perUnit * (item.quantity || 1);
      }, 0)
    );

    // Match backend rule: total rounded UP to whole pounds before deposit
    const cartTotal = roundUpToPound(fullAmountRaw);

    if (!Number.isFinite(cartTotal) || cartTotal <= 0) {
      alert(
        "We couldn't calculate your total at checkout.\n\n" +
          "Please refresh the page and try again."
      );
      return;
    }

    const cartDetailsSingle = [
      {
        name: "Booking: Cart Total",
        price: cartTotal,
        quantity: 1,
      },
    ];

    console.log("💷 fullAmountRaw:", fullAmountRaw);
    console.log("💷 cartTotal (rounded up):", cartTotal);
    console.log("🧾 cartDetailsSingle:", cartDetailsSingle);

    // Deposit shown to user (backend will calculate again, but this is handy for UI/debug)
    const depositRate = 0.33;
    const depositAmount = roundToPennies(cartTotal * depositRate);

    const signatureImage = signaturePad.getTrimmedCanvas().toDataURL("image/png");
    const endpoint = `${backendUrl}/api/booking/create-checkout-session`;
    const performanceTimesTop = actsSummary[0]?.performance ? { ...actsSummary[0].performance } : null;

    const stripeResponse = await axios.post(endpoint, {
      cartDetails: cartDetailsSingle, // ✅ IMPORTANT: single item only
      actsSummary,

      performanceTimes: performanceTimesTop || undefined,
      selectedVocalists,

      eventType,
      date: selectedDate,
      venueAddress: selectedAddress,
      venue: selectedAddress,

      pricesIncludeMargin: true, // ✅ prevents backend markup

      customer: userAddress,
      signature: signatureImage,

      paymentMode: clientWantsFull ? "full" : "deposit",

      totals: {
        fullAmount: cartTotal,
        depositAmount,
        isLessThanFourWeeks: clientWantsFull,
        currency: "GBP",
      },

      cartMeta: {
        selectedAddress,
        selectedDate,
        currency: "GBP",
      },

      bookingId,
      userId,
      userEmail,
    });

    if (stripeResponse.data?.url) {
      window.location.href = stripeResponse.data.url;
      return;
    }

    alert("We couldn’t start checkout — no redirect URL returned.");
  } catch (err) {
    const serverMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message;
    console.error("❌ Booking failed:", serverMsg, err?.response?.data || {});
    alert(`Booking failed.\n\nDetails: ${serverMsg || "Unknown error"}`);
  }
};

  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "TBC";

  const bookedActs = useMemo(() => {
    const actIds =
      cartItems && typeof cartItems === "object" ? Object.keys(cartItems) : [];

    const resolveActName = (cartActKey) => {
      const actsArr = Array.isArray(acts) ? acts : [];

      // 1) direct id match
      const direct = actsArr.find(
        (a) => String(a?._id ?? a?.id) === String(cartActKey)
      );
      if (direct) return direct?.tscName || direct?.name || "";

      // 2) fallback: match act by lineup ids stored under this cart key
      const lineupIdsObj =
        cartItems &&
        cartItems[cartActKey] &&
        typeof cartItems[cartActKey] === "object"
          ? cartItems[cartActKey]
          : null;
      const lineupIds = lineupIdsObj ? Object.keys(lineupIdsObj) : [];
      if (lineupIds.length) {
        const lineupIdSet = new Set(lineupIds.map((x) => String(x)));
        const byLineup = actsArr.find(
          (a) =>
            Array.isArray(a?.lineups) &&
            a.lineups.some((l) =>
              lineupIdSet.has(String(l?._id ?? l?.lineupId))
            )
        );
        if (byLineup) return byLineup?.tscName || byLineup?.name || "";
      }

      // 3) fallback: resolve from summary state (either cartActKey or real actId)
      const fromSummary = (actsSummaryState || []).find(
        (s) => String(s?.cartActKey ?? s?.actId) === String(cartActKey)
      );
      if (fromSummary) return fromSummary?.tscName || fromSummary?.actName || "";

      return "";
    };

    const names = actIds.map(resolveActName).filter(Boolean);
    return names.length ? names.join(" + ") : "TBC";
  }, [cartItems, acts, actsSummaryState]);

  // Fallback: if bookedActs is still TBC, try to resolve act names directly from backend
  const lastBookedActsRemoteSigRef = useRef("");
  useEffect(() => {
    if (bookedActs !== "TBC") {
      // if local resolution succeeds, ensure remote fallback is cleared
      if (bookedActsRemote) setBookedActsRemote("");
      return;
    }

    const cartActIds =
      cartItems && typeof cartItems === "object" ? Object.keys(cartItems) : [];
    if (!cartActIds.length || !backendUrl) return;

    // Avoid repeating the same fetch endlessly
    const sig = `${cartActIds.join(",")}|backend:${backendUrl}`;
    if (lastBookedActsRemoteSigRef.current === sig) return;
    lastBookedActsRemoteSigRef.current = sig;

    const tryFetchActById = async (id) => {
      const candidates = [
        `${backendUrl}/api/act/${id}`,
        `${backendUrl}/api/act/get/${id}`,
        `${backendUrl}/api/act/single/${id}`,
        `${backendUrl}/api/act/one/${id}`,
      ];

      for (const url of candidates) {
        try {
          const res = await axios.get(url);
          const payload = res?.data;
          // support common shapes: {act: {...}} or direct act object
          const act = payload?.act || payload?.data || payload;
          const tscName = act?.tscName || act?.name || "";
          if (tscName) return { tscName, act };
        } catch (e) {
          // ignore and try next candidate
        }
      }
      return null;
    };

    (async () => {
      const actsArr = Array.isArray(acts) ? acts : [];
      const results = await Promise.all(
        cartActIds.map(async (id) => {
          const fetched = await tryFetchActById(id);
          let name = fetched?.tscName || "";

          // If fetched is a Test act, try to map to a real/live card by stripping the prefix
          if (name && /^test\s+/i.test(name) && actsArr.length) {
            const stripped = name.replace(/^test\s+/i, "").trim();
            const real = actsArr.find(
              (a) =>
                String(a?.tscName || "").trim().toLowerCase() ===
                stripped.toLowerCase()
            );
            if (real?.tscName || real?.name) {
              name = real.tscName || real.name;
            }
          }

          return { id, name };
        })
      );

      const names = results.map((r) => r.name).filter(Boolean);
      const joined = names.length ? names.join(" + ") : "";

      console.log("🧾 bookedActs remote fallback", {
        bookedActs,
        cartActIds,
        resolvedNames: results,
        joined,
        note:
          joined
            ? "Using backend-resolved act names because local match was TBC."
            : "Backend fallback couldn't resolve names (endpoint mismatch or permissions).",
      });

      if (joined) setBookedActsRemote(joined);
    })();
  }, [bookedActs, bookedActsRemote, cartItems, backendUrl, acts]);

  const bookedActsDisplay = bookedActsRemote || bookedActs;

  // Debug: if bookedActs stays as TBC, log *why* (ID mismatch vs acts not loaded yet)
  const lastBookedActsDebugSigRef = useRef("");
  useEffect(() => {
    if (bookedActs !== "TBC") return;

    const cartActIds =
      cartItems && typeof cartItems === "object" ? Object.keys(cartItems) : [];
    const actsArr = Array.isArray(acts) ? acts : [];

    // Only log once per unique (cartActIds + actsCount) combo to avoid console spam
    const sig = `${cartActIds.join(",")}|acts:${actsArr.length}`;
    if (lastBookedActsDebugSigRef.current === sig) return;
    lastBookedActsDebugSigRef.current = sig;

    const sampleActs = actsArr.slice(0, 8).map((a) => ({
      _id: a?._id,
      id: a?.id,
      tscName: a?.tscName,
      name: a?.name,
    }));

    const resolution = cartActIds.map((actId) => {
      const match = actsArr.find(
        (a) => String(a?._id ?? a?.id) === String(actId)
      );

      const lineupIdsObj =
        cartItems && cartItems[actId] && typeof cartItems[actId] === "object"
          ? cartItems[actId]
          : null;
      const lineupIds = lineupIdsObj ? Object.keys(lineupIdsObj) : [];
      const lineupIdSet = new Set(lineupIds.map((x) => String(x)));

      const matchByLineup = actsArr.find(
        (a) =>
          Array.isArray(a?.lineups) &&
          a.lineups.some((l) => lineupIdSet.has(String(l?._id ?? l?.lineupId)))
      );

      const fromSummary = (actsSummaryState || []).find(
        (s) => String(s?.cartActKey ?? s?.actId) === String(actId)
      );

      return {
        cartActId: actId,
        matchedInActs: !!match,
        matchedByLineup: !!matchByLineup,
        matchedAct: match
          ? {
              _id: match?._id,
              id: match?.id,
              tscName: match?.tscName,
              name: match?.name,
            }
          : null,
        matchedActByLineup: matchByLineup
          ? {
              _id: matchByLineup?._id,
              id: matchByLineup?.id,
              tscName: matchByLineup?.tscName,
              name: matchByLineup?.name,
            }
          : null,
        matchedInActsSummary: !!fromSummary,
        matchedSummary: fromSummary
          ? {
              actId: fromSummary?.actId,
              tscName: fromSummary?.tscName,
              actName: fromSummary?.actName,
            }
          : null,
      };
    });

    console.log("🧾 bookedActs is TBC — debug", {
      bookedActs,
      bookedActsRemote,
      cartActIds,
      actsCount: actsArr.length,
      sampleActs,
      resolution,
      hint:
        actsArr.length === 0
          ? "acts[] is empty here (likely still loading)."
          : "acts[] is loaded — if matchedInActs=false, the cart actId keys probably don't match act._id/id.",
    });
  }, [bookedActs, bookedActsRemote, cartItems, acts, actsSummaryState]);

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t pb-24 sm:pb-0">
      {/* Left - User Address */}
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1={"YOUR"} text2={"DETAILS"} />
        </div>

        <div className="flex gap-3">
          <input
            name="firstName"
            value={userAddress.firstName}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="First name"
          />
          <input
            name="lastName"
            value={userAddress.lastName}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Last name"
          />
        </div>
        <input
          name="email"
          value={userAddress.email}
          onChange={handleInputChange}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="email"
          placeholder="Email address"
        />
        <input
          name="street"
          value={userAddress.street}
          onChange={handleInputChange}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="text"
          placeholder="Street"
        />
        <div className="flex gap-3">
          <input
            name="city"
            value={userAddress.city}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="City"
          />
          <input
            name="county"
            value={userAddress.county}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="County"
          />
        </div>
        <div className="flex gap-3">
          <input
            name="postcode"
            value={userAddress.postcode}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Postcode"
          />
          <input
            name="country"
            value={userAddress.country}
            onChange={handleInputChange}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Country"
          />
        </div>
        <input
          name="phone"
          value={userAddress.phone}
          onChange={handleInputChange}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="text"
          placeholder="Phone"
        />
      </div>

      {/* Left - User Address */}
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1={"THE"} text2={"CONTRACT"} />
        </div>

        <div className="border border-gray-300 rounded max-h-[16rem] sm:max-h-[28rem] overflow-y-auto p-3 text-sm text-gray-700 bg-white contract-section">
          <div aria-label="Booking contract terms" className="contract-section">
            <p>
              <strong>Key Points</strong>
            </p>
            <ul>
              <li>
                This Contract is subject to The Supreme Collective's Terms and
                Conditions.
              </li>
              <li>
                The Client must complete the Event Sheet four weeks prior to the
                event to ensure the finer details of the performance can be
                processed in a timely fashion.
              </li>
              <li>
                Point of contact numbers should be provided on the Event Sheet.
              </li>
              <li>
                The Client must provide the Artist with a reasonable free supply
                of soft drinks, hot meal or hot buffet (for bookings when artist
                is on site for 3 hours or more), free parking for all vehicles,
                a secure changing area, and a safe, level, dry, covered
                performance area, unless otherwise noted.
              </li>
            </ul>

            <p>
              <strong>Client Authorisation</strong>
            </p>
            <p>
              By signing below, you confirm that you are the authorised
              signatory for contract {bookingId || "TBC"}({bookedActsDisplay},{" "}
              {formattedDate}) and agree to be bound by The Supreme Collective’s Terms and Conditions of booking.
            </p>

            <p>
              <strong>Agent Authorisation</strong>
            </p>
            <p>
              Company Name: The Supreme Collective
              <br />
              <div>
                Artist Name(/s): {bookedActsDisplay}
                <br />
               {actsSummaryState.map((a) => {
  // Has the lineup *any* vocalists?
  const hasVocalists =
    Array.isArray(a.lineup?.bandMembers) &&
    a.lineup.bandMembers.some((m) =>
      (m.instrument || "").toLowerCase().includes("vocal")
    );

  // If NO vocalists → hide the line entirely
  if (!hasVocalists) return null;

  // If vocalist selected → show name
  if (a.selectedVocalist) {
    return (
      <p key={a.lineupId}>
        Vocalist selected:{" "}
        {`${a.selectedVocalist.firstName} ${a.selectedVocalist.lastNameInitial}.`}
      </p>
    );
  }

  // If vocalists exist but none selected yet → hide the line
  return null;
})}
              </div>
            </p>

            <p>
              <strong>
                The Supreme Collective - Terms and Conditions of Booking
              </strong>
            </p>

            <p>
              If you do not understand any part of these Terms and Conditions,
              please check in with The Supreme Collective or seek legal advice
              before agreeing to them and confirming a booking.
            </p>

            <p>
              <strong>Definition</strong>
            </p>
            <p>
              The following definitions refer to the 'Contract' (The Supreme Collective Booking Contract) and these 'Terms and Conditions'.
              The Supreme Collective, Company No. 16883956, is the 'Agent', the
              proposed entertainment booker is the 'Client' and the proposed
              entertainment act is the 'Artist'.
            </p>

            <p>
              <strong>1 | Introduction</strong>
            </p>
            <p>
              This booking contract is provided by the Agent and is made between
              the Client and Agent on behalf of the Artist. In issuing this
              Contract, the Agent is acting as an employment agency for the
              Artist, and is responsible for ensuring all band members are
              allocated, and fully briefed in a timely manner in the run-up to
              the event, and the Artist is responsible for all preparation for
              the event, and performance on the day. Artist, Client, and Agent
              responsibilities are detailed within this contract. Any breach of
              contract can fall upon the Artist, or Client depending upon the
              item being breached.
            </p>

            <p>
              <strong>2 | Booking</strong>
            </p>
            <ul>
              <li>
                All bookings are confirmed immediately upon signing of this
                contract and with complete payment of the deposit. The booking
                is then confirmed.
              </li>
              <li>
                A copy of the contract will be shared with the Client. The Agent
                will file completed contracts and will store until 4 years after
                the contract completion date.
              </li>
              <li>
                The Contract may be modified/changed upon agreement from both
                parties in advance of the event date.
              </li>
              <li>
                Changes must be notified to the Agent who will re-issue the
                contract if necessary.
              </li>
              <li>
                The agreed total cost and Deposit amount may change with any
                alterations agreed by both the Client and Artist.
              </li>
              <li>
                The Agent will act as negotiator until the date of the event and
                completion of the contract.
              </li>
            </ul>

            <p>
              <strong>3 | Payment of Booking Fees</strong>
            </p>
            <ul>
              <li>The Deposit payment is due upon booking.</li>
              <li>
                The Balance (remaining fee owed) is due one week before the
                event day and must also be paid to the Agent.
              </li>
            </ul>

            <p>
              <strong>4 | Late/Failure Payment of Balance</strong>
            </p>
            <ul>
              <li>
                The Client must pay the Balance within the specified time.
              </li>
              <li>
                If the Client fails to do so, the Agent has the right to
                terminate the Contract without penalty. The Client would still
                be subject to the cancellation fee specified in Clause 6.1.1.
              </li>
              <li>
                The Agent has the right to claim interest of 20% on the balance
                of any late payments.
              </li>
              <li>
                Late payments will incur a £50 administration fee, payable by
                the Client to the Agent within 14 days.
              </li>
              <li>
                If full payment is not made within 14 days the debt may be
                passed to a Debt Recovery Firm by the Artist, possibly incurring
                additional costs.
              </li>
            </ul>

            <p>
              <strong>5 | Cancellation</strong>
            </p>
            <ul>
              <li>
                Termination of the Contract is only allowed in cases of 'Force
                Majeure' or if all parties mutually agree.
              </li>
              <li>
                In the event of mutual cancellation, the Deposit will not be
                refunded.
              </li>
            </ul>

            <p>
              <strong>6 | Client Cancellation</strong>
            </p>
            <ul>
              <li>
                If the Client cancels for any reason other than Force Majeure,
                cancellation fees apply.
              </li>
            </ul>

            <table>
              <thead>
                <tr>
                  <th>Cancellation Timescale</th>
                  <th>Cancellation Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>More than 365 days before event</td>
                  <td>Nil</td>
                </tr>
                <tr>
                  <td>
                    Less than 24 hours after confirmation (8+ days before event)
                  </td>
                  <td>Nil</td>
                </tr>
                <tr>
                  <td>
                    Less than 24 hours after confirmation within 7 days of event
                  </td>
                  <td>Full Fee</td>
                </tr>
                <tr>
                  <td>More than 90 days before event</td>
                  <td>60% of Full Fee</td>
                </tr>
                <tr>
                  <td>Between 61-90 days before event</td>
                  <td>80% of Full Fee</td>
                </tr>
                <tr>
                  <td>60 days or less before event</td>
                  <td>Full Fee</td>
                </tr>
              </tbody>
            </table>

            <p>
              <strong>7 | Artist Cancellation</strong>
            </p>
            <ul>
              <li>
                The Agent cannot cancel on behalf of the Artist unless for Force
                Majeure.
              </li>
              <li>
                If Force Majeure applies, the Agent must present a replacement
                if possible, and refund 50% of the Deposit if not possible.
              </li>
              <li>
                If the Artist cancels improperly, the Client may seek legal
                recourse against the Artist.
              </li>
              <li>
                If a replacement Artist is secured and accepted, the Deposit is
                not refunded but transferred to the new act.
              </li>
            </ul>

            <p>
              <strong>8 | Complaints</strong>
            </p>
            <ul>
              <li>
                Complaints must be made in writing within 30 days of the
                incident.
              </li>
              <li>Payment obligations remain despite complaints.</li>
              <li>
                Any unnotified changes agreed between Client and Artist are to
                be dealt with directly between them.
              </li>
            </ul>

            <p>
              <strong>9 | Responsibilities of the Client</strong>
            </p>
            <ul>
              <li>
                Ensuring the venue provides safe, dry, and licensed conditions.
              </li>
              <li>
                Provide refreshments and hot meals for the Artist if required,
                as well as the appropriate number of chairs for the Artist.
              </li>
              <li>
                Free parking, which must be available, or parking expenses
                reimbursed.
              </li>
              <li>Changing area, which must be secure and adequate.</li>
              <li>Electrical sockets, as per the Artist's requirements.</li>
              <li>
                Ensure the Artist's equipment is safe from spillages and from
                guests.
              </li>
              <li>
                Ensure the Artist's is able to perform in a safe environment
                with no agression or violence towards them.
              </li>
            </ul>

            <p>
              <strong>10 | Responsibilities of the Agent</strong>
            </p>
            <ul>
              <li>
                Provide a service for Clients to find an Artist that is not
                double-booked through the company.
              </li>
              <li>
                Ensure Artist quality, professionalism, and safety compliance.
              </li>
              <li>
                Provide the Event Sheet and reminders to ensure both parties
                have all of the information they need so that the artist can
                carry out a successful performance.
              </li>
            </ul>

            <p>
              <strong>11 | Expenses</strong>
            </p>
            <p>
              Client is only liable for additional expenses if agreed in
              advance.
            </p>

            <p>
              <strong>12 | Artist Equipment</strong>
            </p>
            <p>
              Artist equipment must not be used by guests. Client is liable for
              any damage caused.
            </p>

            <p>
              <strong>13 | Changes to Performance Schedule</strong>
            </p>
            <ul>
              <li>
                Changes can be made on the Event Sheet up to one month before
                the performance date.
              </li>
              <li>
                Overruns by the Client do not extend Artist time unless agreed
                and paid for additionally.
              </li>
            </ul>

            <p>
              <strong>14 | Deputies</strong>
            </p>
            <p>
              The Agent may substitute musicians of similar ability without
              notice.
            </p>

            <p>
              <strong>15 | Force Majeure</strong>
            </p>
            <ul>
              <li>
                Force Majeure includes natural disasters, illness, war,
                terrorism, etc.
              </li>
              <li>
                Evidence must be provided to justify Force Majeure claims.
              </li>
            </ul>

            <p>
              <strong>16 | Terms Acceptance</strong>
            </p>
            <p>
              By signing the contract, you agree to all Terms and Conditions
              listed above.
            </p>
          </div>
        </div>

        <label className="inline-flex items-start gap-2 text-sm text-gray-700 mt-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="accent-[#ff6667]"
            required
          />
          I have read and understand the booking terms and conditions.
        </label>

        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-1">
            Signature (sign below)
          </label>
          <div className="border border-gray-300 rounded bg-white">
            <SignaturePad
              ref={(ref) => setSignaturePad(ref)}
              canvasProps={{
                width: 400,
                height: 150,
                className: "sigCanvas",
                onMouseUp: () => {
                  if (signaturePad && !signaturePad.isEmpty()) {
                    setSignaturePreview(
                      signaturePad.getTrimmedCanvas().toDataURL("image/png")
                    );
                  }
                },
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (signaturePad) {
                signaturePad.clear();
                setSignaturePreview(null);
              }
            }}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Clear Signature
          </button>
        </div>
      </div>

      {/* Right - Cart Total + Payment */}
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <CartTotal />
        </div>

        {/* Payment Methods */}
        <div className="mt-12">
          <Title text1={"PAYMENT"} text2={"METHOD"} />
          <p className="mt-2 text-sm text-gray-600">
            Stripe is our secure payment provider.
          </p>
          {/* Submit button */}
          {/* Desktop & tablet */}
          <div className="hidden sm:block w-full text-end mt-8">
            <button
              onClick={handleSubmit}
              className="bg-black rounded hover:bg-[#ff6667] text-white px-16 py-3 text-sm"
            >
              PLACE BOOKING
            </button>
          </div>

          {/* Mobile-only fixed bottom action bar */}
          <div className="sm:hidden">
            {/* Spacer is handled by pb-24 on the page container */}
            <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
              <button
                onClick={handleSubmit}
                className="w-full bg-black rounded hover:bg-[#ff6667] text-white py-3 text-base"
              >
                PLACE BOOKING
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceBooking;
