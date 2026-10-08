"use client";

import { AuthProvider } from "@/stores/auth";
import { ToastProvider } from "@/stores/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
