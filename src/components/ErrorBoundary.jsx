import React from "react";
import { isChunkLoadError, recoverBrowserChunk } from '../utils/chunkRecovery.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (recoverBrowserChunk(error)) return;
    // ✅ send to your logging endpoint if you have one
    // fetch(`${import.meta.env.VITE_BACKEND_URL}/api/log-client-error`, {...})
    console.error("🚨 UI crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkFail = isChunkLoadError(this.state.error);
    const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') || '/' : '/';

    if (isChunkFail && this.props.initialPublicHtml && path === this.props.initialPath) {
      return (
        <div className="max-w-5xl mx-auto p-6">
          <div dangerouslySetInnerHTML={{ __html: this.props.initialPublicHtml }} />
          <p className="mt-6">The interactive features couldn't load. <button className="underline" onClick={() => window.location.reload()}>Refresh to try again</button>.</p>
        </div>
      );
    }

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
