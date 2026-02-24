import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CustomToast from "./CustomToast";
import { ShopContext } from "../context/ShopContext";
import { useLocation, useNavigate } from "react-router-dom";

const GUEST_SHORTLIST_KEY = "guestShortlistItems";

/* -------------------------------------------------------------- */
/* small helpers                                                  */
/* -------------------------------------------------------------- */
const readGuestShortlist = () => {
  try {
    const raw = localStorage.getItem(GUEST_SHORTLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const clearGuestShortlist = () => {
  try {
    localStorage.removeItem(GUEST_SHORTLIST_KEY);
  } catch {}
};

const AuthGateModal = ({ open, msg, kind, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    backendUrl,
    setToken,
    setUser,
    shortlistAct,
    fetchShortlistedActs,
    shortlistedActs,
  } = useContext(ShopContext);

  const gateMsg =
    msg || "Save your shortlist & check availability — enter your details.";

  const [step, setStep] = useState(1); // 1=email, 2=otp
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const emailOk = useMemo(
    () => /\S+@\S+\.\S+/.test(String(email || "").trim()),
    [email]
  );

  // Reset internal state whenever modal opens
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setOtp("");
    setLoading(false);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const redirectAfterAuth = () => {
    const next = sessionStorage.getItem("postLoginNext");
    if (next) {
      sessionStorage.removeItem("postLoginNext");
      if (next !== `${location.pathname}${location.search || ""}`) {
        navigate(next, { replace: true });
      }
    }
  };

  const mergeGuestShortlistToUser = async (userId) => {
    const guestIds = readGuestShortlist();
    if (!guestIds.length) return;

    let latest = Array.isArray(shortlistedActs)
      ? shortlistedActs.map(String)
      : [];

    if (typeof fetchShortlistedActs === "function") {
      try {
        const res = await fetchShortlistedActs(userId);
        if (Array.isArray(res)) latest = res.map(String);
      } catch (e) {
        console.warn("fetchShortlistedActs failed before merge", e?.message || e);
      }
    }

    for (const actId of guestIds) {
      if (latest.includes(String(actId))) continue;
      try {
        await shortlistAct(userId, String(actId));
      } catch (e) {
        console.warn("merge shortlist failed for act:", actId, e?.message || e);
      }
    }

    if (typeof fetchShortlistedActs === "function") {
      try {
        await fetchShortlistedActs(userId);
      } catch {}
    }

    clearGuestShortlist();
  };

  const requestOtp = async () => {
    const trimmed = String(email || "").trim().toLowerCase();

    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      toast(<CustomToast type="error" message="Please enter a valid email address." />);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/auth/request-otp`,
        { email: trimmed, kind: kind || "save_shortlist" },
        { withCredentials: true }
      );

      // always move to step 2 because code may already be in inbox
      setStep(2);

      if (res?.data?.throttled) {
        toast(
          <CustomToast
            type="info"
            message="Code already sent — check inbox/spam. You can resend in a few seconds."
          />
        );
      } else {
        toast(<CustomToast type="success" message="We’ve sent a 6-digit code to your email." />);
      }
    } catch (e) {
      console.error(e);
      toast(<CustomToast type="error" message="Couldn’t send the code. Please try again." />);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const trimmedEmail = String(email || "").trim().toLowerCase();
    const code = String(otp || "").trim();

    if (!trimmedEmail || code.length < 4) {
      toast(<CustomToast type="error" message="Enter the code from your email." />);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/auth/verify-otp`,
        {
          email: trimmedEmail,
          code,
          phone: String(phone || "").trim(),
          kind: kind || "save_shortlist",
        },
        { withCredentials: true }
      );

      if (!res?.data?.success || !res?.data?.token || !res?.data?.userId) {
        toast(<CustomToast type="error" message="That code didn’t work. Try again." />);
        return;
      }

      const token = res.data.token;
      const user = {
        _id: res.data.userId,
        email: res.data.email || trimmedEmail,
        role: res.data.role || "customer",
      };

      setToken(token);
      localStorage.setItem("token", token);

      if (typeof setUser === "function") setUser(user);
      localStorage.setItem("user", JSON.stringify(user));

      await mergeGuestShortlistToUser(user._id);

      sessionStorage.removeItem("pendingShortlistActId");
      sessionStorage.removeItem("pendingShortlistActName");

      toast(<CustomToast type="success" message="Saved! Your shortlist is now linked to your email." />);

      onClose?.();
      redirectAfterAuth();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message === "expired_code"
          ? "That code expired — request a new one."
          : e?.response?.data?.message === "too_many_attempts"
          ? "Too many attempts — request a new code."
          : "That code didn’t work — please try again.";
      toast(<CustomToast type="error" message={msg} />);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />

      <div className="relative w-[92%] max-w-md bg-white rounded-xl shadow-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Save your shortlist</h3>
            <p className="text-sm text-gray-600 mt-1">{gateMsg}</p>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="text-gray-500 hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">EMAIL</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  PHONE (OPTIONAL)
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07…"
                  autoComplete="tel"
                />
              </div>

              <button
                type="button"
                onClick={requestOtp}
                disabled={!emailOk || loading}
                className={`w-full py-2 rounded text-white ${
                  !emailOk || loading ? "bg-gray-400" : "bg-black hover:bg-gray-900"
                }`}
              >
                {loading ? "Sending code…" : "Send me a code"}
              </button>

              <p className="text-[12px] text-gray-500 leading-snug">
                No password needed. We’ll email you a one-time code.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">6-DIGIT CODE</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded tracking-[0.25em] text-center"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                />
              </div>

              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading || !otp.trim()}
                className={`w-full py-2 rounded text-white ${
                  loading || !otp.trim() ? "bg-gray-400" : "bg-black hover:bg-gray-900"
                }`}
              >
                {loading ? "Verifying…" : "Verify & continue"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={requestOtp}
                  className="underline text-gray-700"
                  disabled={loading}
                >
                  Resend code
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="underline text-gray-700"
                  disabled={loading}
                >
                  Change email
                </button>
              </div>

              <p className="text-[12px] text-gray-500 leading-snug">Code expires in 10 minutes.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGateModal;