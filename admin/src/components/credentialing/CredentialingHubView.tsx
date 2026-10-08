"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { SanctionsMonitoringView } from "./SanctionsMonitoringView";
import { EnrollmentStatusView } from "./EnrollmentStatusView";
import { RecredentialingScheduleView } from "./RecredentialingScheduleView";
import { DocExpirationAlertsView } from "./DocExpirationAlertsView";
import { PrivilegingView } from "./PrivilegingView";
import { CAQHSyncView } from "@/components/credentialing/caqh/CAQHSyncView";
import { CAQHIntegrationView } from "@/components/credentialing/caqh/CAQHIntegrationView";
import { RosterReconciliationView } from "./RosterReconciliationView";
import { NPILookupModal } from "@/components/modals/NPILookupModal";

export const HUB_TABS = [
  { id: "sanctions", label: "Sanctions", icon: "Shield" },
  { id: "status", label: "Enrollment Status", icon: "Activity" },
  { id: "recred", label: "Recred Schedule", icon: "RefreshCw" },
  { id: "expiration", label: "Expiration Alerts", icon: "Clock" },
  { id: "privileging", label: "Privileging", icon: "Award" },
  { id: "caqh", label: "CAQH Sync", icon: "Database" },
  { id: "caqh_integration", label: "CAQH Integration", icon: "Plug" },
  { id: "roster", label: "Roster Recon", icon: "GitCompare" },
] as const;

export type HubTab = (typeof HUB_TABS)[number]["id"];

export function CredentialingHubView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: HubTab = (HUB_TABS.find((t) => t.id === raw)?.id ?? "sanctions") as HubTab;
  const [showNpi, setShowNpi] = useState(false);

  const setTab = (id: HubTab) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", id);
    q.delete("sub");
    q.delete("eid");
    router.replace(pathname + "?" + q.toString(), { scroll: false });
  };

  return (
    <div>
      <PageHeader
        title="Credentialing Operations"
        subtitle="NPI verification, sanctions monitoring, recredentialing schedule, privileging, and CAQH sync"
        actions={
          <button onClick={() => setShowNpi(true)} className="btn btn-secondary">
            <Icon name="Search" size={14} /> NPI Lookup
          </button>
        }
      />

      <div className="tabs mb-6" style={{ flexWrap: "wrap" }}>
        {HUB_TABS.map((t) => (
          <div key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} className="inline mr-1" /> {t.label}
          </div>
        ))}
      </div>

      {tab === "sanctions" && <SanctionsMonitoringView />}
      {tab === "status" && <EnrollmentStatusView />}
      {tab === "recred" && <RecredentialingScheduleView />}
      {tab === "expiration" && <DocExpirationAlertsView />}
      {tab === "privileging" && <PrivilegingView />}
      {tab === "caqh" && <CAQHSyncView />}
      {tab === "caqh_integration" && <CAQHIntegrationView />}
      {tab === "roster" && <RosterReconciliationView />}

      {showNpi && <NPILookupModal onClose={() => setShowNpi(false)} />}
    </div>
  );
}
