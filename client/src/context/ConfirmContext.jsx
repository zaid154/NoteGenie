import { createContext, useCallback, useContext, useRef, useState } from "react";

const ConfirmContext = createContext(null);

// Promise-based confirm dialog so callers can do:
//   const ok = await confirm({ title, message, confirmText, danger });
//   if (!ok) return;
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    setState({
      title: options.title || "Are you sure?",
      message: options.message || "",
      confirmText: options.confirmText || "Confirm",
      cancelText: options.cancelText || "Cancel",
      danger: options.danger ?? false,
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-sm animate-fade-up rounded-2xl border border-line bg-surface p-6 shadow-lift">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  state.danger
                    ? "bg-red-500/10 text-red-600"
                    : "bg-brand-500/10 text-brand-600"
                }`}
                aria-hidden
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-600 text-ink">
                  {state.title}
                </h3>
                {state.message && (
                  <p className="mt-1 text-sm text-muted">{state.message}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button
                autoFocus
                className={state.danger ? "btn-danger" : "btn-primary"}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
