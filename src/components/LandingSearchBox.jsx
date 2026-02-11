import React, { useContext, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import RoyalMailAddressNow from "./RoyalMailAddressNow";
import LeadCaptureModal from "./LeadCaptureModal";
import { gtagEvent } from "../utils/gtag";

const isValidUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase();
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(pc);
};

const normaliseUKPostcode = (value = "") => {
  const pc = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (pc.length < 5) return value;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(-3)}`;
};

const extractPostcode = (text = "") => {
  const m = String(text || "")
    .toUpperCase()
    .match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/);
  return m ? m[1] : "";
};

const LandingSearchBox = () => {
  const navigate = useNavigate();
  const openedAtRef = useRef(Date.now());

  const { setSelectedAddress, setSelectedDate, setSelectedCounty, setSelectedPostcode } =
    useContext(ShopContext);

  const [localDate, setLocalDate] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");

  const [leadModalOpen, setLeadModalOpen] = useState(false);

  const rawPc = postcode || extractPostcode(localAddress);
  const postcodeOk = useMemo(() => isValidUKPostcode(rawPc), [rawPc]);

  const searchDisabled = !localDate?.trim() || !localAddress?.trim() || !postcodeOk;

  const handleSearchClick = () => {
    gtagEvent("lp_search_click", {
      has_date: !!localDate.trim(),
      has_address: !!localAddress.trim(),
      has_county: !!county.trim(),
      postcode_valid: postcodeOk,
    });

    if (!localAddress.trim()) return alert("Please enter your venue or postcode.");
    if (!localDate.trim()) return alert("Please select a date.");
    if (!postcodeOk) {
      return alert(
        "Please type a full UK postcode (or select an address) so we can calculate travel."
      );
    }

    // Open lead capture modal (Option A)
    setLeadModalOpen(true);
  };

  const submitLeadAndGo = async ({ email, phone, marketingOptIn }) => {
    const pc = normaliseUKPostcode(rawPc);

    // persist search
    sessionStorage.setItem("selectedAddress", localAddress || "");
    sessionStorage.setItem("selectedDate", localDate || "");
    sessionStorage.setItem("selectedCounty", county || "");
    sessionStorage.setItem("selectedPostcode", pc || "");

    // persist lead
    sessionStorage.setItem("leadEmail", email || "");
    sessionStorage.setItem("leadPhone", phone || "");
    sessionStorage.setItem("leadMarketingOptIn", marketingOptIn ? "1" : "0");

    // sync context
    setSelectedAddress?.(localAddress || "");
    setSelectedDate?.(localDate || "");
    setSelectedCounty?.(county || "");
    setSelectedPostcode?.(pc || "");

    const ms = openedAtRef.current ? Date.now() - openedAtRef.current : null;

    gtagEvent("lp_lead_submit", {
      marketing_opt_in: !!marketingOptIn,
      has_phone: !!String(phone || "").trim(),
      duration_ms: ms,
    });

    // OPTIONAL: send to backend (remove if not ready)
    // try {
    //   await fetch(`${import.meta.env.VITE_BACKEND_URL || ""}/api/leads`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       email,
    //       phone,
    //       marketingOptIn,
    //       address: localAddress,
    //       county,
    //       postcode: pc,
    //       date: localDate,
    //       source: "landing_page",
    //     }),
    //   });
    // } catch (e) {
    //   // don't block navigation if lead save fails
    // }

    setLeadModalOpen(false);

    navigate("/acts", {
      state: {
        county,
        postcode: pc,
        selectedAddress: localAddress,
        selectedDate: localDate,
        lead: { email, phone, marketingOptIn },
      },
    });
    window.scrollTo({ top: 0, left: 0 });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start justify-center gap-4">
        {/* Date */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          <p className="font-medium text-sm text-gray-700 mb-1">DATE</p>
          <input
            type="date"
            className="border-2 border-gray-300 p-2 text-gray-500 bg-white w-full"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>

        {/* Venue */}
        <div className="w-full sm:w-[420px] flex flex-col text-left">
          <p className="font-medium text-sm text-gray-700 mb-1">VENUE POSTCODE</p>

          <RoyalMailAddressNow
            // IMPORTANT: give this instance its own prefix so it never clashes
            idPrefix="lp"
            // If you're using a specific capture key for landing page:
            // captureKey="YOUR-LP-CAPTURE-KEY"
            setAddress={setLocalAddress}
            setCounty={setCounty}
            setPostcode={setPostcode}
            initialValue={localAddress}
            className="text-base px-3 py-2 w-full border-2 border-gray-300 bg-white"
            placeholder="Type your venue or postcode..."
            required
          />

          <div className="min-h-[16px] mt-1">
            {postcodeOk ? (
              <p className="text-xs text-green-600">
                Postcode detected: {normaliseUKPostcode(rawPc)}
              </p>
            ) : (
              <span className="block text-xs opacity-0 select-none">placeholder</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="w-full sm:w-auto flex flex-col text-left">
          <div className="h-[20px] mb-1" aria-hidden="true" />
          <button
            className={`w-full sm:w-auto px-6 py-2 text-white transition duration-300 border-2 border-[#ff6667] ${
              searchDisabled
                ? "bg-[#ff6667] hover:bg-gray-400 cursor-not-allowed opacity-70"
                : "bg-[#ff6667] hover:bg-[#ff3333]"
            }`}
            onClick={handleSearchClick}
            disabled={searchDisabled}
          >
            SEARCH
          </button>
          <div className="min-h-[16px] mt-1" aria-hidden="true" />
        </div>
      </div>

      <LeadCaptureModal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onConfirm={submitLeadAndGo}
      />
    </div>
  );
};

export default LandingSearchBox;