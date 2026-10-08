"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/AsyncState";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/Sidebar";
import { ShellProvider, useShell } from "@/stores/shell";
import { PROVIDER_ROUTES } from "@/lib/nav";
import { CreateTaskModal } from "@/components/modals/CreateTaskModal";
import { useAuth } from "@/stores/auth";

/** Authenticated shell: guards every /admin page, renders the sidebar and global modals. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [createTask, setCreateTask] = useState<{ providerId?: number } | null>(null);

  const providerBlocked = !!user && user.role === "provider" && !PROVIDER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/signin");
    }
    else if (providerBlocked) router.replace("/my-portal");
  }, [loading, user, providerBlocked, pathname, router]);

  if (loading || !user || providerBlocked) {
    return (
      <div className="bg-soft">
        <Loading label="Loading ZmartCredential" full />
      </div>
    );
  }

  return (
    <ShellProvider onOpenCreateTask={(providerId) => setCreateTask({ providerId })}>
      <div className="flex min-h-screen bg-soft">
        <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="sidebar-scrim" onClick={() => setNavOpen(false)} />}
        <main className="flex-1 overflow-x-hidden min-w-0">
          <div className="mobile-topbar">
            <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Icon name="Menu" size={20} />
            </button>
            <div style={{ transform: "scale(0.8)", transformOrigin: "left center" }}>
              <Logo />
            </div>
          </div>
          <div className="p-8 main-pad">{children}</div>
        </main>
      </div>
      {createTask && <CreateTaskModalBridge providerId={createTask.providerId} onClose={() => setCreateTask(null)} />}
    </ShellProvider>
  );
}

// Lives inside ShellProvider so it can publish the "tasks" topic after creating.
function CreateTaskModalBridge({ providerId, onClose }: { providerId?: number; onClose: () => void }) {
  const { publish } = useShell();
  return (
    <CreateTaskModal
      defaultProviderId={providerId}
      onClose={onClose}
      onCreated={() => {
        publish("tasks");
        publish("notifications");
      }}
    />
  );
}
