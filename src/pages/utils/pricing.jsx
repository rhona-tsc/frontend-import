// frontend/src/pages/utils/pricing.jsx
// Optional: Outcode → County mapping
import outcodeToCounty from "./outcodeToCounty";
import getTravelV2 from "./travelV2";

const calculateActPricing = async (act, selectedCounty, selectedAddress, selectedDate, selectedLineup) => {
  console.groupCollapsed("🧾 calculateActPricing Debug");
  console.log("Inputs →", { actName: act?.tscName, selectedCounty, selectedAddress, selectedDate, selectedLineup });

  if (!act || !selectedLineup) {
    console.warn("⚠️ Missing act or lineup");
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

  // Try to spot a county in the address by matching fee keys (case-insensitive)
  const guessCountyFromAddress = (addr, feesMap) => {
    if (!addr || !feesMap) return "";
    const addrL = String(typeof addr === "string" ? addr : (addr?.address || addr?.postcode || "")).toLowerCase();
    const entries =
      typeof feesMap.forEach === "function"
        ? (() => { const arr = []; feesMap.forEach((v, k) => arr.push([k, v])); return arr; })()
        : Object.entries(feesMap);
    for (const [key] of entries) {
      const k = normalizeCounty(key);
      if (k && addrL.includes(k)) return key; // return original key
    }
    return "";
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

// 👇 add this block here
const looksTrue = (v) => v === true || v === "true" || v === 1 || v === "1";
const isTestAct =
  looksTrue(act?.isTest) || looksTrue(act?.actData?.isTest);

if (isTestAct) {
  console.log("🧪 Test act detected → forcing price £0.30");
  return { total: 0.3, travelCalculated: false, forcedTestPrice: true };
}

    console.log("🎸 Using lineup:", smallestLineup?.actSize, smallestLineup?.bandMembers?.length, "members");


  // Derive county (so we can use county travel & northern team)
  const guessedFromAddress = guessCountyFromAddress(selectedAddress, act?.countyFees);
  const outcode = extractOutcode(selectedAddress);
  const guessedFromOutcode = countyFromOutcode(outcode);
  const derivedCounty = selectedCounty || guessedFromAddress || guessedFromOutcode;
  console.log("📍 County derived:", { guessedFromAddress, outcode, guessedFromOutcode, derivedCounty });
// 🆕 Extra debug for county travel logic
console.log("🌍 useCountyTravelFee:", act?.useCountyTravelFee === true);

if (act?.useCountyTravelFee) {
  console.log("📦 County lookup sources:", {
    selectedCounty,
    guessedFromAddress,
    outcode,
    guessedFromOutcode,
    finalCountyUsed: derivedCounty
  });

  if (!derivedCounty) {
    console.warn("⚠️ No county could be determined from postcode/address.");
  }

  const feeRaw = getCountyFeeFromMap(act.countyFees, derivedCounty);
  console.log("💵 County fee lookup result:", {
    county: derivedCounty,
    rawValue: feeRaw,
    parsedValue: Number(feeRaw) || 0
  });
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
  const lineupSizeCount = Array.isArray(bandMembers) ? bandMembers.length : 0;

  // Exclude band managers/non-performers from travel calculations
  const travelEligibleMembers = Array.isArray(bandMembers) ? bandMembers.filter((m) => !isManagerLike(m)) : [];
  const travelEligibleCount = travelEligibleMembers.length;
  console.log("👥 Band members:", bandMembers.length, "Travel eligible:", travelEligibleMembers.length);

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

  console.log("💸 Base Fees:");
  perMemberFees.forEach(m => {
    console.log(`   - ${m.name} (${m.instrument}): £${m.memberTotal} (Base: £${m.baseFee}, Roles: £${m.rolesTotal})`);
  });
  console.log(`   → Subtotal base fee: £${baseFeeTotal}`);

  // ----- TRAVEL -----
  // County-fee path (per-member)
  const hasCountyTable = !!(act?.useCountyTravelFee && hasAnyCountyFees(act?.countyFees) && derivedCounty);
  console.log("🗺️ Travel method:", hasCountyTable ? "County table" : act.costPerMile > 0 ? "Cost per mile" : "MU Rates");

  if (hasCountyTable) {
  console.log("🧭 Using county table because:", {
    useCountyTravelFee: act.useCountyTravelFee,
    hasCountyFees: hasAnyCountyFees(act?.countyFees),
    derivedCounty,
  });
}

  if (hasCountyTable) {
    const feePerMemberRaw = getCountyFeeFromMap(act.countyFees, derivedCounty);
    const feePerMember = Number(feePerMemberRaw) || 0;
console.log("📊 County travel fee per member (raw):", feePerMemberRaw, "Parsed:", feePerMember);

if (feePerMember != null && travelEligibleCount > 0) {
  travelFee = feePerMember * travelEligibleCount;
  travelCalculated = true;
}
  }

  // If county path didn't run and we don't have addr/date → return base+margin
  if (!travelCalculated && (!selectedAddress || !selectedDate)) {
    const totalPrice = Math.ceil(baseFeeTotal / 0.67);
        console.log("⚠️ No travel data → base + margin only", totalPrice);
    console.groupEnd();

    return { total: totalPrice, travelCalculated: false };
  }

  // Cost-per-mile path
  if (!travelCalculated && Number(act.costPerMile) > 0) {
    for (const m of travelEligibleMembers) {
      const postCode = m.postCode;
      const destination =
        typeof selectedAddress === "string"
          ? selectedAddress
          : selectedAddress?.postcode || selectedAddress?.address || "";
      if (!postCode || !destination) continue;

      const { miles } = await getTravelV2(postCode, destination, selectedDate);
      const cost = (miles || 0) * Number(act.costPerMile) * 25;
            console.log(`🛣️ ${m.firstName} travel: ${miles} miles × £${act.costPerMile}/mi × 25 →`, cost);

      travelFee += cost;
    }
    travelCalculated = true;
  } else if (!travelCalculated) {
    // MU rate path
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
  }

  const travelFeeTotal = travelFee;
  console.log(`🚗 Travel fee total: £${travelFeeTotal}`);

  // Sound engineer fee (if any)
  const soundFee = Number(act.soundEngineerFee) || 0;
  console.log("🎧 Sound engineer fee:", soundFee);

  // Management fee (if any)
  const managementFee = Number(act.managementFee) || 0;
  console.log("🧑‍💼 Management fee:", managementFee);

  // Gross with 33% margin
  const subtotal = baseFeeTotal + soundFee + managementFee + travelFeeTotal;
  console.log(`🧮 Subtotal before margin: £${subtotal}`);

  const finalTotal = Math.round(subtotal / 0.67);
  console.log("➕ 33% margin applied (divide by 0.67)");
  console.log("✅ Final total price (rounded):", finalTotal);

 console.log("✅ Final:", { baseFeeTotal, soundFee, managementFee, travelFeeTotal, marginApplied: 0.33, finalTotal, travelCalculated });
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