// Yeh file ek "Are you sure?" wala popup banati hai (delete karne se pehle, etc.).
// Khaas baat: yeh Promise deta hai, isliye hum aise likh sakte hain:
//   const ok = await confirm({ title, message, confirmText, danger });
//   if (!ok) return;   // user ne Cancel dabaya
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  // state = abhi dikhne wale dialog ki details (null matlab koi dialog nahi).
  const [state, setState] = useState(null);
  // resolverRef = Promise ko baad me "answer" dene ke liye yaad rakhte hain.
  const resolverRef = useRef(null);

  // confirm: dialog kholo aur ek Promise lautao jo user ke jawab ka wait karega.
  const confirm = useCallback((options = {}) => {
    // Agar koi pichla dialog abhi tak resolve nahi hua, use false de kar band karo.
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
    // Promise tab tak "ruka" rahega jab tak close() call nahi hota.
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // close: dialog band karo aur Promise ko jawab do (true = confirm, false = cancel).
  const close = useCallback((result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  // Escape se cancel.
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
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={state.message ? "confirm-message" : undefined}
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
                <h3 id="confirm-title" className="font-display text-base font-600 text-ink">
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
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// useConfirm: kahin bhi "const confirm = useConfirm()" likho, fir await confirm({...}).
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
