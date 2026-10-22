  import React, { lazy, Suspense } from "react";
  import { jwtDecode } from "jwt-decode";
  import { ToastContainer } from "react-toastify";
  import Navbar from "./components/Navbar";
  import SearchBox from "./components/SearchBox";
  import Footer from "./components/Footer";
import { Routes, Route, useLocation } from "react-router-dom";
  import { useState, useEffect   } from "react";
import AuthGateModal from "./components/AuthGateModal";
import ScrollToTop from "./components/ScrollToTop";
import { Helmet } from "react-helmet-async";
import { locationPages } from "./data/locationPages.js";

// Keep the shared shell available while downloading only the requested page.
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Act = lazy(() => import("./pages/Act"));
const Acts = lazy(() => import("./pages/Acts"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Cart = lazy(() => import("./pages/Cart"));
const Client_Dashboard = lazy(() => import("./pages/Client_Dashboard"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Musician = lazy(() => import("./pages/Musician"));
const PlaceBooking = lazy(() => import("./pages/PlaceBooking"));
const Shortlist = lazy(() => import("./pages/Shortlist"));
const ViewEventSheet = lazy(() => import("./pages/ViewEventSheet"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const BookingCancelled = lazy(() => import("./pages/BookingCancelled"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const LocationWeddingBands = lazy(() => import("./pages/LocationWeddingBands"));
const VenueGuide = lazy(() => import("./pages/VenueGuide"));
const VenueClaim = lazy(() => import("./pages/VenueClaim"));

const VenueGuideLoading = () => (
  <main className="mx-auto max-w-6xl pb-20 pt-6" aria-busy="true">
    <section className="overflow-hidden rounded-[2rem] bg-black px-6 py-12 text-white sm:px-10 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#ff6677]">Plan with confidence</p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">The Supreme Collective Venue Guide</h1>
      <p className="mt-5 max-w-3xl text-lg leading-7 text-gray-300">Practical details gathered from venues and our previous events, including access, parking, changing facilities and room-specific sound restrictions.</p>
    </section>
    <section className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
      <div className="mb-2 h-6 w-44 animate-pulse rounded bg-gray-200" />
      <div className="h-16 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white" />)}
      </div>
    </section>
    <p role="status" className="py-12 text-center text-gray-500">Loading venue guide…</p>
  </main>
);

const PageLoading = ({ initialContent, initialPath }) => {
  const { pathname } = useLocation();
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  if (path === '/venues') return <VenueGuideLoading />;
  if (initialContent && path === initialPath) {
    return <div data-initial-page-content="" dangerouslySetInnerHTML={{ __html: initialContent }} />;
  }
  return <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-gray-600">Loading page…</div>;
};

  // 👇 helper to decode token once
  function parseToken(t) {
    if (!t) return {};
    try {
      const d = jwtDecode (t);
      const user = {
        firstName: d?.firstName || "",
        lastName: d?.lastName || "",
        email: d?.email || "",
        phone: d?.phone || "",
        userId: d?.userId || d?.id || "",
        userRole: d?.role || "",
        
      };
      // hardcoded override
      if (d?.id === "68123dcda79759339808b578") {
        user.userRole = "agent";
      }
      return user;
    } catch {
      return {};
    }
  }

  const App = ({ initialContent, initialPath, initialPage, initialPagePath }) => {
    const { pathname } = useLocation();
    const currentPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem("token") || "" : "";
    const initialUser = parseToken(initialToken);

  // ✅ hydrate initial state from token so first render is correct
    const [token, setToken] = useState(initialToken);
    const [firstName, setFirstName] = useState(initialUser.firstName || "");
    const [lastName, setLastName] = useState(initialUser.lastName || "");
    const [phone, setPhone] = useState(initialUser.phone || "");
    const [userId, setUserId] = useState(initialUser.userId || "");
    const [email, setEmail] = useState(initialUser.email || "");
    const [userRole, setUserRole] = useState(initialUser.userRole || "");
    const [password, setPassword] = useState(initialUser.password || "");
    const [hydrated, setHydrated] = useState(true); 

    const handleLogout = () => {
      setToken("");
      localStorage.clear();
      setFirstName("");
      setLastName("");
      setPhone("");
      setUserId("");
      setEmail("");
      setUserRole("");
      setPassword("");
    };

    // If token changes at runtime (login), re-hydrate fields
    useEffect(() => {
      if (!token) return;
      const d = parseToken(token);
      setFirstName(d.firstName || "");
      setLastName(d.lastName || "");
      setEmail(d.email || "");
      setPhone(d.phone || "");
      setUserId(d.userId || "");
      setUserRole(d.userRole || "");
      setPassword(d.password || "");
      setHydrated(true);
    }, [token]);


    return (
      <>
        <Helmet>
          {/* Global SEO defaults (individual pages can override with their own <Helmet>) */}
          <title>The Supreme Collective | Luxury Wedding & Event Bands</title>
          <meta
            name="description"
            content="Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote with travel."
          />

          {/* Social defaults */}
          <meta property="og:site_name" content="The Supreme Collective" />
          <meta property="og:type" content="website" />
          <meta
            property="og:title"
            content="The Supreme Collective | Luxury Wedding & Event Bands"
          />
          <meta
            property="og:description"
            content="Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote with travel."
          />
          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content="The Supreme Collective | Luxury Wedding & Event Bands"
          />
          <meta
            name="twitter:description"
            content="Luxury wedding and event bands across the UK. Browse acts, compare lineups, and get an instant quote with travel."
          />

          {/* Optional: set an absolute default OG image if you have one */}
          {/* <meta property="og:image" content="https://thesupremecollective.co.uk/og-default.jpg" /> */}
          {/* <meta name="twitter:image" content="https://thesupremecollective.co.uk/og-default.jpg" /> */}
        </Helmet>
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{ marginTop: "3.5rem" }}
          closeButton={false}
          
        />

            <div className="px-4 sm:px-[5vw] md:px-[7vw] lg:px-[4vw]">
          <Navbar />
         
          <AuthGateModal />
          <div className="mt-16">
             <SearchBox />
             <ScrollToTop />
            {initialPage && currentPath === initialPagePath ? <div data-initial-page-content="">{initialPage}</div> : <Suspense fallback={<PageLoading initialContent={initialContent} initialPath={initialPath} />}>
            <Routes>
               
              <Route path="/" element={<Home />} />
              <Route path="/acts" element={<Acts email={email}
                  userRole={userRole}
                  firstName={firstName}
                  lastName={lastName}
                  phone={phone}
                  password={password}
                  userId={userId}
                  />} />
                  
              <Route path="/about" element={<About />} />
              <Route path="/act/:key" element={<Act />} />
              <Route path="/acts/:preset" element={<Acts />} />
              {locationPages.map(({ slug }) => <Route key={slug} path={`/wedding-bands-${slug}`} element={<LocationWeddingBands slug={slug} />} />)}
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/client-dashboard" element={<Client_Dashboard />} />
              <Route path="/contact" element={<Contact />} />
                <Route path="/event-sheet/:bookingId" element={<ViewEventSheet />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/venues" element={<VenueGuide />} />
              <Route path="/venues/claim/:token" element={<VenueClaim />} />
 <Route path="/blog" element={<Blog />} />
  <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
<Route path="/musician/:key" element={<Musician />} />            
              <Route path="/booking-success" element={<BookingSuccess />} />
    <Route path="/booking-cancelled" element={<BookingCancelled />} />
              <Route path="/place-booking" element={<PlaceBooking />} />
              <Route path="/shortlist" element={<Shortlist />} />
            </Routes>
            </Suspense>}
          </div>
          <Footer />
        </div>
      </>
    );
  };

  export default App;
