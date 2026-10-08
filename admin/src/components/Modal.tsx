"use client";

import { type ReactNode } from "react";
import { Icon } from "./Icon";


export function Modal({
  children,
  onClose,
  title,
  subtitle,
  maxWidth = 600,
  showBack,
  onBack,
}: {
  children: ReactNode;
  onClose?: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  maxWidth?: number;
  showBack?: boolean;
  onBack?: () => void;
}) {
  // A popup closes only with its ✕ button or Cancel — clicking outside it or pressing Escape does nothing,
  // so a half-filled form is never lost by accident.
  return (
    <div className="modal-backdrop slide-up">
      <div className="modal-card" style={{ maxWidth }} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-head flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div className="flex items-start gap-3">
              {showBack && (
                <button onClick={onBack} className="btn-ghost p-1 -ml-1 mt-1" aria-label="Back">
                  <Icon name="ChevronLeft" size={18} />
                </button>
              )}
              <div>
                {title && <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>}
                {subtitle && <p className="text-sm text-ink-light mt-1">{subtitle}</p>}
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="btn-ghost p-1 -mr-1" aria-label="Close">
                <Icon name="X" size={20} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  danger = true,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} maxWidth={440}>
      <div className="text-sm text-ink-light mb-5">{message}</div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={"btn " + (danger ? "btn-primary" : "btn-primary")} style={danger ? { background: "var(--danger)", borderColor: "var(--danger)" } : {}} onClick={onConfirm} disabled={busy}>
          {busy && <span className="loader" style={{ borderTopColor: "white" }} />} {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
