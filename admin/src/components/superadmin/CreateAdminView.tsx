"use client";

import { useState } from "react";
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
      <div className="card overflow-hidden">
        <AsyncBoundary loading={admins.loading && !admins.data} error={admins.error} onRetry={admins.reload}>
          {list.length === 0 ? (
            <EmptyState icon="UserPlus" title="No admins yet" description="Click “Create Admin” to set up the first organization." />
          ) : (
            <AdminsTable admins={list} />
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
