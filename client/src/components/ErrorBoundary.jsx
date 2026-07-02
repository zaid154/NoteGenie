// FLOW: Top-level React error boundary. Wraps the whole app in main.jsx. If any render throws,
// React unmounts the broken tree and this shows a friendly recover screen instead of a blank
// white page. Static (no router/context deps) so it still renders even if a provider crashes.

import { Component } from "react";

// Class component because only class lifecycles (getDerivedStateFromError / componentDidCatch)
// can catch render errors — there is no hook equivalent yet.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log for local debugging + any wired error tracker (e.g. Sentry) picks this up.
    console.error("App crashed:", error, info?.componentStack);
  }

  handleReload = () => {
    // Full reload clears the broken in-memory state and re-runs the app fresh.
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6 py-12 text-center">
        <div className="w-full max-w-md">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            An unexpected error crashed this page. Reloading usually fixes it — your data is safe.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={this.handleReload} className="btn-primary">
              Reload page
            </button>
            <a href="/" className="btn-outline">
              Back to home
            </a>
          </div>

          {isDev && (
            <pre className="mt-6 max-h-52 overflow-auto rounded-xl border border-line bg-surface p-4 text-left text-xs text-red-600 dark:text-red-400">
              {String(error?.stack || error?.message || error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
