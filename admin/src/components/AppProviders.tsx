"use client";

import { AuthProvider } from "@/stores/auth";
import { ToastProvider } from "@/stores/toast";
import { BusyOverlay } from "@/components/BusyOverlay";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <BusyOverlay />
      </ToastProvider>
    </AuthProvider>
  );
}
