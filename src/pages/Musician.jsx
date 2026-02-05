import React, { useContext, useState, useEffect, useRef, lazy, Suspense, useDeferredValue } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { assets } from "../assets/assets";
import calculateActPricing from "./utils/pricing";
import "react-toastify/dist/ReactToastify.css";

import Title from "../components/Title";
import { getPossessiveTitleCase } from "./utils/getPossessiveTitleCase"; // adjust path as needed
import axios from "axios";
import { useLocation } from "react-router-dom";
import MusicianHero from "../components/MusicianHero";
const MusicianRepertoireSection = lazy(() => import("../components/MusicianRepertoireSection"));
const RelatedMusicians = lazy(() => import("../components/RelatedMusicians"));
const MusicianEquipment = lazy(() => import("../components/MusicianEquipment"));

const getStoredUserId = () =>
  sessionStorage.getItem("userId") || localStorage.getItem("userId") || null;

// Calculate average rating from reviews, rounded to nearest 0.5
const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce(
    (total, review) => total + (review.rating || 0),
    0
  );
  return Math.round((sum / reviews.length) * 2) / 2; // round to nearest 0.5
};

const Musician = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const location = useLocation();

  // Extract YouTube video ID from a full URL or return as-is if already an ID
  const extractVideoId = (url) => {
    if (!url) return "";
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : url;
  };
  const { musicianId } = useParams();
  const {
    acts,
    addToCart,
    addToShortlist,
    selectedDate,
    selectedAddress,
    setShowSearch,
    setShortlistedActs,
  } = useContext(ShopContext);
  const { cartItems, removeFromCart } = useContext(ShopContext); // 👈 Import removeFromCart and cartItems
  const [selectedCounty, setSelectedCounty] = useState(
    sessionStorage.getItem("selectedCounty") || ""
  );
  const [finalTravelPrice, setFinalTravelPrice] = useState(null);

  // Fetch musician/deputy profile for this page
  useEffect(() => {
    let abort = false;
    const run = async () => {
      try {
        const base = (import.meta.env.VITE_BACKEND_URL || "").replace(
          /\/$/,
          ""
        );
        // Try common endpoints – your router mixes act/musician routes
       const attempts = [
  `${base}/api/musician/get/${musicianId}`,
  `${base}/api/musician/profile/${musicianId}`,
  `${base}/api/musician/${musicianId}`,

  `${base}/api/musicians/get/${musicianId}`,
  `${base}/api/musicians/profile/${musicianId}`,
  `${base}/api/musicians/${musicianId}`,
];
        let payload = null;
        for (const url of attempts) {
          try {
            const r = await fetch(url);
            if (r.ok) {
              payload = await r.json();
              break;
            }
          } catch {}
        }
        if (!abort && payload) {
          // be tolerant to different shapes coming back
          const m =
            payload.deputy ||
            payload.musician ||
            payload.act ||
            payload.data ||
            payload;
          if (m) {
            setActData(m);
            console.log("📝 Bio fields:", {
              tscApprovedBio: m?.tscApprovedBio,
              bio: m?.bio            });

            // pick a default video from approved links if present
            const vids = [
              ...(Array.isArray(m?.tscApprovedFunctionBandVideoLinks)
                ? m.tscApprovedFunctionBandVideoLinks
                : []),
              ...(Array.isArray(m?.tscApprovedOriginalBandVideoLinks)
                ? m.tscApprovedOriginalBandVideoLinks
                : []),
            ].filter((v) => v && v.url);
            if (vids.length) setVideo(vids[0].url);
          }
        }
      } catch (err) {
        if (!abort) console.error("Failed to load musician profile", err);
      }
    };
    if (musicianId) run();
    return () => {
      abort = true;
    };
  }, [musicianId]);

  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100); // short delay so content is rendered first
      }
    }
  }, [location]);
  // Deep debug logging after useContext calls
  console.log("🎵 RENDERING Musician.jsx");
  console.log("🛒 ShopContext values:", {
    acts,
    selectedDate,
    selectedAddress,
    selectedCounty,
    cartItems,
    addToCart,
    addToShortlist,
  });
  const [actData, setActData] = useState(null);
const userRole = sessionStorage.getItem("userRole") || localStorage.getItem("userRole") || "";
const isPrivileged = userRole === "musician" || userRole === "agent";
const m = actData?.act || actData?.musician || actData?.deputy || actData || null;

  const [isYesForSelectedDate, setIsYesForSelectedDate] = useState(null);

  const [selectedLineup, setSelectedLineup] = useState("");
  const [video, setVideo] = useState("");
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return "No date selected";

    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();

    // Convert day to "1st", "2nd", "3rd", etc.
    const suffix = ["th", "st", "nd", "rd"][
      day % 10 > 3 ? 0 : ((day % 100) - (day % 10) !== 10) * (day % 10)
    ];

    return `${day}${suffix} of ${month} ${year}`;
  };

  // Gallery Carousel logic
  const galleryRef = useRef(null);

  const videoContainerRef = useRef(null);
  const [videoVisible, setVideoVisible] = useState(false);

  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      galleryRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // verify latest reply on this act+date (deferred)
  useEffect(() => {
    let abort = false;
    const idle = (fn) =>
      ("requestIdleCallback" in window)
        ? window.requestIdleCallback(fn, { timeout: 1500 })
        : setTimeout(fn, 400);

    const run = async () => {
      try {
        if (!actData?._id || !selectedDate) {
          if (!abort) setIsYesForSelectedDate(null);
          return;
        }
        const dateISO = new Date(selectedDate).toISOString().slice(0, 10);
        const base = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
        const url = new URL(`${base}/api/v2/availability/acts-by-dateV2`);
        url.searchParams.set("date", dateISO);
        url.searchParams.set("musicianId", String(actData._id));

        const resp = await fetch(url.toString(), { headers: { accept: "application/json" } });
        const text = await resp.text();
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
        if (!abort) {
          const latest = data?.latestReply ?? data?.reply ?? data?.status ?? "";
          setIsYesForSelectedDate(String(latest).toLowerCase() === "yes");
        }
      } catch {
        if (!abort) setIsYesForSelectedDate(null);
      }
    };

    idle(run);
    return () => { abort = true; };
  }, [actData?._id, selectedDate]);
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el || videoVisible) return;

    const onIntersect = (entries) => {
      if (entries[0]?.isIntersecting) {
        setVideoVisible(true);
        observer.disconnect();
      }
    };

    const observer = new window.IntersectionObserver(onIntersect, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoVisible]);

useEffect(() => {
  const fetchShortlist = async () => {
    try {
      const storedUserId = getStoredUserId();
      if (!storedUserId) return;

      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/shortlist/user/${storedUserId}/shortlisted`
      );

      const musicianIds = (res?.data?.acts || []).map((act) => act._id);
      setShortlistedActs(musicianIds);
    } catch (err) {
      console.error("Failed to fetch shortlist", err);
    }
  };

  fetchShortlist();
}, [setShortlistedActs]);

  // Touch/swipe gesture support for gallery carousel (images)
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    const onTouchStart = (e) => {
      isDown = true;
      startX = e.touches[0].pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onTouchMove = (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = startX - x;
      el.scrollLeft = scrollLeft + walk;
    };
    const onTouchEnd = () => {
      isDown = false;
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Review gallery carousel logic
  const reviewGalleryRef = useRef(null);

  const scrollReviews = (direction) => {
    if (reviewGalleryRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      reviewGalleryRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const el = reviewGalleryRef.current;
    if (!el) return;
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    const onTouchStart = (e) => {
      isDown = true;
      startX = e.touches[0].pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onTouchMove = (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - el.offsetLeft;
      const walk = startX - x;
      el.scrollLeft = scrollLeft + walk;
    };
    const onTouchEnd = () => {
      isDown = false;
    };
    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

useEffect(() => {
  // if we already loaded the musician via the fetch above, don't overwrite it
  if (actData) return;

  if (!Array.isArray(acts) || acts.length === 0) return;

  console.log("🔍 Looking for musicianId:", musicianId);
  const foundAct = acts.find((item) => String(item?._id) === String(musicianId));

  if (!foundAct) {
    console.warn("⚠️ No matching act/musician in ShopContext. Skipping.");
    return;
  }

  const reviews = Array.isArray(foundAct.reviews) ? foundAct.reviews : [];
  console.log("📝 foundAct.reviews:", reviews);

  const avgRating = calculateAverageRating(reviews);
  console.log("⭐ Average Rating Calculated:", avgRating);

  setActData({
    ...foundAct,
    averageRating: avgRating,
  });
  console.log("📝 Bio fields (ShopContext):", {
    tscApprovedBio: foundAct?.tscApprovedBio,
    bio: foundAct?.bio,
  });

  setVideo(
    (Array.isArray(foundAct.videos) && foundAct.videos[0]?.url) ? foundAct.videos[0].url : ""
  );

  if (Array.isArray(foundAct.lineups) && foundAct.lineups.length > 0) {
    setSelectedLineup(foundAct.lineups[0]);
  }
}, [musicianId, acts]);
  useEffect(() => {
    const fetchPrice = async () => {
      if (!actData || !selectedLineup || !selectedDate || !selectedAddress) {
        console.warn(
          "⚠️ Skipping travel price calc – missing or invalid inputs"
        );
        return;
      }

      const selectedCounty =
        selectedAddress?.split(",").slice(-2)[0]?.trim() || "";

      try {
        const result = await calculateActPricing(
          actData,
          selectedCounty,
          selectedAddress,
          selectedDate,
          selectedLineup
        );

        if (result) {
          setFinalTravelPrice(result);
          console.log("✅ Travel-inclusive price:", result);
        } else {
          console.warn(
            "⚠️ Failed to calculate travel-inclusive price (null result)"
          );
        }
      } catch (error) {
        console.error("❌ Error in price calculation:", error);
      }
    };

    fetchPrice();
  }, [actData, selectedLineup, selectedDate, selectedAddress]);

  // --- Gallery tab state for musician media sets ---
  const [activeMediaTab, setActiveMediaTab] = useState("blackTie");
  // one of: "blackTie" | "formal" | "smartCasual" | "sessionAllBlack" | "additional"

  // Helper to get short name: first + last initial, with fallbacks
  const displayShortName = (act) => {
    const first = act?.firstName || act?.tscName || act?.tscName || "Musician";
    const lastInitial = act?.lastName ? ` ${act.lastName.charAt(0)}` : "";
    return `${first}${lastInitial}`.trim();
  };

  // ------- generic content helpers -------
  const hasContent = (v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return Boolean(v);
  };

  const pickBioText = (data) => {
    const preferred = data?.tscApprovedBio ?? data?.bio ?? "";
    if (preferred == null) return "";
    if (typeof preferred === "string") return preferred.trim();
    if (Array.isArray(preferred)) {
      try {
        return preferred
          .map((b) =>
            typeof b === "string"
              ? b
              : b?.text || b?.children?.map?.((c) => c?.text).join("") || ""
          )
          .join("\n");
      } catch {
        return "";
      }
    }
    try {
      return JSON.stringify(preferred);
    } catch {
      return String(preferred || "");
    }
  };

const content = React.useMemo(() => {
  if (!actData) {
    return {
      hasVideos: false,
      hasBio: false,
      hasInstrumentation: false,
      hasVocals: false,
      hasAnySkills: false,
      hasLocation: false,
      hasCredits: false,
      hasGallery: false,
      hasRepertoire: false,
      hasEquipment: false,
      hasSnapshot: false,
      hasRelated: false,
      bio: "",
    };
  }

  const videosArr = [
    ...(Array.isArray(actData?.tscApprovedFunctionBandVideoLinks)
      ? actData.tscApprovedFunctionBandVideoLinks
      : []),
    ...(Array.isArray(actData?.tscApprovedOriginalBandVideoLinks)
      ? actData.tscApprovedOriginalBandVideoLinks
      : []),
  ].filter((v) => v && v.url);

  const hasVideos = videosArr.length > 0;

  const bio = pickBioText(actData);
  const hasBio = hasContent(bio);

  const hasInstrumentation =
    Array.isArray(actData?.instrumentation) && actData.instrumentation.length > 0;

  const hasVocals =
    (Array.isArray(actData?.vocals?.type) && actData.vocals.type.length > 0) ||
    hasContent(actData?.vocals?.range) ||
    actData?.vocals?.rap === true ||
    actData?.vocals?.rap === "true";

  const otherSkillsArr = Array.isArray(actData?.other_skills)
    ? actData.other_skills
    : [];
  const hasAnySkills = otherSkillsArr.length > 0;

  const hasLocation = hasContent(actData?.address?.county);

  const hasCredits =
    (Array.isArray(actData?.academic_credentials) && actData.academic_credentials.length > 0) ||
    (Array.isArray(actData?.awards) && actData.awards.length > 0) ||
    (Array.isArray(actData?.function_bands_performed_with) && actData.function_bands_performed_with.length > 0) ||
    (Array.isArray(actData?.original_bands_performed_with) && actData.original_bands_performed_with.length > 0) ||
    (Array.isArray(actData?.sessions) && actData.sessions.length > 0);

  const galleryCounts = [
    actData?.digitalWardrobeBlackTie,
    actData?.digitalWardrobeFormal,
    actData?.digitalWardrobeSmartCasual,
    actData?.digitalWardrobeSessionAllBlack,
    actData?.additionalImages,
  ].map((g) => (Array.isArray(g) ? g.length : 0));
  const hasGallery = galleryCounts.some((n) => n > 0);

  const hasRepertoire =
    Array.isArray(actData?.selectedSongs) && actData.selectedSongs.length > 0;

  const hasEquipment =
    hasContent(actData?.equipment_spec) ||
    hasContent(actData?.pa_equipment) ||
    hasContent(actData?.iem) ||
    hasContent(actData?.dj_gear) ||
    hasContent(actData?.lighting) ||
    hasContent(actData?.additional_gear);

  const hasSnapshot = hasInstrumentation || hasVocals || hasLocation || hasAnySkills;

  const hasRelated =
    (Array.isArray(actData?.vocals?.genres) && actData.vocals.genres.length > 0) ||
    hasInstrumentation ||
    hasContent(Array.isArray(actData?.vocals?.type) ? actData.vocals.type[0] : "");

  return {
    hasVideos,
    hasBio,
    hasInstrumentation,
    hasVocals,
    hasAnySkills,
    hasLocation,
    hasCredits,
    hasGallery,
    hasRepertoire,
    hasEquipment,
    hasSnapshot,
    hasRelated,
    bio,
  };
}, [actData]);

  // Tiny conditional wrapper
  const Section = ({ when, children }) => (when ? <>{children}</> : null);

  return (
  <div className="p-4">
    {/* Top Navigation */}
    <div className="flex justify-between items-center mb-4">
      <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-black">
        ← Back
      </button>

      

      <div />
    </div>

    {/* HERO */}
    {actData ? (
      <MusicianHero musicianId={musicianId} acts={acts} />
    ) : (
      <div className="h-56 bg-gray-100 animate-pulse rounded" />
    )}

    {/* ===== ROW 1: LEFT (video + thumbs + bio), RIGHT (in brief) ===== */}
    <div className="border-t-2 pt-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* LEFT: span 8 */}
        <div className="lg:col-span-8 space-y-4">
          {/* Videos */}
          <Section when={content.hasVideos}>
            <div className="aspect-video">
              <div className="text-2xl">
                <Title
                  text1={getPossessiveTitleCase(displayShortName(actData))}
                  text2="VIDEOS"
                />
              </div>
              {(() => {
                const allVideoLinks = [
                  ...(Array.isArray(actData?.tscApprovedFunctionBandVideoLinks)
                    ? actData.tscApprovedFunctionBandVideoLinks
                    : []),
                  ...(Array.isArray(actData?.tscApprovedOriginalBandVideoLinks)
                    ? actData.tscApprovedOriginalBandVideoLinks
                    : []),
                ].filter((v) => v && v.url);

                const selectedUrl = video || allVideoLinks[0]?.url || "";
                const selectedVideoId = extractVideoId(selectedUrl);

                if (!selectedVideoId) return null; // hide if none

                return (
                  <div ref={videoContainerRef} className="w-full h-full">
                    {videoVisible ? (
                      <iframe
                        className="w-full h-full object-contain aspect-video rounded"
                        src={`https://www.youtube.com/embed/${selectedVideoId}?modestbranding=1&rel=0&showinfo=0&controls=0`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVideoVisible(true)}
                        className="w-full h-full rounded overflow-hidden relative group"
                        aria-label="Play video"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${selectedVideoId}/hqdefault.jpg`}
                          alt="Video poster"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span
                          className="absolute inset-0 grid place-items-center"
                          aria-hidden
                        >
                          <span className="w-16 h-16 rounded-full bg-black/60 group-hover:bg-black/70 transition"/>
                          <span
                            className="absolute w-0 h-0"
                            style={{
                              borderLeft: "18px solid white",
                              borderTop: "12px solid transparent",
                              borderBottom: "12px solid transparent",
                              marginLeft: "-8px",
                            }}
                          />
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Thumbnails */}
            {(() => {
              const covers = Array.isArray(actData?.tscApprovedFunctionBandVideoLinks)
                ? actData.tscApprovedFunctionBandVideoLinks.filter((v) => v && v.url)
                : [];
              const originals = Array.isArray(actData?.tscApprovedOriginalBandVideoLinks)
                ? actData.tscApprovedOriginalBandVideoLinks.filter((v) => v && v.url)
                : [];

              const Row = ({ label, items }) => {
                if (!items.length) return null;
                return (
                  <div className="mb-3">
                    <div className="text-xs tracking-widest text-gray-500 uppercase mb-1 px-1">
                      {label}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {items.map((videoObj, index) => {
                        const videoId = extractVideoId(videoObj.url);
                        if (!videoId) return null;
                        return (
                          <img
                            key={`${label}-${index}`}
                            onClick={() => setVideo(videoObj.url)}
                            className="w-[96px] h-[54px] object-cover cursor-pointer flex-shrink-0 border-2 border-transparent hover:border-[#ff6667] hover:shadow-md transition duration-200 rounded"
                            src={`https://img.youtube.com/vi/${videoId}/0.jpg`}
                            alt={videoObj.title || `${label} ${index + 1}`}
                            title={videoObj.title || videoObj.url}
                            loading="lazy"
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div className="mt-2">
                  <Row label="Covers" items={covers} />
                  <Row label="Originals" items={originals} />
                </div>
              );
            })()}
          </Section>

          {/* Bio */}
          <Section when={content.hasBio}>
            <div className="mt-12">
              <div className="text-2xl">
                <Title
                  text1={getPossessiveTitleCase(displayShortName(actData))}
                  text2="BIOGRAPHY"
                />
              </div>
              <div className="px-2 py-2 text-gray-600 text-lg sm:text-xl leading-relaxed">
                {(() => {
                  const raw = content.bio;
                  const looksLikeHTML = /<\/?[a-z][\s\S]*>/i.test(raw) || /&lt;<\/?[a-z][\s\S]*&gt;/i.test(raw);
                  const html = looksLikeHTML ? raw : String(raw).replace(/\n/g, "<br/>");
                  return <div dangerouslySetInnerHTML={{ __html: html }} />;
                })()}
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT: IN BRIEF span 4 */}
        <Section when={content.hasSnapshot}>
          <div className="lg:col-span-4">
            <div className="text-2xl" id="lineup-selector">
              <Title
                text1={getPossessiveTitleCase(displayShortName(actData))}
                text2="SNAPSHOT"
              />
            </div>
            {/* Instrumentation */}
            {Array.isArray(actData?.instrumentation) && (actData?.instrumentation?.length || 0) > 0 && (
              <>
                <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Instrumentation</h4>
                  {(() => {
                    const skillOrder = { Expert: 1, Advanced: 2, Intermediate: 3 };
                    const sorted = [...(actData.instrumentation || [])].sort((a, b) => {
                      const aOrder = skillOrder[a?.skill_level] || 99;
                      const bOrder = skillOrder[b?.skill_level] || 99;
                      return aOrder - bOrder;
                    });
                    return sorted.map((item, idx) => (
                      <li key={`inst-${idx}`}>
                        {item?.instrument}
                        {item?.skill_level ? ` (${item.skill_level})` : ""}
                      </li>
                    ));
                  })()}
                </ul>
              </>
            )}

            {/* Vocals */}
            <Section when={content.hasVocals}>
              <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Vocals</h4>
                {Array.isArray(actData?.vocals?.type) && (actData?.vocals?.type?.length || 0) > 0 && (
                  <li>
                    {actData.vocals.type.join(", ")}
                    {actData.vocals?.range ? ` (${actData.vocals.range})` : ""}
                  </li>
                )}
                {(actData?.vocals?.rap === true || actData?.vocals?.rap === "true") && <li>Can rap / MC</li>}
              </ul>
            </Section>

            {/* Skills categories */}
            <Section when={content.hasAnySkills}>
              {(() => {
                const liveSkillsSet = new Set([
                  "Live Audio Recording",
                  "Sound Engineering",
                  "Sound Engineering with PA & Lights Provision",
                  "DJ with Decks",
                  "DJ with Mixing Console",
                  "Roaming Performer",
                  "Talkback Experience",
                  "Musical Director",
                  "Band Leader",
                  "Can perform to click track",
                  "Can perform to backing track",
                  "Can trigger backing tracks",
                  "Can perform to live band and backing track",
                ]);
                const studioSkillsSet = new Set(["Music Production: Mixing", "Music Production: Mastering"]);
                const prepSkillsSet = new Set(["Client Liaison", "Can curate backing tracks", "Can curate setlist"]);
                const otherSkillsSet = new Set(["Photography", "Videography"]);

                const otherSkillsArr = Array.isArray(actData?.other_skills) ? actData.other_skills : [];
                const liveSkills = otherSkillsArr.filter((skill) => liveSkillsSet.has(skill));
                const studioSkills = otherSkillsArr.filter((skill) => studioSkillsSet.has(skill));
                const prepSkills = otherSkillsArr.filter((skill) => prepSkillsSet.has(skill));
                const otherSkills = otherSkillsArr.filter((skill) => otherSkillsSet.has(skill));
                const allCategorized = new Set([...liveSkills, ...studioSkills, ...prepSkills, ...otherSkills]);
                const uncategorized = otherSkillsArr.filter((skill) => !allCategorized.has(skill));
                const fullOtherSkills = [...otherSkills, ...uncategorized];
const m = actData?.act || actData?.musician || actData?.deputy || actData;

                return (
                  <>
                    {liveSkills.length > 0 && (
                      <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Live Skills</h4>
                        {liveSkills.map((skill, idx) => (
                          <li key={`live-skill-${idx}`}>{skill}</li>
                        ))}
                      </ul>
                    )}
                    {studioSkills.length > 0 && (
                      <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Studio Skills</h4>
                        {studioSkills.map((skill, idx) => (
                          <li key={`studio-skill-${idx}`}>{skill}</li>
                        ))}
                      </ul>
                    )}
                    {prepSkills.length > 0 && (
                      <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Preparatory Skills</h4>
                        {prepSkills.map((skill, idx) => (
                          <li key={`prep-skill-${idx}`}>{skill}</li>
                        ))}
                      </ul>
                    )}
                    {(() => {
                      const visibleOtherSkills = ["Photography", "Videography"].filter((skill) => fullOtherSkills.includes(skill));
                      return visibleOtherSkills.length > 0 ? (
                        <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Other</h4>
                          {visibleOtherSkills.map((skill) => (
                            <li key={skill}>{skill}</li>
                          ))}
                        </ul>
                      ) : null;
                    })()}
                  </>
                );
              })()}
            </Section>

            {/* Location */}
            <Section when={content.hasLocation}>
              <ul className="list-disc pl-5 text-lg text-gray-600 mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                {actData?.address?.county && <li>Based in {actData?.address?.county}</li>}
              </ul>
            </Section>
          </div>
        </Section>
      </div>

      {/* ===== GALLERY (full width) ===== */}
      {/*  Academics & Achievements */}

<Section when={Boolean(
  isPrivileged &&
  m &&
  (
    (Array.isArray(m?.academic_credentials) && m.academic_credentials.length > 0) ||
    (Array.isArray(m?.function_bands_performed_with) && m.function_bands_performed_with.length > 0) ||
    (Array.isArray(m?.original_bands_performed_with) && m.original_bands_performed_with.length > 0) ||
    (Array.isArray(m?.sessions) && m.sessions.length > 0)
  )
)}>
        <div className="lg:col-span-7">
          <div className="text-2xl mb-2">
            <Title text1={getPossessiveTitleCase(`${actData?.firstName || ""}`)} text2="ACADEMICS, ACHIEVEMENTS & BANDS" />
          </div>
          <div className="border rounded px-4 py-6 text-m text-gray-700 w-full my-2 sm:px-6 sm:py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 🎓 Academic Credentials */}
            <div>
              {Array.isArray(actData?.academic_credentials) &&
                actData.academic_credentials.length > 0 && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-2">Education & Achievements</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {m.academic_credentials.map((cred, idx) => {
                        const level = cred?.education_level ? `${cred.education_level} — ` : "";
                        const course = cred?.course || "";
                        const inst = cred?.institution ? ` @ ${cred.institution}` : "";
                        const years = cred?.years ? ` (${cred.years})` : "";
                        const line = `${level}${course}${inst}${years}`.trim();
                        return line ? <li key={`cred-${idx}`}>{line}</li> : null;
                      })}
                    </ul>
                    {Array.isArray(actData?.awards) && actData.awards.length > 0 && (
                      <>
                        <ul className="list-disc pl-5 space-y-1">
                          {actData.awards.map((a, idx) => {
                            const desc = a?.description || "";
                            const years = a?.years ? ` (${a.years})` : "";
                            const line = `${desc}${years}`.trim();
                            return line ? <li key={`award-${idx}`}>{line}</li> : null;
                          })}
                        </ul>
                      </>
                    )}
                  </>
                )}
            </div>
            {/* 🎸 Function Bands Performed With */}
            <div>
              {Array.isArray(actData?.function_bands_performed_with) &&
                actData.function_bands_performed_with.length > 0 && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-2">Function Projects</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {m.function_bands_performed_with?.map((b, idx) => {
                        const name = b?.function_band_name || "";
                        return name ? (
                          <li key={`funcband-${idx}`}>
                            {name}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </>
                )}
            </div>
            {/* 🎤 Original Bands Performed With */}
            <div>
              {Array.isArray(actData?.original_bands_performed_with) &&
                m.original_bands_performed_with.length > 0 && (
                  <>
                    <h4 className="font-semibold text-gray-900 mb-2">Original Projects</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {actData.original_bands_performed_with.map((b, idx) => {
                        const name = b?.original_band_name || "";
                        return name ? (
                          <li key={`origband-${idx}`}>
                            {name}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </>
                )}
            </div>
            {/* 🎚️ Sessions */}
            <div>
              {Array.isArray(actData?.sessions) && actData.sessions.length > 0 && (
                <>
                  <h4 className="font-semibold text-gray-900 mb-2">Sessions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {m.sessions.map((s, idx) => {
                      const artist = s?.artist || "";
                      const stype = s?.session_type ? `, ${s.session_type}` : "";
                      const line = `${artist}${stype}`.trim();
                      return line ? <li key={`session-${idx}`}>{line}</li> : null;
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* GALLERY */}
      <Section when={content.hasGallery}>
        <div className="text-2xl mt-12">
          <Title text1={getPossessiveTitleCase(displayShortName(actData))} text2="GALLERY" />
        </div>
        {(() => { /* keep existing gallery code unchanged */ return (
          <> 
            {(() => {
              const mediaGroups = [
                {
                  id: "blackTie",
                  label: "Black Tie",
                  items: Array.isArray(actData?.digitalWardrobeBlackTie)
                    ? actData.digitalWardrobeBlackTie
                    : [],
                },
                {
                  id: "formal",
                  label: "Formal",
                  items: Array.isArray(actData?.digitalWardrobeFormal)
                    ? actData.digitalWardrobeFormal
                    : [],
                },
                {
                  id: "smartCasual",
                  label: "Smart Casual",
                  items: Array.isArray(actData?.digitalWardrobeSmartCasual)
                    ? actData.digitalWardrobeSmartCasual
                    : [],
                },
                {
                  id: "sessionAllBlack",
                  label: "Session All Black",
                  items: Array.isArray(actData?.digitalWardrobeSessionAllBlack)
                    ? actData.digitalWardrobeSessionAllBlack
                    : [],
                },
                {
                  id: "additional",
                  label: "Additional",
                  items: Array.isArray(actData?.additionalImages)
                    ? actData.additionalImages
                    : [],
                },
              ];

              const activeGroup = mediaGroups.find((g) => g.id === activeMediaTab) || mediaGroups[0];
              const images = (activeGroup?.items || [])
                .map((item) => {
                  if (typeof item === "string") return item;
                  if (item && typeof item === "object" && item.url) return item.url;
                  return null;
                })
                .filter(Boolean);

              return (
                <>
                  {/* Tabs */}
                  <div className="flex flex-wrap gap-2 mt-4 px-1">
                    {mediaGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setActiveMediaTab(g.id)}
                        className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                          activeMediaTab === g.id
                            ? "bg-black text-white border-black"
                            : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-[#ff6667] hover:text-white hover:border-[#ff6667]"
                        }`}
                      >
                        {g.label} ({g.items?.length || 0})
                      </button>
                    ))}
                  </div>

               {/* Carousel */}
<div className="relative px-1 py-3">
  {images.length > 0 ? (
    <div className="relative">
      <button
        onClick={() => scrollGallery("left")}
        className="absolute -left-6 top-1/2 -translate-y-1/2 z-10"
        aria-label="Scroll left"
        type="button"
      >
        <img
          src={assets.scroll_left_icon}
          alt="Scroll left"
          className="w-8 h-8"
        />
      </button>

      <div
        ref={galleryRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollBehavior: "smooth" }}
      >
        {images.map((url, index) => (
          <div
            key={`${activeGroup.id}-${index}`}
            className="w-[600px] h-[400px] bg-gray-100 rounded shadow-sm flex-shrink-0 snap-start overflow-hidden flex items-center justify-center"
          >
            <img
              src={url}
              alt={`${activeGroup.label} image ${index + 1}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollGallery("right")}
        className="absolute -right-6 top-1/2 -translate-y-1/2 z-10"
        aria-label="Scroll right"
        type="button"
      >
        <img
          src={assets.scroll_right_icon}
          alt="Scroll right"
          className="w-8 h-8"
        />
      </button>
    </div>
  ) : null}
</div>
                </>
              );
            })()}
          </>
        ); })()}
      </Section>

      {/* ===== REPERTOIRE (full width) ===== */}
      <Section when={content.hasRepertoire}>
        <div className="w-full mt-10">
          <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse rounded" /> }>
            <MusicianRepertoireSection
              selectedSongs={Array.isArray(actData?.selectedSongs) ? actData.selectedSongs : []}
              actData={actData}
              addToCart={addToCart}
            />
          </Suspense>
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        

        {/* RIGHT: Equipment */}
        <Section when={content.hasEquipment}>
          <div className="lg:col-span-12">
            <div className="text-2xl mb-2">
              <Title text1={getPossessiveTitleCase(`${actData?.firstName || ""}`)} text2="EQUIPMENT" />
            </div>
            <div className="relative">
              <Suspense fallback={<div className="h-48 bg-gray-100 animate-pulse rounded" /> }>
                <MusicianEquipment actData={actData} />
              </Suspense>
            </div>
          </div>
        </Section>
      </div>

      {/* ===== RELATED MUSICIANS (full width) ===== */}
      <Section when={content.hasRelated}>
        <div className="w-full mt-12">
          <Suspense fallback={<div className="h-32 bg-gray-100 animate-pulse rounded" /> }>
            <RelatedMusicians
              genres={Array.isArray(actData?.vocals?.genres) ? actData.vocals.genres : []}
              instruments={Array.isArray(actData?.instrumentation) ? actData.instrumentation.map((i) => i?.instrument).filter(Boolean) : []}
              vocalist={Array.isArray(actData?.vocals?.type) ? actData.vocals.type[0] || "" : ""}
              currentActId={actData?._id}
            />
          </Suspense>
        </div>
      </Section>
    </div>
  </div>
);
};

export default Musician;
