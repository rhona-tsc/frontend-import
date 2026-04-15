import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import CustomToast from "../components/CustomToast";
import { ShopContext } from "../context/ShopContext";
import { useContext } from "react";
import SEO from "../components/SEO";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { backendUrl } = useContext(ShopContext);

  const token = useMemo(() => params.get("token") || "", [params]);
  const email = useMemo(() => params.get("email") || "", [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!email || !token) {
      toast(<CustomToast type="error" message="Reset link is missing token or email." />);
      return;
    }
    if (!newPassword || !confirm) {
      toast(<CustomToast type="error" message="Please fill in both password fields." />);
      return;
    }
    if (newPassword.length < 8) {
      toast(<CustomToast type="error" message="Password must be at least 8 characters." />);
      return;
    }
    if (newPassword !== confirm) {
      toast(<CustomToast type="error" message="Passwords do not match." />);
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post(
        `${backendUrl}/api/user/reset-password`,
        { email: String(email).trim().toLowerCase(), token, newPassword },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );

      if (!data?.success) throw new Error(data?.message || "Reset failed");

      toast(<CustomToast type="success" message="Password updated! You can now sign in." />);
      navigate("/login", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Reset failed.";
      toast(<CustomToast type="error" message={msg} />);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
 <SEO
  title="Reset Password | The Supreme Collective"
  description="Reset your password."
  path="/reset-password"
  noindex={true}
/>
    <form
      onSubmit={onSubmit}
      className="flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800"
    >
      <div className="inline-flex items-center gap-2 mb-2 mt-10">
        <p className="prata-regular text-3xl">Reset Password</p>
        <hr className="border-none h-[1.5px] w-8 bg-gray-800" />
      </div>

      <input
        value={email}
        disabled
        className="w-full px-3 py-2 border border-gray-300 bg-gray-100"
      />

      <input
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        type="password"
        placeholder="New password (min 8 chars)"
        autoComplete="new-password"
        required
        className="w-full px-3 py-2 border border-gray-800"
      />

      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        type="password"
        placeholder="Confirm new password"
        autoComplete="new-password"
        required
        className="w-full px-3 py-2 border border-gray-800"
      />

      <button
        disabled={loading}
        className={`bg-black text-white font-light px-8 py-2 mt-2 ${
          loading ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Updating..." : "Update password"}
      </button>

      <p className="text-sm text-gray-600 underline cursor-pointer" onClick={() => navigate("/login")}>
        Back to login
      </p>
    </form>
    </>
  );
};

export default ResetPassword;