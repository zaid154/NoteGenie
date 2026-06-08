// Yeh file chhote popup messages ("toast") dikhati hai —
// jaise "Saved!" ya "Something went wrong". Screen ke neeche-right me aate hain.
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

// Har toast ko ek unique id deni hai. Yeh number badhta rahega.
let toastId = 0;

export function ToastProvider({ children }) {
  // toasts = abhi screen pe dikhne wale messages ki list.
  const [toasts, setToasts] = useState([]);

  // dismiss: ek toast ko id ke through list se hata do.
  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // toast: naya message dikhao. type "success" | "error" | "info" ho sakta hai.
  const toast = useCallback((message, type = "info") => {
    const id = ++toastId;
    // Purani list me naya toast add karo.
    setToasts((t) => [...t, { id, message, type }]);
    // 4 second baad apne aap hata do.
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Saare toasts yahan dikhte hain (fixed = screen pe chipke rehte hain). */}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            // type ke hisaab se color: green (success), red (error), normal (info).
            className={`animate-fade-up rounded-xl border px-4 py-3 text-sm shadow-lift ${
              t.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : t.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
                : "border-line bg-surface text-ink"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// useToast: kahin bhi "const { toast } = useToast()" likho, fir toast("Saved!", "success").
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
