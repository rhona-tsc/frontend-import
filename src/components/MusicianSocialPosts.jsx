import PropTypes from "prop-types";

const MusicianSocialPosts = ({ posts }) => {
  if (!posts.length) return null;

  return (
    <section className="mt-6" aria-label="Social posts">
      <h4 className="font-semibold text-gray-900 mb-3">Social highlights</h4>
      <div className="grid grid-cols-1 gap-4">
        {posts.map((post) => (
          <div
            key={post.key}
            className={`w-full ${post.aspectClass} overflow-hidden rounded-lg bg-black shadow-sm`}
          >
            {post.imageUrl ? (
              <a
                href={post.linkUrl || post.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block h-full w-full"
                aria-label={`View ${post.platform} post`}
              >
                <img
                  src={post.imageUrl}
                  alt={`${post.platform} post cover`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-sm font-semibold text-white transition group-hover:bg-black/85">
                  View on {post.platform}
                </span>
              </a>
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
      aspectClass: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default MusicianSocialPosts;
