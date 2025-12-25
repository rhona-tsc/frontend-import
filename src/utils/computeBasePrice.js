// utils/computeBasePrice.js
const num = (v) => Number(String(v ?? "").replace(/[^0-9.+-]/g, "")) || 0;
const asArr = (v) => Array.isArray(v) ? v : [];

const isManager = (m) => /manager/i.test(String(m?.instrument || m?.role || ""));

const minCountyFee = (act) => {
  if (!act?.useCountyTravelFee) return 0;
  const cf = act?.countyFees;
  if (!cf || typeof cf !== "object") return 0;
  const vals = Object.values(cf).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return vals.length ? Math.min(...vals) : 0;
};

const essentialRolesFee = (m) =>
  asArr(m?.additionalRoles).reduce((s, r) => s + (r?.isEssential ? num(r?.additionalFee ?? r?.fee) : 0), 0);

export function computeBasePriceFromAct(act, { debug = false, label = "" } = {}) {
  const lineups = asArr(act?.lineups);

  // Prefer stored base_fee totals if present (fast + consistent with your DB intent)
  const storedTotals = lineups.flatMap((l) =>
    asArr(l?.base_fee).map((b) => num(b?.total_fee ?? b))
  ).filter((n) => n > 0);

  const storedMin = storedTotals.length ? Math.min(...storedTotals) : null;

  // Compute fallback from smallest lineup bandMembers (fee + essential roles + baseline travel)
  const sorted = [...lineups].sort((a, b) => asArr(a?.bandMembers).length - asArr(b?.bandMembers).length);
  const chosen = sorted[0];
  const members = asArr(chosen?.bandMembers);

  const memberBreakdown = members.map((m) => ({
    instrument: m?.instrument,
    fee: num(m?.fee),
    essentialRolesFee: essentialRolesFee(m),
    isManager: isManager(m),
    total: num(m?.fee) + essentialRolesFee(m),
  }));

  const memberFees = memberBreakdown.reduce((s, x) => s + x.total, 0);
  const travelCount = memberBreakdown.reduce((n, x) => n + (x.isManager ? 0 : 1), 0);
  const travelUnit = minCountyFee(act);
  const travel = travelUnit * travelCount;

  const computed = memberFees + travel;

  if (debug) {
    console.log(`💷[computeBasePrice] ${label}`, {
      act: act?.tscName || act?.name,
      storedMin,
      chosenMembers: members.length,
      memberFees,
      travelCount,
      travelUnit,
      travel,
      computed,
      using: storedMin != null ? "storedMin" : "computed",
      memberBreakdown,
    });
  }

  return storedMin != null ? storedMin : (Number.isFinite(computed) ? computed : 0);
}