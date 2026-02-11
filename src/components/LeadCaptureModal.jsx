import React, { useEffect, useMemo, useState } from "react";

const isValidEmail = (email = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const normalisePhone = (value = "") => String(value || "").trim();

const LeadCaptureModal = ({ open, onClose, onConfirm }) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  useEffect(() => {
    if (!open) return;
    // prefill if we already captured previously
    setEmail(sessionStorage.getItem("leadEmail") || "");
    setPhone(sessionStorage.getItem("leadPhone") || "");
    setMarketingOptIn(sessionStorage.getItem("leadMarketingOptIn") === "1");
  }, [open]);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const canSubmit = emailOk;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border">
          <div className="p-5 border-b">
            <p className="text-sm font-semibold">Almost there…</p>
            <h3 className="mt-1 text-xl font-semibold">
              Where should we send your options?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              We’ll use this to share your shortlist + confirm availability.
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-[#ff6667]">*</span>
              </label>
              <input
                type="email"
                className="w-full border-2 border-gray-300 p-2 bg-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
              />
              {!emailOk && email.trim() ? (
                <p className="mt-1 text-xs text-[#ff6667]">
                  Please enter a valid email.
                </p>
              ) : (
                <div className="min-h-[16px] mt-1" aria-hidden="true" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (optional)
              </label>
              <input
                type="tel"
                className="w-full border-2 border-gray-300 p-2 bg-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07…"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional — helps us confirm availability faster.
              </p>
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
              />
              <span>
                Send me occasional tips + offers (optional)
              </span>
            </label>
          </div>

          <div className="p-5 border-t flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border-2 border-gray-300 bg-white"
            >
              Back
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() =>
                onConfirm?.({
                  email: String(email || "").trim(),
                  phone: normalisePhone(phone),
                  marketingOptIn,
                })
              }
              className={`px-5 py-2 border-2 border-[#ff6667] text-white ${
                canSubmit
                  ? "bg-[#ff6667] hover:bg-[#ff3333]"
                  : "bg-[#ff6667] opacity-60 cursor-not-allowed"
              }`}
            >
              View available bands
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureModal;