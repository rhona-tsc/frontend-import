import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "../data/BlogPosts.js";

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog | The Supreme Collective</title>
        <meta
          name="description"
          content="Read wedding entertainment inspiration, live music ideas, and planning tips from The Supreme Collective."
        />
        <link rel="canonical" href="https://thesupremecollective.co.uk/blog" />
        <meta property="og:type" content="website" />
<meta property="og:title" content="Blog | The Supreme Collective" />
<meta
  property="og:description"
  content="Read wedding entertainment inspiration, live music ideas, and planning tips from The Supreme Collective."
/>
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Blog | The Supreme Collective" />
<meta
  name="twitter:description"
  content="Read wedding entertainment inspiration, live music ideas, and planning tips from The Supreme Collective."
/>
      </Helmet>

      <div className="px-4 py-12 max-w-6xl mx-auto">
        <div className="max-w-3xl mb-10">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-3">Blog</p>
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">
            Wedding and event inspiration
          </h1>
          <p className="text-lg text-gray-600">
            Ideas, insights and planning tips for unforgettable live music experiences.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
            >
              {post.heroImage && (
                <Link to={`/blog/${post.slug}`}>
                  <img
                    src={post.heroImage}
                    alt={post.title}
                    className="h-64 w-full object-cover"
                  />
                </Link>
              )}

              <div className="p-6">
                <p className="text-sm text-gray-500 mb-2">
                  {post.category} · {post.readTime}
                </p>

                <h2 className="text-2xl font-semibold mb-3">
                  <Link to={`/blog/${post.slug}`} className="hover:opacity-70">
                    {post.title}
                  </Link>
                </h2>

                <p className="text-gray-600 mb-5">{post.excerpt}</p>

                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-flex items-center rounded-full bg-black px-5 py-3 text-white hover:opacity-90"
                >
                  Read the blog
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}