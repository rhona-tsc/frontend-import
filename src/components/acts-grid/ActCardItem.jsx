import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShopContext } from "../../context/ShopContext";
import { useContext } from "react";
import useInViewOnce from "../../hooks/useInViewOnce";

const currency = "£";

const buildActHref = (card) => {
  // Prefer slug if present; fall back to /act/:id
  const slug = (card?.slug || "").trim();
  if (slug) return `/act/${encodeURIComponent(slug)}`;
  const id = String(card?.actId || card?._id || "");
  return id ? `/act/${id}` : "#";
};

function AvailabilityPill({ value }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-600" />
        Available
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" />
        Unavailable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-500" />
      Check availability
    </span>
  );
}

export default function ActCardItem({ card }) {
  const {
    isShortlisted,
    addToShortlist,
    isActAvailableForSelectedDate,
    getCardPriceWithTravel,
    selectedDate,
    selectedAddress,
  } = useContext(ShopContext);

  const [ref, inView] = useInViewOnce();
  const [travelPrice, setTravelPrice] = useState(null);
  const href = useMemo(() => buildActHref(card), [card]);

  const shortlisted = isShortlisted(card.actId);
  const availability = useMemo(() => {
    if (!card?.actId) return undefined;
    if (!selectedDate) return undefined;
    const yes = isActAvailableForSelectedDate(card.actId);
    if (yes === true) return true;
    if (yes === false) return false;
    return undefined;
  }, [card?.actId, selectedDate, isActAvailableForSelectedDate]);

  // Lazy compute price incl. travel once visible
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!inView) return;
      if (!card?.actId) return;
      if (!selectedDate || !selectedAddress) return; // need both for travel price
      try {
        const p = await getCardPriceWithTravel(card.actId);
        if (!ignore) setTravelPrice(p);
      } catch {
        // ignore
      }
    })();
    return () => {
      ignore = true;
    };
  }, [inView, card?.actId, selectedDate, selectedAddress, getCardPriceWithTravel]);

  const basePrice = Number.isFinite(card?.basePrice) ? card.basePrice : null;

  return (
    <div ref={ref} className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <Link to={href} className="block aspect-[16/10] bg-gray-100 overflow-hidden">
        {card?.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card?.tscName || card?.name || "Act"}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-gray-400 text-sm">
            No image
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={href} className="block">
              <h3 className="font-semibold text-gray-900 truncate">
                {card?.tscName || card?.name || "Untitled Act"}
              </h3>
            </Link>
            <div className="mt-1">
              <AvailabilityPill value={availability} />
            </div>
          </div>

          {/* Heart */}
          <button
            onClick={() => addToShortlist(card.actId)}
            title={shortlisted ? "Remove from shortlist" : "Save to shortlist"}
            className={`p-2 rounded-full border transition ${
              shortlisted
                ? "border-rose-300 bg-rose-50 text-rose-600"
                : "border-gray-200 hover:border-gray-300 text-gray-600"
            }`}
          >
            {/* simple heart svg */}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path
                fill="currentColor"
                d="M12.1 21.35a1 1 0 0 1-1.2 0C5.1 17.2 2 14.4 2 10.6 2 8 4 6 6.6 6c1.6 0 3.1.8 4 2.1C11.5 6.8 13 6 14.6 6 17.2 6 19.2 8 19.2 10.6c0 3.8-3.1 6.6-8.1 10.75z"
              />
            </svg>
          </button>
        </div>

        {/* Price row */}
        <div className="mt-1">
          {travelPrice != null ? (
            <div className="text-sm">
              <span className="font-semibold">{currency}{travelPrice.toLocaleString()}</span>
              <span className="text-gray-600"> from (incl. travel)</span>
            </div>
          ) : basePrice != null ? (
            <div className="text-sm">
              <span className="font-semibold">{currency}{basePrice.toLocaleString()}</span>
              <span className="text-gray-600"> from</span>
            </div>
          ) : (
            <div className="h-5 w-24 bg-gray-100 rounded" />
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4 8.24 4 9.91 4.81 11 6.08 12.09 4.81 13.76 4 15.5 4 18 4 20 6 20 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            <span>{Number(card?.loveCount || 0)}</span>
          </div>
          <Link to={href} className="text-gray-700 hover:text-gray-900 font-medium">
            View act →
          </Link>
        </div>
      </div>
    </div>
  );
}