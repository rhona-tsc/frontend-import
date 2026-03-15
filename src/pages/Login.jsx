import React, { useContext, useState, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useNavigate, useLocation } from "react-router-dom"; // ✅ add useLocation
import { toast } from 'react-toastify';
import axios from 'axios'; 
import CustomToast from "../components/CustomToast";
import { Helmet } from "react-helmet-async";

const Login = () => {
  const navigate = useNavigate(); 
    const location = useLocation(); // ✅

  const [currentState, setCurrentState] = useState('Login');
  const {
    token,
    setToken,
    backendUrl,
    shortlistAct,
    fetchShortlistedActs,
    shortlistedActs,
    setUser,
  } = useContext(ShopContext);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');


    useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]); // ✅ runs whenever you navigate to /login

  useEffect(() => {
  const pendingActId = sessionStorage.getItem("pendingShortlistActId");
  const storedUserRaw = localStorage.getItem("user");
  const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;

  if (pendingActId && storedUser?._id) {
    // User is already logged in, just do the auto-shortlist + redirect
    (async () => {
      await handleAutoShortlist(storedUser._id);
      redirectAfterAuth();
    })();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  
  // ✅ Helper – send them to the page they wanted before login (or home)
  const redirectAfterAuth = () => {
    const next = sessionStorage.getItem('postLoginNext');
    if (next) {
      sessionStorage.removeItem('postLoginNext');
      navigate(next, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  // ✅ Auto-shortlist logic: runs after a successful login
  // IMPORTANT: shortlistAct() is a toggle in many implementations.
  // Here we make it behave like “ensure this act is added” to avoid accidentally removing it.
  const handleAutoShortlist = async (userId) => {
    const pendingActId = sessionStorage.getItem("pendingShortlistActId");
    const actName = sessionStorage.getItem("pendingShortlistActName");
    if (!pendingActId) return;

    try {
      // 1) Pull latest shortlist from server so we don’t toggle-off something that’s already saved
      let latest = Array.isArray(shortlistedActs) ? shortlistedActs : [];

if (typeof fetchShortlistedActs === "function") {
  const serverIds = await fetchShortlistedActs(userId);
  if (Array.isArray(serverIds) && serverIds.length) latest = serverIds;
}

      const alreadyShortlisted = latest.some(
        (id) => String(id) === String(pendingActId)
      );

      if (alreadyShortlisted) {
        toast(
          <CustomToast
            type="info"
            message={`${actName || "Act"} is already in your shortlist.`}
          />
        );
        return;
      }

      // 2) Toggle (should add now, because we just confirmed it isn't already there)
      const toggleRes = await shortlistAct(userId, pendingActId);

      // If shortlistAct returns a success flag, respect it
      if (toggleRes && toggleRes.success === false) {
        throw new Error(toggleRes.message || "shortlist_toggle_failed");
      }

      // 3) Refresh again so UI state definitely matches server
      if (typeof fetchShortlistedActs === "function") {
        await fetchShortlistedActs(userId);
      }

      toast(
        <CustomToast
          type="success"
          message={`${actName || "Act"} added to your shortlist!`}
        />
      );
    } catch (err) {
      console.warn("⚠️ Failed to auto-shortlist after login:", err?.message || err);
      toast(
        <CustomToast
          type="error"
          message="Couldn't add act to your shortlist automatically."
        />
      );
    } finally {
      // 🧹 Always clean up after
      sessionStorage.removeItem("pendingShortlistActId");
      sessionStorage.removeItem("pendingShortlistActName");
    }
  };

const onSubmitHandler = async (event) => {
  event.preventDefault();

  try {
    if (currentState === "Sign Up") {
      const response = await axios.post(`${backendUrl}/api/user/register`, {
        firstName,
        lastName,
        email,
        password,
        phone,
      });

      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);

        const user = {
          _id: response.data.userId,
          email: response.data.email,
        };

        setUser(user); // 🆕 keeps context + localStorage in sync
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.removeItem("shortlistItems");

       // ✅ Google Ads conversion: Lead – Shortlist Signup
try {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    const leadKey = `lead_shortlist_signup_${String(response.data.userId || email).toLowerCase()}`;
    if (sessionStorage.getItem(leadKey) !== "1") {
      sessionStorage.setItem(leadKey, "1");

    const tx = `lead_${String(response.data.userId || email).toLowerCase()}`;

window.gtag("event", "conversion", {
  send_to: "AW-17648722186/HfomCNTEi_IbEIrCyN9B",
  value: 1.0,
  currency: "GBP",
  transaction_id: tx,
});
    }
  }
} catch (e) {
  console.warn("⚠️ Lead conversion tracking failed", e);
}

        await handleAutoShortlist(user._id); // 🆕 auto-shortlist if pending
        redirectAfterAuth();
      } else {
        toast(<CustomToast type="error" message={response.data.message} />);
      }
    } else {
      const response = await axios.post(
        `${backendUrl}/api/user/login`,
        { email, password },
        { withCredentials: false }
      );

      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);

        const user = {
          _id: response.data.userId,
          email: response.data.email,
        };

        setUser(user); // 🆕 keeps context + localStorage in sync
        localStorage.setItem("user", JSON.stringify(user));

        // (Optional) If you ALSO want to count “login from shortlist gate” as a lead signal, add it here.
        // I would usually NOT count logins as leads unless this flow is rare and high-intent.

        await handleAutoShortlist(user._id); // 🆕 auto-shortlist if pending
        redirectAfterAuth();
      } else {
        toast(<CustomToast type="error" message={response.data.message} />);
      }
    }
  } catch (error) {
    console.log(error);
    if (error?.response?.data?.message) {
      toast(<CustomToast type="error" message={error.response.data.message} />);
    } else {
      toast(<CustomToast type="error" message="Something went wrong. Please try again." />);
    }
  }
};

  const handleForgotPassword = async () => {
    const trimmed = String(email || "").trim();
    if (!trimmed) {
      toast(<CustomToast type="info" message="Enter your email above, then click ‘Forgot your password?’" />);
      return;
    }
    try {
      await axios.post(`${backendUrl}/api/user/forgot-password`, { email: trimmed });
      toast(<CustomToast type="success" message="If that email exists, we’ve sent a reset link." />);
    } catch (err) {
      console.error('Forgot password error:', err?.response?.data || err?.message || err);
      toast(<CustomToast type="error" message="Couldn’t start password reset. Please try again." />);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    window.logout = logout;
  }, []);

  return (
    <>
      <Helmet>
        <title>Login | The Supreme Collective</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://thesupremecollective.co.uk/login" />
        <meta property="og:url" content="https://thesupremecollective.co.uk/login" />
      </Helmet>

      <form
        onSubmit={onSubmitHandler}
        className="flex flex-col items-center w-[90%] sm:max-w-96 m-auto mt-14 gap-4 text-gray-800"
      >
      <div className="inline-flex items-center gap-2 mb-2 mt-10">
        <p className="prata-regular text-3xl">{currentState}</p>
        <hr className="border-none h-[1.5px] w-8 bg-gray-800" />
      </div>

      {currentState === "Login" ? (
        ""
      ) : (
        <>
          <input
            onChange={(e) => setFirstName(e.target.value)}
            value={firstName}
            type="text"
            className="w-full px-3 py-2 border border-gray-800"
            placeholder="First name"
            required
          />
          <input
            onChange={(e) => setLastName(e.target.value)}
            value={lastName}
            type="text"
            className="w-full px-3 py-2 border border-gray-800"
            placeholder="Last Name"
            required
          />
          <input
            onChange={(e) => setPhone(e.target.value)}
            value={phone}
            type="text"
            className="w-full px-3 py-2 border border-gray-800"
            placeholder="Phone number"
            required
          />
        </>
      )}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        className="w-full px-3 py-2 border border-gray-800"
      />

      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        autoComplete={currentState === "Login" ? "current-password" : "new-password"}
        required
        className="w-full px-3 py-2 border border-gray-800"
      />

      <div className="w-full flex justify-between text-sm mt-[-8px]">
        <p
          className="cursor-pointer underline"
          onClick={handleForgotPassword}
          title="We’ll email you a reset link"
        >
          Forgot your password?
        </p>

        {currentState === "Login" ? (
          <p
            onClick={() => setCurrentState("Sign Up")}
            className="cursor-pointer"
          >
            Create account
          </p>
        ) : (
          <p
            onClick={() => setCurrentState("Login")}
            className="cursor-pointer"
          >
            Login Here
          </p>
        )}
      </div>

      <button className="bg-black text-white font-light px-8 py-2 mt-4">
        {currentState === "Login" ? "Sign In" : "Sign Up"}
      </button>
      </form>
    </>
  );
};

export default Login;