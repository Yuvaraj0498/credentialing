"use client";

import Link from "next/link";
import { AsyncBoundary } from "@/components/AsyncState";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useUser } from "@/stores/auth";
import { AdminsTable } from "./AdminsTable";
import type { PlatformSummary } from "./types";

/** Super admin dashboard: platform counts and the latest admins created. */
export function SuperAdminDashboard() {
  const user = useUser();
  const q = useAsync<PlatformSummary>(() => api.get<PlatformSummary>("/platform/summary"), []);
  const d = q.data;
  return (
    <div>
      <PageHeader
        title={"Welcome, " + (user.displayName || "Super Admin")}
        subtitle="Create admins for new organizations and manage the user roles they can assign."
        actions={
          <Link href="/create-admin" className="btn btn-primary">
            <Icon name="UserPlus" size={14} /> Create Admin
          </Link>
        }
      />
      <AsyncBoundary loading={q.loading && !d} error={q.error} onRetry={q.reload}>
        {d && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <StatCard label="Admins" value={d.admins} sub="Organization admins" icon="UserCog" color="var(--accent)" />
              <StatCard label="Organizations" value={d.organizations} sub="Accounts" icon="Building2" color="var(--info)" />
              <StatCard label="Staff Users" value={d.users} sub="All organizations" icon="Users" color="var(--ink)" />
              <StatCard label="Providers" value={d.providers} sub="All organizations" icon="Stethoscope" color="var(--success)" />
              <StatCard label="User Roles" value={d.userRoles} sub="Role names" icon="BadgeCheck" color="var(--warn)" />
            </div>
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-line flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-ink">Recently created admins</h3>
                  <p className="text-xs text-ink-light mt-1">The latest organization accounts</p>
                </div>
                <Link href="/create-admin" className="text-xs text-accent hover:underline">
                  View all
                </Link>
              </div>
              {d.recentAdmins.length === 0 ? (
                <EmptyState icon="UserPlus" title="No admins yet" description="Create the first admin to set up an organization." />
              ) : (
                <AdminsTable admins={d.recentAdmins} />
              )}
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
