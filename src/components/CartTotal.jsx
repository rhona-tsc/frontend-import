import React, { useContext, useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import Title from "./Title";
import { ShopContext } from "../context/ShopContext";
import calculateActPricing from "../pages/utils/pricing";

const CartTotal = () => {
  const { acts, cartItems, selectedAddress, selectedDate, currency, backendUrl } =
    useContext(ShopContext);

  const effectiveBackendUrl =
    backendUrl ||
    import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
    import.meta.env.BACKEND_URL?.replace(/\/$/, "") ||
    "";

  const [totalAmount, setTotalAmount] = useState(0);
  const [summaryItems, setSummaryItems] = useState([]);

  const actCacheRef = useRef(new Map());

  // Match pricing used elsewhere in the app (your “gross” multiplier)
  const MARGIN_MULTIPLIER = 1.33;

  // --- helpers ----------------------------------------------------
  const daysUntilEvent = useMemo(() => {
    if (!selectedDate) return null;
    const now = new Date();
    const event = new Date(selectedDate);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(event.getFullYear(), event.getMonth(), event.getDate());
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [selectedDate]);

  const requiresFullPayment = useMemo(() => {
    if (daysUntilEvent == null) return false;
    return daysUntilEvent <= 28;
  }, [daysUntilEvent]);

  const getSafeBaseFee = (lineup) => {
    const bySize =
      lineup?.base_fee?.find(
        (fee) => fee?.act_size === lineup?.actSize || fee?.act_size === lineup?.act_size
      )?.total_fee;

    const first = lineup?.base_fee?.[0]?.total_fee;

    return Number(bySize ?? first ?? 0) || 0;
  };

  const getEssentialRolesTotal = (lineup) => {
    const roles = (lineup?.bandMembers || []).flatMap((m) =>
      (m?.additionalRoles || []).filter(
        (r) => r?.isEssential && typeof r?.additionalFee === "number"
      )
    );
    return roles.reduce((sum, r) => sum + (r?.additionalFee || 0), 0);
  };

  // ---------------------------------------------------------------

  useEffect(() => {
    const fetchActById = async (id) => {
      if (!effectiveBackendUrl || !id) return null;

      const cached = actCacheRef.current.get(String(id));
      if (cached) return cached;

      const candidates = [
        `${effectiveBackendUrl}/api/act/${id}`,
        `${effectiveBackendUrl}/api/act/get/${id}`,
        `${effectiveBackendUrl}/api/act/id/${id}`,
        `${effectiveBackendUrl}/api/act/one/${id}`,
      ];

      for (const url of candidates) {
        try {
          const res = await axios.get(url);
          const maybeAct = res?.data?.act || res?.data?.data || res?.data;
          if (maybeAct && (maybeAct._id || maybeAct.id)) {
            actCacheRef.current.set(String(id), maybeAct);
            return maybeAct;
          }
        } catch (e) {
          // try next
        }
      }

      return null;
    };

    const loadTotal = async () => {
      if (!cartItems || Object.keys(cartItems).length === 0) {
        setSummaryItems([]);
        setTotalAmount(0);

        try {
          localStorage.setItem("cartUiTotalAmount", "0");
          localStorage.setItem("cartUiDepositAmount", "0");
        } catch (e) {}

        return;
      }

      console.log("🧾 [CartTotal] loadTotal", {
        actsCount: acts?.length,
        cartActIds: Object.keys(cartItems || {}),
        selectedDate,
        selectedAddress,
      });

      const selectedCounty = selectedAddress?.split(",").slice(-2)[0]?.trim() || "";
      let grand = 0;
      const summary = [];

      for (const actId of Object.keys(cartItems)) {
        const actCartBlock = cartItems?.[actId];
        if (!actCartBlock || typeof actCartBlock !== "object") {
          console.warn("⚠️ [CartTotal] cartItems[actId] not an object", { actId, actCartBlock });
          continue;
        }

        let act = (acts || []).find((a) => String(a?._id || a?.id) === String(actId));

        const needsFullAct = !act || !Array.isArray(act?.lineups) || act.lineups.length === 0;
        if (needsFullAct) {
          act = await fetchActById(actId);
        }

        if (!act) {
          console.warn("⚠️ [CartTotal] Act not found for cart actId (even after fetch)", {
            actId,
            actsCount: acts?.length,
          });
          continue;
        }

        console.log("🔎 [CartTotal] act shape", {
          actId,
          foundInActsList: !!(acts || []).find((a) => String(a?._id) === String(actId)),
          hasLineups: Array.isArray(act?.lineups),
          lineupsLen: act?.lineups?.length,
          cartLineupIds: Object.keys(cartItems?.[actId] || {}),
        });

        if (!Array.isArray(act?.lineups) || act.lineups.length === 0) {
          console.warn("⚠️ [CartTotal] Act has no lineups even after fetch", {
            actId,
            tscName: act?.tscName,
          });
          continue;
        }

        for (const lineupId of Object.keys(actCartBlock)) {
          const cartNode = cartItems[actId][lineupId] || {};
          const quantity = Number(cartNode.quantity || 1);

          const selectedExtras = Array.isArray(cartNode.selectedExtras)
            ? cartNode.selectedExtras
            : cartNode.selectedExtras
              ? [cartNode.selectedExtras]
              : [];

          const afternoonExtras = Array.isArray(cartNode.selectedAfternoonSets)
            ? cartNode.selectedAfternoonSets
            : [];

          const lineup = (act.lineups || []).find(
            (l) => String(l._id || l.lineupId) === String(lineupId)
          );

          if (!lineup) {
            console.warn("⚠️ [CartTotal] Lineup not found for lineupId in cart", {
              actId,
              lineupId,
              available: (act.lineups || [])
                .map((l) => String(l?._id || l?.lineupId))
                .slice(0, 12),
            });
            continue;
          }

          // Try calculateActPricing first
          let calc = null;
          try {
            calc = await calculateActPricing(
              act,
              selectedCounty,
              selectedAddress,
              selectedDate,
              lineup
            );
          } catch (err) {
            // swallow; fallback below
          }

          const calcTotal = Number(calc?.total);
          const baseFee = getSafeBaseFee(lineup);
          const essentialRoles = getEssentialRolesTotal(lineup);
          const rawBase = baseFee + essentialRoles;

          const fallbackGross = rawBase > 0 ? Math.ceil(rawBase * MARGIN_MULTIPLIER) : 0;

          const calcAlreadyGross =
            calc?.marginApplied === true ||
            calc?.isGross === true ||
            calc?.includesMargin === true;

          const calcGross =
            Number.isFinite(calcTotal) && calcTotal > 0
              ? Math.ceil(calcAlreadyGross ? calcTotal : calcTotal * MARGIN_MULTIPLIER)
              : 0;

          const subtotalWithMargin = calcGross > 0 ? calcGross : fallbackGross;

          const extrasTotal =
            selectedExtras.reduce((sum, ex) => sum + (Number(ex?.price) || 0), 0) || 0;

          const afternoonExtrasTotal =
            afternoonExtras.reduce((sum, set) => sum + (Number(set?.price) || 0), 0) || 0;

          const combinedExtrasTotal = extrasTotal + afternoonExtrasTotal;
          const lineTotal = (subtotalWithMargin + combinedExtrasTotal) * quantity;

          const actNameLower = (act.tscName || act.name || "").toLowerCase();
          const isTestAct =
            actNameLower.includes("test dancefloor magic") ||
            actNameLower.includes("test soul allegiance") ||
            actNameLower.includes("test motown magic");

          const finalLineTotal = isTestAct ? 0.5 * quantity : lineTotal;
          const summaryBasePrice = isTestAct ? 0.5 : subtotalWithMargin;

          grand += finalLineTotal;

          const combinedExtrasForSummary = [
            ...(selectedExtras || []),
            ...((afternoonExtras || []).map((s) => ({
              name: s?.name,
              price: s?.price,
              key: s?.key,
              type: s?.type || "afternoon",
            })) || []),
          ];

          summary.push({
            actName: act.name || "Unknown Act",
            tscName: act.tscName || act.name || "",
            lineupName: lineup.actSize || "",
            basePrice: Number(summaryBasePrice) || 0,
            extras: combinedExtrasForSummary,
            quantity,
          });
        }
      }

      console.log("✅ [CartTotal] computed", {
        summaryCount: summary.length,
        grand,
        preview: summary.slice(0, 3),
      });

      // ✅ compute test booking and deposit USING local summary+grand (not state)
      const isTestBookingLocal = summary.some((item) => {
        const name = (item.tscName || item.actName || "").toLowerCase();
        return (
          name.includes("test dancefloor magic") ||
          name.includes("test soul allegiance") ||
          name.includes("test motown magic")
        );
      });

      const depositLocal = isTestBookingLocal ? Math.max(grand, 0.5) : grand * 0.33;

      // ✅ persist cart UI totals for checkout (scope-safe)
      try {
        localStorage.setItem("cartUiTotalAmount", String(grand));
        localStorage.setItem("cartUiDepositAmount", String(depositLocal));
      } catch (e) {}

      setSummaryItems(summary);
      setTotalAmount(grand);
    };

    loadTotal();
  }, [JSON.stringify(cartItems), acts, selectedAddress, selectedDate, backendUrl]);

  // UI display helpers (safe: use state only)
  const isTestBooking = summaryItems.some((item) => {
    const name = (item.tscName || item.actName || "").toLowerCase();
    return (
      name.includes("test dancefloor magic") ||
      name.includes("test soul allegiance") ||
      name.includes("test motown magic")
    );
  });

  let deposit;
  if (isTestBooking) {
    deposit = Math.max(totalAmount, 0.5);
  } else {
    deposit = totalAmount * 0.33;
  }

  return (
    <div className="w-full">
      <div className="text-2xl mb-4">
        <Title text1={"CART"} text2={"TOTAL"} />
      </div>

      {summaryItems.map((item, index) => (
        <div key={index} className="mb-4 text-sm border p-3 rounded bg-gray-50">
          <div className="flex justify-between">
            <p className="font-semibold">
              {item.tscName} – {item.lineupName}
            </p>
            <p>
              {currency}
              {item.basePrice.toFixed(2)}
            </p>
          </div>

          {item.extras?.length > 0 && (
            <div className="mt-1">
              <p className="text-gray-600 text-xs">Extras:</p>
              <ul className="list-disc list-inside">
                {item.extras.map((extra, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{extra.name}</span>
                    <span>
                      {currency}
                      {Number(extra.price || 0).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className="mt-10 text-sm border-t pt-4">
        <div
          className={`flex justify-between ${
            requiresFullPayment ? "font-extrabold text-gray-900" : ""
          }`}
        >
          <p>Total</p>
          <p>
            {currency}
            {totalAmount.toFixed(2)}
          </p>
        </div>

        {requiresFullPayment ? (
          <p className="mt-2 text-xs text-grey-700">
            Full payment required as your event is 28 days or less away.
          </p>
        ) : (
          <>
            <hr className="my-2" />
            <div className="flex justify-between font-bold">
              <p>Deposit</p>
              <p>
                {currency}
                {deposit.toFixed(2)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartTotal;