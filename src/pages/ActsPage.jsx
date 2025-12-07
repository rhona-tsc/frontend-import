import React from "react";
import ActCardGrid from "../components/acts-grid/ActCardGrid";

/**
 * Standalone Acts listing page using its own card components.
 * Safe: does not modify any homepage/new-acts/bestsellers code.
 */
export default function ActsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-7xl mx-auto px-4 pt-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Browse Acts
        </h1>
        <p className="text-gray-600 mt-1">
          Filter by availability, search by name, and compare prices.
        </p>
      </header>

      <main className="mt-4">
        <ActCardGrid />
      </main>
    </div>
  );
}