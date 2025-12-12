// frontend/src/pages/utils/pricing.jsx
// Optional: Outcode → County mapping
import outcodeToCounty from "./outcodeToCounty";
import getTravelV2 from "./travelV2";

import { toast } from "react-toastify";
import CustomToast from "../../components/CustomToast";

// prevent spammy repeats
let _postcodeToastShownAt = 0;
const TOAST_COOLDOWN_MS = 10000; // 10s

const calculateActPricing = async (act, selectedCounty, selectedAddress, selectedDate, selectedLineup = null) => {
  console.groupCollapsed("💷 calculateActPricing");

  if (!act) {
    console.warn("⚠️ Missing act");
    console.groupEnd();
    return { total: 0, travelCalculated: false };
  }

  // helpers
  const normalizeCounty = (c) => String(c || "").toLowerCase().trim();

  // Treat band managers / non-performers as not travel-eligible
  const isManagerLike = (m = {}) => {
    const has = (s = "") => /\b(manager|management)\b/i.test(String(s));
    if (m.isManager === true || m.isNonPerformer === true) return true;
    if (has(m.instrument) || has(m.title)) return true;
    const rolesArr = Array.isArray(m.additionalRoles) ? m.additionalRoles : [];
    return rolesArr.some((r) => has(r?.role) || has(r?.title));
  };

  // Case/space-insensitive lookup for county fees, supports Map or plain object
  const getCountyFeeFromMap = (feesMap, countyName) => {
    if (!feesMap) return undefined;
    const target = normalizeCounty(countyName);
    const entries =
      typeof feesMap.forEach === "function"
        ? (() => { const arr = []; feesMap.forEach((v, k) => arr.push([k, v])); return arr; })()
        : Object.entries(feesMap);
    for (const [key, val] of entries) {
      if (normalizeCounty(key) === target) return val;
    }
    return undefined;
  };

  const hasAnyCountyFees = (feesMap) => {
    if (!feesMap) return false;
    if (typeof feesMap.size === "number") return feesMap.size > 0;
    if (typeof feesMap.forEach === "function") {
      let any = false; feesMap.forEach(() => { any = true; }); return any;
    }
    return Object.keys(feesMap || {}).length > 0;
  };

  // Extract outward code (e.g., "SL6")
  const extractOutcode = (addr) => {
    const s = typeof addr === "string" ? addr : (addr?.postcode || addr?.address || "");
    const m = String(s || "")
      .toUpperCase()
      .match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d[A-Z]{2}\b|\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/);
    return (m && (m[1] || m[2])) ? (m[1] || m[2]) : "";
  };

  // Robust county lookup from outcode (supports your { county: [OUTCODES...] } layout)
  const countyFromOutcode = (outcode) => {
    if (!outcode) return "";
    const OUT = String(outcode).toUpperCase().trim();
    let db = outcodeToCounty;
    if (!db && typeof window !== "undefined") {
      db = window.OUTCODE_TO_COUNTY || window.POSTCODE_TO_COUNTY || {};
    }
    if (!db) return "";

    if (typeof db.get === "function") {
      const val = db.get(OUT); // Map(OUT → County)
      if (val) return String(val);
      for (const [county, codes] of db.entries()) { // Map(County → [OUTS])
        if (Array.isArray(codes) && codes.includes(OUT)) return county.replace(/_/g, " ");
      }
      return "";
    }

    if (Array.isArray(db)) db = db[0] || {};

    const inverted = db[OUT];
    if (typeof inverted === "string") return inverted; // { "SL6": "Berkshire" }

    for (const [county, codes] of Object.entries(db)) { // { berkshire: ["SL6", ...] }
      if (Array.isArray(codes) && codes.includes(OUT)) return county.replace(/_/g, " ");
    }
    return "";
  };

  let travelFee = 0;
  let travelCalculated = false;

  // Pick a lineup
  let smallestLineup = null;
  if (selectedLineup && Array.isArray(selectedLineup.bandMembers)) {
    smallestLineup = selectedLineup;
  } else {
    smallestLineup = act.lineups?.reduce((min, lineup) => {
      if (!Array.isArray(lineup.bandMembers)) return min;
      if (!min || lineup.bandMembers.length < min.bandMembers.length) return lineup;
      return min;
    }, null);
  }
  if (!smallestLineup || !Array.isArray(smallestLineup.bandMembers)) {
    return { total: null, travelCalculated: false };
  }

  // Test-act guard
  const looksTrue = (v) => v === true || v === "true" || v === 1 || v === "1";
  const isTestAct = looksTrue(act?.isTest) || looksTrue(act?.actData?.isTest);
  if (isTestAct) {
    console.log("🧪 Test act detected → forcing price £0.50");
    return { total: 0.5, travelCalculated: false, forcedTestPrice: true };
  }

  console.log("🎸 Using lineup:", smallestLineup?.actSize, smallestLineup?.bandMembers?.length, "members");

  // Derive county (so we can use county travel & northern team)
  const outcode = extractOutcode(selectedAddress);
  const guessedFromOutcode = countyFromOutcode(outcode);
  const derivedCounty = (selectedCounty && String(selectedCounty)) || guessedFromOutcode || "";
  console.log("📍 County inputs/derivation:", {
    selectedCounty,
    outcodeFromAddress: outcode || null,
    guessedFromOutcode,
    derivedCounty,
    selectedDate: selectedDate || null,
  });

  // 🔄 Normalize travel fields for acts OR actfiltercards
  const TRAVEL = act?.travelModel || {};
  const useCounty =
    (act?.useCountyTravelFee ?? TRAVEL.useCountyTravelFee ?? (TRAVEL.type === "county")) === true;
  const countyFees = act?.countyFees ?? TRAVEL.countyFees ?? null;
  const costPerMileNorm = Number(act?.costPerMile ?? TRAVEL.costPerMile) || 0;

  // Peek at fees keys for debug
  let countyFeeKeys = [];
  try {
    if (countyFees && typeof countyFees.forEach === "function") {
      countyFees.forEach((_, k) => countyFeeKeys.push(String(k)));
    } else if (countyFees) {
      countyFeeKeys = Object.keys(countyFees);
    }
  } catch {}

  const hasCounty = hasAnyCountyFees(countyFees);

  console.log("🌍 Travel flags (normalized):", {
    useCounty,
    hasCountyFees: hasCounty,
    derivedCountyPresent: Boolean(derivedCounty),
    costPerMileNorm,
    travelModelType: TRAVEL?.type || null,
    countyFeeKeysPreview: countyFeeKeys.slice(0, 6),
  });

  if (useCounty && !derivedCounty) {
    console.warn("⚠️ useCounty=true but no derivedCounty from address/selectedCounty.");
    const now = Date.now();
    if (typeof window !== "undefined" && now - _postcodeToastShownAt > TOAST_COOLDOWN_MS) {
      _postcodeToastShownAt = now;
      try {
        toast(
          <CustomToast
            type="warning"
            message="Please ensure you include a postcode in your venue address for an accurate quote."
          />,
          { position: "top-right" }
        );
      } catch {
        toast.warn(
          "Please ensure you include a postcode in your venue address for an accurate quote.",
          { position: "top-right" }
        );
      }
    }
  }

  // Northern detection
  const northernCounties = new Set([
    "ceredigion","cheshire","cleveland","conway","cumbria","denbighshire","derbyshire","durham",
    "flintshire","greater manchester","gwynedd","herefordshire","lancashire","leicestershire",
    "lincolnshire","merseyside","north humberside","north yorkshire","northumberland",
    "nottinghamshire","rutland","shropshire","south humberside","south yorkshire",
    "staffordshire","tyne and wear","warwickshire","west midlands","west yorkshire",
    "worcestershire","wrexham","rhondda cynon taf","torfaen","neath port talbot","bridgend",
    "blaenau gwent","caerphilly","cardiff","merthyr tydfil","newport","aberdeen city",
    "aberdeenshire","angus","argyll and bute","clackmannanshire","dumfries and galloway",
    "dundee city","east ayrshire","east dunbartonshire","east lothian","east renfrewshire",
    "edinburgh","falkirk","fife","glasgow","highland","inverclyde","midlothian","moray",
    "na h eileanan siar","north ayrshire","north lanarkshire","orkney islands","perth and kinross",
    "renfrewshire","scottish borders","shetland islands","south ayrshire","south lanarkshire",
    "stirling","west dunbartonshire","west lothian"
  ]);
  const isNorthernGig = northernCounties.has(normalizeCounty(derivedCounty));
  console.log("🧭 Is northern gig?", isNorthernGig);

  // Team (for travel postcode list)
  const bandMembers =
    act.useDifferentTeamForNorthernGigs && isNorthernGig
      ? act.northernTeam || []
      : smallestLineup.bandMembers || [];

  // Exclude band managers/non-performers from travel calculations
  const travelEligibleMembers = Array.isArray(bandMembers) ? bandMembers.filter((m) => !isManagerLike(m)) : [];
  const travelEligibleCount = travelEligibleMembers.length;
  console.log("👥 Band members:", {
    total: bandMembers.length,
    travelEligible: travelEligibleMembers.length,
  });

  // --- FEES (NET) ----------------------------------------------------------
  const perMemberFees = (smallestLineup.bandMembers || []).map((m) => {
    const baseFee = m.isEssential ? Number(m.fee) || 0 : 0;
    const essentialRoles = (m.additionalRoles || [])
      .filter((r) => r?.isEssential)
      .map((r) => ({ role: r?.role, fee: Number(r?.additionalFee) || 0 }));
    const rolesTotal = essentialRoles.reduce((s, r) => s + (r.fee || 0), 0);
    const memberTotal = baseFee + rolesTotal;

    console.log("💰 Member fee:", m.firstName, { baseFee, rolesTotal, memberTotal, essentialRoles });

    return {
      id: m?._id?.toString?.() || "",
      name: `${m.firstName || ""} ${m.lastName || ""}`.trim() || (m.instrument || "Member"),
      instrument: m.instrument,
      isEssential: !!m.isEssential,
      baseFee,
      rolesTotal,
      essentialRoles,
      memberTotal,
    };
  });

  const baseFeeTotal = perMemberFees.reduce((s, m) => s + (m.memberTotal || 0), 0);
  console.log("💸 Total base lineup fee:", baseFeeTotal);

  // ----- TRAVEL DECISION -----
  const hasCountyTable = !!(useCounty && hasCounty && derivedCounty);
  const decision =
    hasCountyTable ? "county" : (costPerMileNorm > 0 ? "per-mile" : "mu");

  console.log("🧮 Travel method decision:", {
    decision, // "county" | "per-mile" | "mu"
    reasons: {
      useCounty,
      hasCountyFees: hasCounty,
      derivedCountyPresent: Boolean(derivedCounty),
      costPerMileNormPositive: costPerMileNorm > 0,
    },
  });

  // ----- TRAVEL -----
  // County-fee path (per-member)
  if (decision === "county") {
    const feePerMemberRaw = getCountyFeeFromMap(countyFees, derivedCounty);
    const feePerMember = Number(feePerMemberRaw) || 0;
    console.log("📊 County travel fee per member (raw):", feePerMemberRaw, "→ parsed:", feePerMember);
    if (travelEligibleCount > 0) {
      travelFee = feePerMember * travelEligibleCount;
      travelCalculated = true;
      console.log("✅ County travel applied:", { travelEligibleCount, travelFee });
    } else {
      console.log("ℹ️ No travel-eligible members, county travel = £0");
    }
  }

  // If county path didn't run and we don't have addr/date → return base+margin
  if (!travelCalculated && (!selectedAddress || !selectedDate)) {
    const totalPrice = Math.ceil(baseFeeTotal * 1.33);
    console.log("⚠️ No travel data (or county not applicable) → base + margin only:", totalPrice, {
      selectedAddressPresent: Boolean(selectedAddress),
      selectedDatePresent: Boolean(selectedDate),
    });
    console.groupEnd();
    return { total: totalPrice, travelCalculated: false };
  }

  // Cost-per-mile path (normalized)
  if (!travelCalculated && decision === "per-mile") {
    for (const m of travelEligibleMembers) {
      const postCode = m.postCode;
      const destination =
        typeof selectedAddress === "string"
          ? selectedAddress
          : selectedAddress?.postcode || selectedAddress?.address || "";
      if (!postCode || !destination) continue;

      const { miles } = await getTravelV2(postCode, destination, selectedDate);
      const cost = (miles || 0) * costPerMileNorm * 25;
      console.log(`🛣️ ${m.firstName} travel: ${miles} miles × £${costPerMileNorm}/mi × 25 →`, cost);

      travelFee += cost;
    }
    travelCalculated = true;
    console.log("✅ Per-mile travel applied:", { travelFee });
  }

  // MU rate path
  if (!travelCalculated && decision === "mu") {
    for (const m of travelEligibleMembers) {
      const postCode = m.postCode;
      const destination =
        typeof selectedAddress === "string"
          ? selectedAddress
          : selectedAddress?.postcode || selectedAddress?.address || "";
      if (!postCode || !destination) continue;

      const { outbound, returnTrip } = await getTravelV2(postCode, destination, selectedDate);
      if (!outbound || !returnTrip) continue;

      const totalDistanceMiles = (outbound.distance.value + returnTrip.distance.value) / 1609.34;
      const totalDurationHours = (outbound.duration.value + returnTrip.duration.value) / 3600;
      const fuelFee = totalDistanceMiles * 0.56;
      const timeFee = totalDurationHours * 13.23;
      const lateFee = (returnTrip.duration.value / 3600) > 1 ? 136 : 0;
      const tollFee = (outbound.fare?.value || 0) + (returnTrip.fare?.value || 0);
      const cost = fuelFee + timeFee + lateFee + tollFee;
      console.log(`🚕 MU Travel (${m.firstName})`, { totalDistanceMiles, totalDurationHours, fuelFee, timeFee, lateFee, tollFee, cost });

      travelFee += cost;
    }
    travelCalculated = true;
    console.log("✅ MU travel applied:", { travelFee });
  }

  const travelFeeTotal = travelFee;
  console.log(`🚗 Travel fee total: £${travelFeeTotal}`);

  // Gross with 33% margin
  const subtotal = baseFeeTotal + travelFeeTotal;
  console.log(`🧮 Subtotal before margin: £${subtotal}`);

  const finalTotal = Math.round(subtotal * 1.33);
  console.log("➕ 33% margin applied (×1.33)");
  console.log("✅ Final total price (rounded):", finalTotal);

  console.log("✅ Final summary:", { baseFeeTotal, travelFeeTotal, marginApplied: 0.33, finalTotal, travelCalculated, decision });
  console.groupEnd();
  return { total: finalTotal, travelCalculated };
};

export default calculateActPricing;

// Extras
export function calculateExtraPrice({ extra, act, lineup, address, date }) {
  const key = extra?.key;

  const lineupSize =
    Number(lineup?.bandMembers?.length) ||
    Number(lineup?.actSize) ||
    Number(lineup?.actSizeCount) ||
    0;

  const getBaseFromActExtras = (k) => {
    const extras = act?.extras;
    if (!extras) return 0;
    const raw = typeof extras.get === "function" ? extras.get(k) : extras?.[k];
    if (typeof raw === "number") return Number(raw) || 0;
    if (raw && typeof raw === "object") {
      const price = raw.price != null ? Number(raw.price) : 0;
      return isNaN(price) ? 0 : price;
    }
    return 0;
  };

  // Per-member-per-60
  if (
    key === "late_stay_60min_per_band_member" ||
    key === "early_arrival_60min_per_band_member"
  ) {
    const base = getBaseFromActExtras(key);
    const minutes = Number(extra?.minutes || 60);
    const blocks = minutes / 60;
    return base * lineupSize * blocks;
  }

  if (/_per_band_member$/.test(String(key || ""))) {
    const base = getBaseFromActExtras(key);
    const minutes = Number(extra?.minutes || 60);
    const blocks = minutes / 60;
    return base * lineupSize * blocks;
  }

  if (extra?.flatPrice != null) return Number(extra.flatPrice) || 0;

  const fallbackBase =
    extra?.basePrice != null ? Number(extra.basePrice) : getBaseFromActExtras(key);
  return isNaN(fallbackBase) ? 0 : fallbackBase;
}