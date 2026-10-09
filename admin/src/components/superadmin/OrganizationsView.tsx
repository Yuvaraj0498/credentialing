"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { OrgStructurePanel } from "./OrganizationTreeView";
import { OrgPayersPanel } from "./OrgPayersPanel";
import type { AdminSummary } from "./types";

/** "Jake Zebaida — ZmartCredential Billing Solutions" */
export const adminLabel = (a: AdminSummary) => a.name + (a.orgName ? " — " + a.orgName : "");

/** Super admin → Organizations (read-only): choose an org admin; their clients, practices and locations show below. */
export function OrganizationsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const admins = useAsync<AdminSummary[]>(() => api.get<AdminSummary[]>("/platform/admins"), []);
  const list = [...(admins.data || [])].sort((a, b) => a.name.localeCompare(b.name));
  const adminId = params.get("admin") || "";
  const admin = list.find((a) => String(a.userId) === adminId);

  // Clients & Locations | Payers (kept in the address, so a reload stays on the same tab)
  const tab = params.get("tab") === "payers" ? "payers" : "structure";
  const setTab = (t: string) => router.replace(pathname + "?admin=" + adminId + (t === "payers" ? "&tab=payers" : ""), { scroll: false });
  const choose = (id: string) => router.replace(pathname + (id ? "?admin=" + id + (tab === "payers" ? "&tab=payers" : "") : ""), { scroll: false });

  return (
    <div>
      <PageHeader title="Organizations" subtitle="Choose an org admin to see their clients, practices and locations, and the payers they can use." />
      <div className="mb-4">
        <label className="label" htmlFor="sa-admin">Org Admin</label>
        <select id="sa-admin" value={adminId} onChange={(e) => choose(e.target.value)} className="input w-full" style={{ width: "100%" }} disabled={admins.loading}>
          <option value="">{admins.loading ? "Loading admins…" : "— Select an org admin —"}</option>
          {list.map((a) => (
            <option key={a.userId} value={a.userId}>{adminLabel(a)}</option>
          ))}
        </select>
        {admins.error && <div className="field-error">{admins.error}</div>}
      </div>
      {admin ? (
        <>
          <div className="tabs mb-4">
            <div className={"tab " + (tab === "structure" ? "active" : "")} onClick={() => setTab("structure")}>Clients &amp; Locations</div>
            <div className={"tab " + (tab === "payers" ? "active" : "")} onClick={() => setTab("payers")}>Payers</div>
          </div>
          {tab === "structure" ? (
            <OrgStructurePanel key={admin.orgId} orgId={admin.orgId} />
          ) : (
            <OrgPayersPanel key={admin.orgId} orgId={admin.orgId} adminName={admin.name} />
          )}
        </>
      ) : (
        <div className="card card-pad text-center text-sm text-ink-light py-10">Select an org admin above to see their clients, practices and locations.</div>
      )}
    </div>
  );
}
