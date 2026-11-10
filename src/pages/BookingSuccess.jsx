import { trackBusinessConversion } from "../utils/businessConversions.js";
// src/pages/BookingSuccess.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContext } from "react";
import { ShopContext } from "../context/ShopContext";
import SEO from "../components/SEO";

const BookingSuccess = () => {
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [eventSheetDue, setEventSheetDue] = useState(null);
  const [balanceDue, setBalanceDue] = useState(null);
  const { setCartItems } = useContext(ShopContext);

  const [verification, setVerification] = useState("checking");
  const [verificationMessage, setVerificationMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const sessionId = new URLSearchParams(location.search).get("session_id") ||
      sessionStorage.getItem("tsc:lastCheckoutSession");
    if (!sessionId) { setVerification("unverified"); return; }
    sessionStorage.setItem("tsc:lastCheckoutSession", sessionId);
    (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/booking/measurement?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include", cache: "no-store" });
        const result = await response.json();
        if (!response.ok || result.verified !== true) throw new Error(result.message || "Your payment is still being checked.");
        if (cancelled) return;
        setVerification("verified");
        setBooking({ bookingId: result.bookingRef, date: result.eventDate });
        trackBusinessConversion(result.measurement);
        setCartItems({});
        localStorage.removeItem("cart");
        if (result.eventDate) {
          const event = new Date(result.eventDate);
          const sheet = new Date(event); sheet.setMonth(sheet.getMonth() - 1);
          const balance = new Date(event); balance.setDate(balance.getDate() - 14);
          const opts = { year: 'numeric', month: 'long', day: 'numeric' };
          setEventSheetDue(sheet.toLocaleDateString('en-GB', opts));
          setBalanceDue(balance.toLocaleDateString('en-GB', opts));
        }
        // Finalization is independently payment-verified on the server. Keep the
        // session in the URL until successful, allowing a failed request to retry.
        const guard = `bookingComplete:${sessionId}`;
        if (sessionStorage.getItem(guard) !== "1") {
          const finalized = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/booking/booking-complete?session_id=${encodeURIComponent(sessionId)}`,
            { credentials: "include" });
          if (!finalized.ok) throw new Error("Payment received. We're still preparing your booking confirmation.");
          sessionStorage.setItem(guard, "1");
        }
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        if (!cancelled) {
          setVerificationMessage(error.message);
          setVerification((current) => current === "verified" ? current : "unverified");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [location.search, setCartItems]);

  if (verification !== "verified") return (
    <div className="p-10 text-center max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{verification === "checking" ? "Checking your payment…" : "We’re checking your booking"}</h1>
      <p>{verificationMessage || "A booking is confirmed once payment has been verified."}</p>
      {verification === "unverified" && <button className="mt-6 underline" onClick={() => window.location.reload()}>Check again</button>}
      <p className="mt-6"><Link to="/contact">Contact our bookings team</Link></p>
    </div>
  );

  return (
    <>
 <SEO
  title="Booking Success | The Supreme Collective"
  description="Booking confirmed."
  path="/booking-success"
  noindex={true}
/>
    <div className="p-10 text-center max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🎉 Booking Confirmed!</h1>
      <p className="mb-4">
        Thank you — your payment has been verified. Your confirmation and signed contract will arrive by email.
      </p>
      <p className="mb-4">
        When you’re ready, head to your Event Sheet to add key details — it auto-saves and keeps everyone aligned.
      </p>

      {verificationMessage && <p className="mb-4">{verificationMessage}</p>}
      {/* Use the same link pattern as Client_Dashboard */}
      {booking ? (
        <div className="mb-6">
          <Link
            to={`/event-sheet/${booking.bookingId || booking._id}`}
            className="inline-block bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Take Me to the Event Sheet
          </Link>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-6">Loading your booking…</p>
      )}

      {/* (Removed the Dashboard button on mobile & desktop as requested) */}

      <div className="text-center mt-6 border-t pt-4 text-sm">
        <p className="font-semibold mb-2">Key Dates for Your Diary:</p>
        <ul className="list-disc list-inside">
          <li>Event Sheet due: <strong>{eventSheetDue || '4 weeks before your event'}</strong></li>
          <li>Balance payment due: <strong>{balanceDue || '2 weeks before your event'}</strong></li>
        </ul>
      </div>

      <p className="mt-6 font-medium">
        Warmest wishes,<br/>The Supreme Collective
      </p>
    </div>
    </>
  );
};

export default BookingSuccess;