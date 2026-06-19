import { useRef } from "react";

export default function OtpInput({ length = 6, value, onChange, disabled, id = "otp" }) {
  const refs = useRef([]);

  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function updateAt(index, char) {
    const clean = char.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, i) => (i === index ? clean : d.trim())).join("").slice(0, length);
    onChange(next);
    if (clean && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Verification code digits">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={i === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => updateAt(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="input h-12 w-11 text-center text-lg font-semibold tabular-nums sm:h-14 sm:w-12"
          aria-label={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
