"use client";

import { useState } from "react";
import { matchesSearch } from "@/lib/search";
import { cleanSearch } from "@/lib/utils";
import { AsyncBoundary } from "@/components/AsyncState";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { OrgSignupFlow } from "@/components/signup/OrgSignupFlow";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { AdminsTable } from "./AdminsTable";
import type { AdminSummary } from "./types";

/**
 * Super admin → Create Admin: follows the organization sign-up workflow (Organization → Admin Account → Plan →
 * Payment). Every admin gets a new organization and access to all of its modules. Any number can be created.
 */
export function CreateAdminView() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  // remount the form after each admin so the next one starts empty
  const [formKey, setFormKey] = useState(0);
  const admins = useAsync<AdminSummary[]>(() => api.get<AdminSummary[]>("/platform/admins"), []);

  if (creating) {
    return (
      <div>
        <PageHeader title="Create Admin" subtitle="Set up a new organization and its admin — the same steps as organization sign-up." />
        <OrgSignupFlow
          key={formKey}
          embedded={{
            onCreated: () => {
              setCreating(false);
              setFormKey((k) => k + 1);
              admins.reload();
            },
            onCancel: () => setCreating(false),
          }}
        />
      </div>
    );
  }

  const list = admins.data || [];
  const shown = list.filter((a) =>
    matchesSearch(search, a.name, a.email, a.phone, a.orgName, a.planName, a.disabled ? "disabled" : a.orgStatus === "suspended" ? "suspended" : "active")
  );
  return (
    <div>
      <PageHeader
        title="Create Admin"
        subtitle={admins.data ? list.length + " admin(s) — each manages their own organization with access to every module" : "Admins you have created"}
        actions={
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Icon name="UserPlus" size={14} /> Create Admin
          </button>
        }
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute" style={{ left: 10, top: 10, color: "var(--ink-faint)" }} />
          <input value={search} onChange={(e) => setSearch(cleanSearch(e.target.value))} placeholder="Search admin, email, organization, plan..." className="input" style={{ paddingLeft: 32 }} aria-label="Search admins" />
        </div>
      </div>
      <div className="card overflow-hidden">
        <AsyncBoundary loading={admins.loading && !admins.data} error={admins.error} onRetry={admins.reload}>
          {list.length === 0 ? (
            <EmptyState icon="UserPlus" title="No admins yet" description="Click “Create Admin” to set up the first organization." />
          ) : (
            <AdminsTable admins={shown} emptyText={"No admins match “" + search.trim() + "”"} />
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
