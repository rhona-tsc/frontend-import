import React from "react";

export default function ActsFilterBar({
  search,
  setSearch,
  availableOnly,
  setAvailableOnly,
  sortBy,
  setSortBy,
}) {
  return (
    <div className="w-full sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search acts by name…"
            className="w-full md:w-96 px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Available toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Show available for selected date
            </span>
          </label>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price (low → high)</option>
            <option value="price_desc">Price (high → low)</option>
            <option value="saves_desc">Most saved</option>
          </select>
        </div>
      </div>
    </div>
  );
}