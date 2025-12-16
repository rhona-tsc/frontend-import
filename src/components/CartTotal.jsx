import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import Title from './Title';
import { ShopContext } from '../context/ShopContext';
import calculateActPricing from '../pages/utils/pricing';

const CartTotal = () => {
  const {
    acts,
    cartItems,
    selectedAddress,
    selectedDate,
    currency,
    backendUrl,
  } = useContext(ShopContext);

  const effectiveBackendUrl =
  backendUrl ||
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  import.meta.env.BACKEND_URL?.replace(/\/$/, "") ||
  "";

  const [totalAmount, setTotalAmount] = useState(0);
  const [summaryItems, setSummaryItems] = useState([]);

  const actCacheRef = useRef(new Map());

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
    // try to match by actSize
    const bySize =
      lineup?.base_fee?.find(
        (fee) => fee?.act_size === lineup?.actSize || fee?.act_size === lineup?.act_size
      )?.total_fee;

    // fall back to first entry if any
    const first = lineup?.base_fee?.[0]?.total_fee;

    return Number(bySize ?? first ?? 0) || 0;
  };

  const getEssentialRolesTotal = (lineup) => {
    const roles = (lineup?.bandMembers || []).flatMap((m) =>
      (m?.additionalRoles || []).filter(
        (r) => r?.isEssential && typeof r?.additionalFee === 'number'
      )
    );
    return roles.reduce((sum, r) => sum + (r?.additionalFee || 0), 0);
  };

  // ---------------------------------------------------------------

  useEffect(() => {
    const fetchActById = async (id) => {
      if (!effectiveBackendUrl || !id) return null;

      // Cache first
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
          // try next candidate
        }
      }

      return null;
    };

    const loadTotal = async () => {
     if (!cartItems || Object.keys(cartItems).length === 0) {
  setSummaryItems([]);
  setTotalAmount(0);
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
        let act = acts.find((a) => String(a?._id || a?.id) === String(actId));

        // If the cart references an act that isn’t in the preloaded cards list (e.g. test/draft/private act),
        // fetch the full act document by ID so totals can still compute.
        if (!act) {
          act = await fetchActById(actId);
        }

        if (!act) {
          console.warn("⚠️ [CartTotal] Act not found for cart actId (even after fetch)", {
            actId,
            actsCount: acts?.length,
            sampleActIds: (acts || []).slice(0, 8).map((a) => ({
              _id: a?._id,
              id: a?.id,
              tscName: a?.tscName,
              name: a?.name,
            })),
          });
          continue;
        }

        for (const lineupId of Object.keys(cartItems[actId])) {
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
            continue;
          }

          // Try calculateActPricing first (this includes travel + margin in your util)
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
          }

          const calcTotal = Number(calc?.total);
          const baseFee = getSafeBaseFee(lineup);
          const essentialRoles = getEssentialRolesTotal(lineup);
          const rawBase = baseFee + essentialRoles;
          const fallbackGross = rawBase > 0 ? Math.ceil(rawBase) : 0;

          // If calcTotal is valid and > 0, use it. Otherwise fallback.
          const subtotalWithMargin =
            Number.isFinite(calcTotal) && calcTotal > 0 ? calcTotal : fallbackGross;

          // Sum extras (defensively treat missing/strings)
          const extrasTotal =
            selectedExtras.reduce(
              (sum, ex) => sum + (Number(ex?.price) || 0),
              0
            ) || 0;
          const afternoonExtrasTotal =
            afternoonExtras.reduce(
              (sum, set) => sum + (Number(set?.price) || 0),
              0
            ) || 0;

          const combinedExtrasTotal = extrasTotal + afternoonExtrasTotal;
          const lineTotal = (subtotalWithMargin + combinedExtrasTotal) * quantity;

          // ✅ TEST ACT OVERRIDE — safe version (no const reassignment)
          const actNameLower = (act.tscName || act.name || "").toLowerCase();
          const isTestAct =
            actNameLower.includes("test dancefloor magic") ||
            actNameLower.includes("test soul allegiance") ||
            actNameLower.includes("test motown magic");

          // If test act → override totals WITHOUT mutating const
          // (Keep quantity accounted for)
          const finalLineTotal = isTestAct ? 0.5 * quantity : lineTotal;
          const summaryBasePrice = isTestAct ? 0.5 : subtotalWithMargin;

          // ✅ GRAND TOTAL MUST INCLUDE BASE + EXTRAS
          grand += finalLineTotal;

          // Include afternoon sets as "extras" for the summary list
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
      setSummaryItems(summary);
      setTotalAmount(grand);
    };

    loadTotal();
  }, [JSON.stringify(cartItems), acts, selectedAddress, selectedDate, backendUrl]);
const isTestBooking = summaryItems.some(
  (item) => {
    const name = (item.tscName || item.actName || "").toLowerCase();
    return (
      name.includes("test dancefloor magic") ||
      name.includes("test soul allegiance") ||
      name.includes("test motown magic")
    );
  }
);

// Force minimum £0.50 for test acts
let deposit;
if (isTestBooking) {
  deposit = Math.max(totalAmount, 0.50);
} else {
  deposit = totalAmount * 0.33;
}

  return (
    <div className='w-full'>
      <div className='text-2xl mb-4'>
        <Title text1={'CART'} text2={'TOTAL'} />
      </div>

      {summaryItems.map((item, index) => (
        <div key={index} className='mb-4 text-sm border p-3 rounded bg-gray-50'>
          <div className='flex justify-between'>
            <p className='font-semibold'>{item.tscName} – {item.lineupName}</p>
            <p>{currency}{item.basePrice.toFixed(2)}</p>
          </div>
          {item.extras.length > 0 && (
            <div className='mt-1'>
              <p className='text-gray-600 text-xs'>Extras:</p>
              <ul className='list-disc list-inside'>
                {item.extras.map((extra, i) => (
                  <li key={i} className='flex justify-between'>
                    <span>{extra.name}</span>
                    <span>{currency}{Number(extra.price || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div className='mt-10 text-sm border-t pt-4'>
        <div className={`flex justify-between ${requiresFullPayment ? 'font-extrabold text-gray-900' : ''}`}>
          <p>Total</p>
          <p>{currency}{totalAmount.toFixed(2)}</p>
        </div>

        {requiresFullPayment ? (
          <p className='mt-2 text-xs text-grey-700'>
            Full payment required as your event is 28 days or less away.
          </p>
        ) : (
          <>
            <hr className='my-2' />
            <div className='flex justify-between font-bold'>
              <p>Deposit</p>
              <p>{currency}{deposit.toFixed(2)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartTotal;