import { useRef } from "react";
import PropTypes from "prop-types";
import Title from "./Title";

const MusicianSocialPosts = ({ posts }) => {
  const carouselRef = useRef(null);

  if (!posts.length) return null;

  const scroll = (direction) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left:
        direction === "left"
          ? -carousel.clientWidth * 0.8
          : carousel.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-12 w-full" aria-label="Social highlights">
      <div className="flex items-end justify-between gap-4">
        <div className="text-2xl">
          <Title text1="SOCIAL" text2="HIGHLIGHTS" />
        </div>
        {posts.length > 1 ? (
          <div className="flex gap-2 pb-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-gray-700 transition hover:border-[#ff6667] hover:text-[#d94f50]"
              aria-label="Previous social highlights"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-gray-700 transition hover:border-[#ff6667] hover:text-[#d94f50]"
              aria-label="Next social highlights"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={carouselRef}
        className="mt-3 flex snap-x snap-mandatory gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => (
          <div
            key={post.key}
            className="relative h-[220px] min-w-[180px] flex-none snap-start overflow-hidden bg-black sm:h-[260px] sm:min-w-[210px] lg:h-[280px] lg:min-w-[225px]"
          >
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt={`${post.platform} performance highlight`}
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <iframe
                src={post.embedUrl}
                title={`${post.platform} post`}
                className="h-full w-full border-0"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

MusicianSocialPosts.propTypes = {
  posts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      platform: PropTypes.string.isRequired,
      embedUrl: PropTypes.string.isRequired,
      imageUrl: PropTypes.string,
      linkUrl: PropTypes.string,
      aspectClass: PropTypes.string,
    }),
  ).isRequired,
};

export default MusicianSocialPosts;
