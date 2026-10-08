"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

const modalStack: object[] = [];

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
  // Escape closes only the top-most open modal.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const token = {};
    modalStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === token) onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = modalStack.indexOf(token);
      if (i >= 0) modalStack.splice(i, 1);
    };
  }, []);
  return (
    <div className="modal-backdrop slide-up" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
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
        <div className="px-6 pb-6">{children}</div>
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
