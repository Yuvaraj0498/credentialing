"use client";

import { Icon } from "./Icon";

/** A centered success / error message with an OK button (like SweetAlert): "Mail sent", "Failed to send email". */
export function ResultAlert({ type, title, message, onClose }: { type: "success" | "error"; title: string; message?: string; onClose: () => void }) {
  const ok = type === "success";
  return (
    <div className="modal-backdrop slide-up" style={{ zIndex: 1000 }}>
      <div className="modal-card text-center" style={{ maxWidth: 400 }} role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="px-8 pt-8 pb-6">
          <div
            className="mx-auto flex items-center justify-center rounded-full result-alert-icon"
            style={{
              width: 76,
              height: 76,
              border: "4px solid " + (ok ? "#a7f3d0" : "#fecaca"),
              background: ok ? "#ecfdf5" : "#fef2f2",
            }}
          >
            <Icon name={ok ? "Check" : "X"} size={38} style={{ color: ok ? "#10b981" : "#dc2626" }} strokeWidth={3} />
          </div>
          <h2 className="font-display text-2xl font-semibold text-ink mt-5">{title}</h2>
          {message && <p className="text-sm text-ink-light mt-2 break-words">{message}</p>}
          <button className="btn btn-primary mt-6" style={{ minWidth: 110, justifyContent: "center" }} onClick={onClose} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/** The alert for an emailed link: sent → "Mail sent", anything else → "Failed to send email". */
export function mailResult(res: { emailStatus: "sent" | "failed" | "queued"; email: string; emailError?: string | null }) {
  if (res.emailStatus === "sent") return { type: "success" as const, title: "Mail sent", message: "The email was sent to " + res.email + "." };
  return {
    type: "error" as const,
    title: "Failed to send email",
    message: res.emailStatus === "queued" ? "Email sending is switched off on this server." : res.emailError || "The mail server didn't accept the message.",
  };
}
