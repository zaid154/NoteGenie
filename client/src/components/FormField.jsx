// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (FormField). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "./icons.jsx";

// Reusable input box. Ek label, ek icon, error message aur (password ke liye)
// show/hide button deta hai. Login/Register forms me use hota hai.
export default function FormField({
  label,        // upar dikhne wala naam, jaise "Email"
  icon: Icon,   // input ke andar left side ka icon
  type = "text",
  error,        // galti ka message (red color me dikhega)
  hint,         // chhoti help line (jab error na ho)
  ...inputProps // baaki saari props (value, onChange, placeholder...) input ko de do
}) {
  // show = password dikhana hai ya chhupana hai.
  const [show, setShow] = useState(false);
  // useId har field ko ek unique id deta hai (label ko input se jodne ke liye).
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const isPassword = type === "password";
  // Password field me agar show true hai to text dikhao, warna dots (password).
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div>
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon width={18} height={18} />
          </span>
        )}
        <input
          id={fieldId}
          type={inputType}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`input ${Icon ? "pl-10" : ""} ${isPassword ? "pr-10" : ""} ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""
          }`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-ink"
            tabIndex={-1}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <IconEyeOff width={18} height={18} /> : <IconEye width={18} height={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// passwordStrength: password kitna strong hai yeh batata hai (register page use karta hai).
// Har achhi cheez par score +1 hota hai, fir us score ka label/color lautate hain.
export function passwordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: "", color: "" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-accent-500" },
    { label: "Good", color: "bg-yellow-500" },
    { label: "Strong", color: "bg-emerald-500" },
    { label: "Very strong", color: "bg-emerald-600" },
  ];
  return { score, ...levels[score] };
}

