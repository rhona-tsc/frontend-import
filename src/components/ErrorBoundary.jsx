import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // ✅ send to your logging endpoint if you have one
    // fetch(`${import.meta.env.VITE_BACKEND_URL}/api/log-client-error`, {...})
    console.error("🚨 UI crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = String(this.state.error?.message || "");
    const isChunkFail =
      /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(msg);

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full border rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Uh oh — something went wrong</h1>

          <p className="mt-2 text-gray-600">
            {isChunkFail
              ? "It looks like a new version of the site has just been deployed. A refresh usually fixes this."
              : "Please try refreshing the page or heading back to the homepage."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded bg-black text-white hover:bg-[#ff6667] transition"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>

            <button
              className="px-4 py-2 rounded border hover:bg-gray-50 transition"
              onClick={() => (window.location.href = "/")}
            >
              Go to homepage
            </button>
          </div>

          <p className="mt-5 text-xs text-gray-400">
            If this keeps happening, please contact hello@thesupremecollective.co.uk
          </p>
        </div>
      </div>
    );
  }
}