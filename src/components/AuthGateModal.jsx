import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import CustomToast from "./CustomToast";
import { ShopContext } from "../context/ShopContext";
import { useLocation, useNavigate } from "react-router-dom";

const GUEST_SHORTLIST_KEYS = ["guestShortlistItems", "shortlistItems"];

/* -------------------------------------------------------------- */
/* small helpers                                                  */
/* -------------------------------------------------------------- */
const readGuestShortlist = () => {
  try {
    const merged = GUEST_SHORTLIST_KEYS.flatMap((key) => {
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    });

    return Array.from(new Set(merged.filter(Boolean)));
  } catch {
    return [];
  }
};

const clearGuestShortlist = () => {
  try {
    GUEST_SHORTLIST_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
};

const buildAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  token,
});

const AuthGateModal = ({ open, msg, kind, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    backendUrl,
    setToken,
    setUser,
    fetchShortlistedActs,
    setShortlistedActs,
    setShortlistItems,
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

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setOtp("");
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const redirectAfterAuth = () => {
    const returnTo = sessionStorage.getItem("pendingShortlistReturnTo");
    const next = returnTo || sessionStorage.getItem("postLoginNext");

    sessionStorage.removeItem("pendingShortlistReturnTo");
    if (next) {
      sessionStorage.removeItem("postLoginNext");
      if (next !== `${location.pathname}${location.search || ""}`) {
        navigate(next, { replace: true });
      }
    }
  };

  const fetchServerShortlistIds = async ({ userId, token }) => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/availability/user/${encodeURIComponent(userId)}/shortlisted`,
        {
          headers: buildAuthHeaders(token),
          withCredentials: true,
        }
      );

      const ids = (res?.data?.acts || res?.data?.items || res?.data?.data || [])
        .map((a) => String(a?._id || a?.actId || a?.id || ""))
        .filter(Boolean);

      return Array.from(new Set(ids));
    } catch (e) {
      console.warn(
        "fetchServerShortlistIds failed",
        e?.response?.data || e?.message || e
      );
      return [];
    }
  };

  const addActsToUserShortlist = async ({ userId, token, actIds, email }) => {
    const ids = Array.from(new Set((actIds || []).map(String).filter(Boolean)));
    if (!userId || !token || !ids.length) return [];

    const added = [];

    for (const actId of ids) {
      try {
        const res = await axios.patch(
          `${backendUrl}/api/availability/act/${encodeURIComponent(actId)}/increment-shortlist`,
          {
            userId,
            clientEmail: email || "",
          },
          {
            headers: buildAuthHeaders(token),
            withCredentials: true,
          }
        );

        console.log("✅ addActsToUserShortlist success", {
          actId,
          response: res?.data,
        });
        added.push(String(actId));
      } catch (e) {
        console.warn(
          "addActsToUserShortlist failed for act:",
          actId,
          e?.response?.data || e?.message || e
        );
      }
    }

    return added;
  };

  const mergeGuestShortlistToUser = async ({ userId, token, email }) => {
    const pendingActId = sessionStorage.getItem("pendingShortlistActId");

    const guestIds = Array.from(
      new Set(
        [...readGuestShortlist(), ...(pendingActId ? [String(pendingActId)] : [])].filter(Boolean)
      )
    );

    console.log("🪄 mergeGuestShortlistToUser start", {
      userId,
      guestIds,
      localShortlistItems: (() => {
        try {
          return localStorage.getItem("shortlistItems");
        } catch {
          return null;
        }
      })(),
      localGuestShortlistItems: (() => {
        try {
          return localStorage.getItem("guestShortlistItems");
        } catch {
          return null;
        }
      })(),
      pendingActId,
    });

    if (!guestIds.length) return [];

    const latest = await fetchServerShortlistIds({ userId, token });
    const missingIds = guestIds.filter((actId) => !latest.includes(String(actId)));

    console.log("🪄 mergeGuestShortlistToUser before add", {
      latest,
      missingIds,
    });

    let addedIds = [];
    if (missingIds.length) {
      addedIds = await addActsToUserShortlist({ userId, token, actIds: missingIds, email });
    }

    let refreshed = await fetchServerShortlistIds({ userId, token });

    // If the read endpoint is delayed / eventually consistent, keep the UI/state correct
    // by merging in the ids we just added successfully.
    if (addedIds.length) {
      refreshed = Array.from(new Set([...(refreshed || []), ...addedIds.map(String)]));
    }

    // Final safety net: ensure we never lose the guest shortlist locally right after auth.
    if (!refreshed.length && guestIds.length) {
      refreshed = Array.from(new Set(guestIds.map(String)));
    }

    console.log("🪄 mergeGuestShortlistToUser after add", {
      addedIds,
      refreshed,
    });

    if (typeof setShortlistedActs === "function") setShortlistedActs(refreshed);
    if (typeof setShortlistItems === "function") setShortlistItems(refreshed);

    try {
      localStorage.setItem("shortlistItems", JSON.stringify(refreshed));
      localStorage.setItem("guestShortlistItems", JSON.stringify(refreshed));
    } catch {}

    const allMerged = guestIds.every((actId) => refreshed.includes(String(actId)));

    if (allMerged) {
      clearGuestShortlist();
      try {
        localStorage.setItem("shortlistItems", JSON.stringify(refreshed));
      } catch {}
      sessionStorage.removeItem("pendingShortlistActId");
      sessionStorage.removeItem("pendingShortlistActName");
      console.log("✅ Guest shortlist fully merged to server/local state", {
        guestIds,
        addedIds,
        refreshed,
      });
    } else {
      console.warn("⚠️ Some guest shortlist ids were not confirmed by read endpoint", {
        guestIds,
        addedIds,
        refreshed,
      });
    }

    return refreshed;
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
      console.log("🔐 OTP verified, token received", {
        userId: res.data.userId,
        tokenPresent: !!token,
      });
      localStorage.setItem("token", token);

      if (typeof setUser === "function") setUser(user);
      localStorage.setItem("user", JSON.stringify(user));

      try {
        const currentGuest = readGuestShortlist();
        localStorage.setItem("guestShortlistItems", JSON.stringify(currentGuest));
      } catch {}

      const mergedIds = await mergeGuestShortlistToUser({
        userId: user._id,
        token,
        email: user.email || trimmedEmail,
      });

      if (typeof fetchShortlistedActs === "function") {
        try {
          const serverIds = await fetchShortlistedActs(user._id, token, mergedIds);
          if (Array.isArray(serverIds) && serverIds.length) {
            if (typeof setShortlistedActs === "function") setShortlistedActs(serverIds);
            if (typeof setShortlistItems === "function") setShortlistItems(serverIds);
            localStorage.setItem("shortlistItems", JSON.stringify(serverIds));
          }
        } catch (e) {
          console.warn("post-merge fetchShortlistedActs failed", e?.message || e);
        }
      }

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