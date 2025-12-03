import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import { Helmet } from "react-helmet-async";

/** Cloudinary helper: injects transforms */
const cld = (url, { w, h, crop = "fill", gravity = "auto", q = "auto", fmt = "auto" } = {}) => {
  if (typeof url !== "string" || !url.includes("/upload/")) return url || "";
  const parts = [`f_${fmt}`, `q_${q}`, "dpr_auto", `c_${crop}`, `g_${gravity}`];
  if (w) parts.push(`w_${w}`);
  if (h) parts.push(`h_${h}`);
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
};

/** Very small blurred placeholder */
const cldBlur = (url) =>
  cld(url, { w: 40, h: 22, q: 1, crop: "fill", gravity: "auto" }).replace(
    "/upload/",
    "/upload/e_blur:1000/"
  );

const widths = [480, 768, 1024, 1366, 1600, 1920];

const ActHero = ({
  actId,
  acts,
  act = null,
  heroUrl = null,
  heroSrcSet = "",
  heroSizes = "100vw",
  eager = false,
  hideHeart = false,
}) => {
  const [actData, setActData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { userId, shortlistAct, shortlistItems } = useContext(ShopContext);

  useEffect(() => {
    if (act && act._id) {
      setActData(act);
      return;
    }
    if (Array.isArray(acts) && acts.length) {
      const found = acts.find((a) => String(a._id) === String(actId));
      if (found) setActData(found);
    }
  }, [act, actId, acts]);

  const rawUrl = heroUrl || actData?.coverImage?.[0]?.url || actData?.images?.[0]?.url || "";
  if (!rawUrl) {
    return null;
  }
  const placeholder = cldBlur(rawUrl);

  // Fallbacks if hero props aren't provided
  const defaultW = 1500;
  const defaultH = Math.round((defaultW * 9) / 16);
  const fallbackSrc = cld(rawUrl, { w: defaultW, h: defaultH });
  const fallbackSrcSet = widths
    .map((w) => `${cld(rawUrl, { w, h: Math.round((w * 9) / 16) })} ${w}w`)
    .join(", ");

  const src = heroUrl || fallbackSrc;
  const srcSet = heroSrcSet || fallbackSrcSet;
  const sizes = heroSizes || "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw";

  const heroOrigin = (() => {
    try {
      return new URL(src).origin;
    } catch {
      return "https://res.cloudinary.com";
    }
  })();

  const isShortlisted =
    Array.isArray(shortlistItems) && actData?._id
      ? shortlistItems.map(String).includes(String(actData._id))
      : false;

  const handleHeartClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!actData?._id || !userId) return;
    setIsAnimating(true);
    try {
      await shortlistAct(userId, actData._id.toString());
    } catch (err) {
      console.error("❌ Heart click failed", err);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <>
      {/* ✅ Preload THIS page’s hero at the correct size */}
      <Helmet prioritizeSeoTags>
        <link rel="preconnect" href={heroOrigin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={heroOrigin} />
        <link
          rel="preload"
          as="image"
          href={src}
          imagesrcset={srcSet}
          imagesizes={sizes}
          crossOrigin="anonymous"
        />
      </Helmet>

      <div className="relative w-full max-w-full">
        {/* Image layer */}
        <div className="relative w-full aspect-[3/1] rounded-md overflow-hidden">
          {/* LQIP placeholder */}
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-md scale-105"
          />

          {/* Sharp hero image */}
          <img
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={actData.tscName || actData.name || "Act hero image"}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            decoding="async"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            onLoad={() => setLoaded(true)}
          />

          {/* Top-left heart */}
          {!hideHeart && (
            <button
              onClick={handleHeartClick}
              disabled={isAnimating}
              className="absolute top-4 left-4 p-2 z-20 hidden lg:block"
              aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
            >
              <div className="relative flex items-center justify-center">
                {isShortlisted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#ff6667"
                    stroke="#cc5253"
                    strokeWidth={1}
                    viewBox="0 0 24 24"
                    className={`w-8 h-8 transition-transform duration-200 ${isAnimating ? "scale-125" : ""}`}
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill={isAnimating ? "#ff6667" : "none"}
                    stroke="#ffffff"
                    strokeWidth={1}
                    viewBox="0 0 24 24"
                    className={`w-8 h-8 transition-transform duration-200 ${isAnimating ? "scale-125" : ""}`}
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
              </div>
            </button>
          )}

          {/* Bestseller badge */}
          {actData.bestseller && (
            <img
              src={assets.client_fave_icon}
              alt="Client Favourite Badge"
              className={`absolute ${hideHeart ? "top-2 right-2 w-[80px] h-[80px]" : "bottom-2 right-2 w-[150px] h-[150px] sm:w-[150px] sm:h-[150px]"} hidden lg:block`}
              decoding="async"
              loading="lazy"
            />
          )}

          {/* Overlay content */}
          <div className="absolute inset-0 grid place-items-center">
            <div className={`bg-black/50 ${hideHeart ? "h-[50%] p-6 rounded" : "p-6 rounded"} text-center max-w-2xl`}>
              {!hideHeart && (
                <div className="hidden md:flex items-center gap-2 justify-center mb-2 text-sm tracking-wider text-white">
                  <span className="w-8 h-[2px] bg-white inline-block" />
                  <span>BOOK NOW</span>
                  <span className="w-8 h-[2px] bg-white inline-block" />
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-snug text-white">
                {actData.tscName}
              </h1>
              <div className="hidden md:flex items-center gap-2 justify-center mt-4 text-sm tracking-wider text-white">
                <span>{actData.tscDescription}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

ActHero.propTypes = {
  actId: PropTypes.string.isRequired,
  acts: PropTypes.array.isRequired,
  act: PropTypes.object,
  heroUrl: PropTypes.string,
  heroSrcSet: PropTypes.string,
  heroSizes: PropTypes.string,
  eager: PropTypes.bool,
  hideHeart: PropTypes.bool,
};

export default ActHero;