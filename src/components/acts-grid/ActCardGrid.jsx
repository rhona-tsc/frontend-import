import React, { useEffect, useMemo, useState } from "react";
import { useContext } from "react";
import { ShopContext } from "../../context/ShopContext";
import ActsFilterBar from "./ActsFilterBar";
import ActCardItem from "./ActCardItem";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden border border-gray-200 bg-white">
      <div className="aspect-[16/10] bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-5 w-2/3 bg-gray-100 rounded" />
        <div className="h-4 w-1/3 bg-gray-100 rounded" />
        <div className="h-5 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function ActCardGrid() {
  const {
    actCards,
    fetchActsForGrid,
    selectedDate,
    // availability map read happens via child card helpers
  } = useContext(ShopContext);

  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest | price_asc | price_desc | saves_desc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        await fetchActsForGrid();
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [fetchActsForGrid]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(actCards) ? [...actCards] : [];

    // Text search (tscName / name)
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((c) => {
        const s1 = (c.tscName || "").toLowerCase();
        const s2 = (c.name || "").toLowerCase();
        return s1.includes(q) || s2.includes(q);
      });
    }

    // Available-only: we can't sync here (no context call in memo),
    // so we filter in render step by letting card compute availability display.
    // To make availableOnly work here, we tag a placeholder property that child can check.
    // Simpler: pass flag down and let card show all; or we can do a second pass below using selectedDate + window cache.
    // For now, leave to child pill; optional hard filter below:
    if (availableOnly && selectedDate) {
      // Best-effort filter using a cached availability map if present
      try {
        const d = new Date(selectedDate).toISOString().slice(0, 10);
        const cached = sessionStorage.getItem(`availMap:${d}`);
        if (cached) {
          const map = JSON.parse(cached);
          arr = arr.filter((c) => map[String(c.actId)] === true);
        }
      } catch {
        // fallback: keep all and let the pill display
      }
    }

    // Sorters (fallback safe)
    if (sortBy === "price_asc") {
      arr.sort((a, b) => (a.basePrice || Infinity) - (b.basePrice || Infinity));
    } else if (sortBy === "price_desc") {
      arr.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortBy === "saves_desc") {
      arr.sort((a, b) => (b.loveCount || 0) - (a.loveCount || 0));
    } else {
      // newest: we don't have createdAt on cards; backend already sorts by -createdAt
      // keep incoming order
    }

    return arr;
  }, [actCards, search, availableOnly, selectedDate, sortBy]);

  return (
    <div className="w-full">
      <ActsFilterBar
        search={search}
        setSearch={setSearch}
        availableOnly={availableOnly}
        setAvailableOnly={setAvailableOnly}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            No acts match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((c) => (
              <ActCardItem key={String(c.actId || c._id || Math.random())} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}