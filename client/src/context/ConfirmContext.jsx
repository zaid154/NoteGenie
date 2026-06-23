// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Reusable confirm dialog provider. Pages/components call useConfirm(), dialog state lives here, and the user choice resolves back to the caller.

// Yeh file ek "Are you sure?" wala popup banati hai (delete karne se pehle, etc.).
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
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

  useEffect(() => {
    if (!state) return;
    function onKey(e) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={state.message ? "confirm-message" : undefined}
          >
            <motion.div
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => close(false)}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lift"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    state.danger
                      ? "bg-red-500/10 text-red-600"
                      : "bg-indigo-500/10 text-indigo-600"
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
                  <h3 id="confirm-title" className="text-base font-semibold text-ink">
                    {state.title}
                  </h3>
                  {state.message && (
                    <p id="confirm-message" className="mt-1 text-sm text-muted">
                      {state.message}
                    </p>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

