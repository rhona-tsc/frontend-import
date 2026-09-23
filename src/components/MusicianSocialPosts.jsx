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
            <iframe
              src={post.embedUrl}
              title={`${post.platform} post`}
              className="h-full w-full border-0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
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
      aspectClass: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default MusicianSocialPosts;
