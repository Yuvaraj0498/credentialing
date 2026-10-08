"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { useAuth, useUser } from "@/stores/auth";
import { MAIN_NAV, PROVIDER_NAV, SUPER_NAV, SYSTEM_NAV, isVisible, type NavItem } from "@/lib/nav";
import { useShell } from "@/stores/shell";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { counters } = useShell();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const badge = item.badge ? counters[item.badge] : 0;
  return (
    <Link href={item.href} className={"nav-item " + (active ? "active" : "")} onClick={onNavigate}>
      <Icon name={item.icon} size={16} /> <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 rounded-full" style={{ background: "var(--accent)", color: "white", minWidth: 14, height: 14, lineHeight: "14px", textAlign: "center" }}>
          {badge}
        </span>
      )}
      {item.dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }}></span>}
    </Link>
  );
}

/** Role shown under the signed-in user's name. */
const SIGNED_IN_ROLE: Record<string, string> = {
  platform_admin: "Super Admin",
  org_admin: "Admin",
  clerk: "Clerk",
  provider: "Provider",
  auditor: "Auditor",
};

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const user = useUser();
  const { openCreateTask } = useShell();
  const canCreateTask = user.role === "platform_admin" || (user.permissions.task || []).includes("create");

  // Super admin: Dashboard, Create Admin and User Roles only.
  if (user.role === "platform_admin") {
    return (
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Logo />
        <nav className="flex-1 py-2">
          {SUPER_NAV.map((n) => (
            <NavLink key={n.href} item={n} onNavigate={onNavigate} />
          ))}
        </nav>
        <SidebarUserCard />
      </aside>
    );
  }

  if (user.role === "provider") {
    return (
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Logo />
        <nav className="flex-1 py-2">
          {PROVIDER_NAV.map((n) => (
            <NavLink key={n.href} item={n} onNavigate={onNavigate} />
          ))}
        </nav>
        <SidebarUserCard />
      </aside>
    );
  }

  return (
    <aside className={"sidebar " + (open ? "open" : "")}>
      <Logo />
      <nav className="flex-1 py-2 overflow-y-auto">
        {MAIN_NAV.filter((n) => isVisible(n, user.role)).map((n) => (
          <NavLink key={n.href} item={n} onNavigate={onNavigate} />
        ))}

        {canCreateTask && (
          <div className="mt-6 mb-2 mx-4">
            <button onClick={() => openCreateTask()} className="btn btn-primary w-full" style={{ padding: "8px 12px", fontSize: 12 }}>
              <Icon name="Plus" size={12} /> Create Task
            </button>
          </div>
        )}

        <div className="nav-section-label">System</div>
        {SYSTEM_NAV.filter((n) => isVisible(n, user.role)).map((n) => (
          <NavLink key={n.href} item={n} onNavigate={onNavigate} />
        ))}

      </nav>
      <SidebarUserCard />
    </aside>
  );
}

function SidebarUserCard() {
  const user = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await logout();
    router.replace("/signin");
  };
  return (
    <div className="p-3 border-t border-line relative">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-soft transition-colors">
        <Avatar name={user.displayName} size={32} />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs text-ink-light truncate">{user.orgName || "ZmartCredential"}</div>
          <div className="font-medium text-sm text-ink truncate">{user.displayName}</div>
          <div className="text-[10px] text-ink-faint capitalize">{SIGNED_IN_ROLE[user.role] || user.role}</div>
        </div>
        <Icon name="ChevronUp" size={14} className="text-ink-faint" />
      </button>
      {open && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-paper border border-line rounded-lg shadow-lg p-1 slide-up">
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-soft rounded">
            <Icon name="LogOut" size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
