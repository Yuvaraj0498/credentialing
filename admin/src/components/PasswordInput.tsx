"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";

/** Password field with an eye button inside the box to show / hide what was typed. */
export function PasswordInput({ className = "input", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={className} style={{ paddingRight: 38, ...props.style }} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-faint hover:text-ink"
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        <Icon name={shown ? "EyeOff" : "Eye"} size={15} />
      </button>
    </div>
  );
}
