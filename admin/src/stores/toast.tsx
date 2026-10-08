"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Toast } from "@/components/Toast";

export type ToastType = "success" | "error" | "warn" | "info";
type ShowToast = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);
  const show = useCallback<ShowToast>((message, type = "success") => setToast({ message, type, key: Date.now() }), []);
  const close = useCallback(() => setToast(null), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={close} />}
    </ToastContext.Provider>
  );
}

/** showToast(message, type) — same API as the prototype's showToast. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
