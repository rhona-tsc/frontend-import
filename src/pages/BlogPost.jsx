import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "../data/BlogPosts.js";

export default function BlogPost() {
  const { slug } = useParams();

  const post = useMemo(
    () => blogPosts.find((item) => item.slug === slug),
    [slug]
  );

  if (!post) {
    return (
      <div className="px-4 py-16 max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">Post not found</h1>
        <Link to="/blog" className="underline">
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <article className="px-4 py-12 max-w-4xl mx-auto">
      <Helmet>
        <title>{post.metaTitle || post.title}</title>
        <meta property="og:type" content="article" />
<meta name="twitter:card" content={post.heroImage ? "summary_large_image" : "summary"} />
        <meta
          name="description"
          content={post.metaDescription || post.excerpt}
        />

        {/* ✅ Canonical + OG should use the preferred non-www host */}
        <link
          rel="canonical"
          href={`https://thesupremecollective.co.uk/blog/${post.slug}`}
        />
        <meta
          property="og:url"
          content={`https://thesupremecollective.co.uk/blog/${post.slug}`}
        />

        {/* Optional but helpful for sharing */}
        <meta property="og:title" content={post.metaTitle || post.title} />
        <meta
          property="og:description"
          content={post.metaDescription || post.excerpt}
        />
        {post.heroImage ? (
          <meta property="og:image" content={post.heroImage} />
        ) : null}
      </Helmet>

      <div className="mb-8">
        <Link to="/blog" className="text-sm underline">
          Back to blog
        </Link>
      </div>

      <header className="mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-3">
          {post.category}
        </p>

        <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">
          {post.title}
        </h1>

        <p className="text-gray-500">
          {post.author} · {post.publishedAt} · {post.readTime}
        </p>
      </header>

      {post.heroImage && (
        <img
          src={post.heroImage}
          alt={post.title}
          className="w-full rounded-3xl object-cover mb-10 max-h-[520px]"
        />
      )}

      <div className="prose prose-lg max-w-none">
    {post.content.map((block, index) => {
  if (block.type === "heading") {
    return (
      <h2
        key={index}
        className="mt-10 mb-4 text-2xl md:text-3xl font-semibold"
      >
        {block.text}
      </h2>
    );
  }

  if (block.type === "image") {
    return (
      <img
        key={index}
        src={block.src}
        alt={block.alt || "Blog image"}
        className="w-full rounded-3xl object-cover my-8"
      />
    );
  }

  return (
    <p key={index} className="mb-5 leading-8 text-gray-700">
      {block.text}
    </p>
  );
})}
      </div>

      <div className="mt-12 rounded-3xl border border-gray-200 p-8 bg-gray-50">
        <h3 className="text-2xl font-semibold mb-3">
          Looking for live music for your event?
        </h3>
        <p className="text-gray-600 mb-5">
          Explore our wedding bands, party bands and live entertainment options
          for unforgettable celebrations.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center rounded-full bg-[#ff6667] px-5 py-3 text-white hover:opacity-90"
        >
          Enquire now
        </Link>
      </div>
    </article>
  );
}