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
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "white", minWidth: 16, textAlign: "center" }}>
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
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    await logout();
    router.replace("/signin");
  };
  return (
    <div className="px-2 py-1 border-t border-line">
      <div className="flex items-center gap-2 px-1.5 py-0.5">
        {user.role === "platform_admin" ? (
          <>
            <Avatar name="Patriotmedbill" size={26} />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-medium text-xs text-ink truncate">Patriotmedbill</div>
              <div className="text-[10px] text-ink-faint">Super Admin</div>
            </div>
          </>
        ) : (
          <>
            <Avatar name={user.displayName} size={26} />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-medium text-xs text-ink truncate">{user.displayName}</div>
              <div className="text-[10px] text-ink-faint">{SIGNED_IN_ROLE[user.role] || user.role}</div>
            </div>
          </>
        )}
        <button onClick={signOut} disabled={signingOut} className="btn-ghost p-1.5 rounded-md hover:text-danger" title="Sign out" aria-label="Sign out">
          <Icon name="LogOut" size={15} />
        </button>
      </div>
    </div>
  );
}
