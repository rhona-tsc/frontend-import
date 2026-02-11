import React from "react";
import LandingSearchBox from "../components/LandingSearchBox";

const LandingPage = () => {
  return (
    <main className="w-full">
      {/* HERO */}
      <section className="bg-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs tracking-widest text-gray-300 uppercase">
                Luxury wedding & event bands across the UK
              </p>

              <h1 className="mt-3 text-4xl md:text-5xl font-semibold leading-tight">
                Find the perfect live band for your date — in minutes.
              </h1>

              <p className="mt-4 text-gray-300 leading-relaxed">
                Enter your venue + date to see handpicked options, transparent
                pricing, and quick availability checks.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-gray-200">
                <li>• Premium acts, polished production, reliable logistics</li>
                <li>• Fast response + availability confirmation</li>
                <li>• No spam — details used only for your enquiry</li>
              </ul>
            </div>

            {/* Primary conversion */}
            <div className="bg-white text-black rounded-2xl p-5 shadow-lg">
              <p className="text-sm font-medium mb-3">
                Check availability & pricing
              </p>

              <LandingSearchBox />

              <p className="mt-3 text-xs text-gray-500">
                By searching, you agree we can contact you about your enquiry.
                Marketing is optional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / SOCIAL PROOF */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border p-5">
              <p className="text-sm font-semibold">Curated roster</p>
              <p className="mt-2 text-sm text-gray-600">
                Only acts that meet your standard — talent, presentation,
                punctuality and vibe.
              </p>
            </div>

            <div className="rounded-2xl border p-5">
              <p className="text-sm font-semibold">Clear pricing</p>
              <p className="mt-2 text-sm text-gray-600">
                Upfront estimates including travel, lineups, and add-ons — no
                awkward surprises.
              </p>
            </div>

            <div className="rounded-2xl border p-5">
              <p className="text-sm font-semibold">Quick availability</p>
              <p className="mt-2 text-sm text-gray-600">
                We can check vocalist/musician availability and lock things in
                fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ (light) */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5">
              <p className="font-semibold text-sm">1) Search</p>
              <p className="mt-2 text-sm text-gray-600">
                Enter your venue + date so we can calculate travel accurately.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <p className="font-semibold text-sm">2) View options</p>
              <p className="mt-2 text-sm text-gray-600">
                Browse acts that fit your vibe, budget and space.
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <p className="font-semibold text-sm">3) Shortlist & book</p>
              <p className="mt-2 text-sm text-gray-600">
                Shortlist favourites and we’ll confirm availability and next
                steps.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;