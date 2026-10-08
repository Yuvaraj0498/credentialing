"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DeferredNotice } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { CAQHConnectionSetup } from "./CAQHConnectionSetup";
import { CAQHCsvImport } from "./CAQHCsvImport";
import { CAQHBulkImport } from "./CAQHBulkImport";
import { CAQHAutoSync } from "./CAQHAutoSync";
import { CAQHAttestationReminders } from "./CAQHAttestationReminders";
import { CAQHDeveloperDocs } from "./CAQHDeveloperDocs";

const SUB_TABS = [
  { id: "setup", label: "Connection Setup", icon: "Settings" },
  { id: "csv_import", label: "CSV Import", icon: "Upload" },
  { id: "bulk_import", label: "Bulk Import", icon: "FileSpreadsheet" },
  { id: "auto_sync", label: "Auto-Sync", icon: "RefreshCw" },
  { id: "attestation", label: "Attestation Reminders", icon: "BellRing" },
  { id: "api_test", label: "Live API Client", icon: "Zap" },
  { id: "docs", label: "Developer Docs", icon: "BookOpen" },
] as const;

export type CaqhSubTab = (typeof SUB_TABS)[number]["id"];

export function CAQHIntegrationView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("sub");
  const tab: CaqhSubTab = SUB_TABS.find((t) => t.id === raw)?.id ?? "setup";

  const setTab = (id: CaqhSubTab) => {
    const q = new URLSearchParams(params.toString());
    q.set("sub", id);
    router.replace(pathname + "?" + q.toString(), { scroll: false });
  };

  return (
    <div>
      <PageHeader
        title="CAQH Integration"
        subtitle="Connect to CAQH ProView for automated provider data import. Three integration paths available."
      />

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}>
        <div className="flex items-start gap-3">
          <Icon name="Info" size={18} className="text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink">
            <strong>CAQH ProView is not a public API.</strong> To pull provider data programmatically you need either: (1) Participating Organization status with CAQH directly (4–8 week onboarding, business case required), (2) an aggregator like CertifyOS/Andros/Verifiable that resells CAQH access, or (3) manual CSV exports from providers. The CSV path works today; the API paths require credentials you obtain externally.
          </div>
        </div>
      </div>

      <div className="tabs mb-6" style={{ flexWrap: "wrap" }}>
        {SUB_TABS.map((t) => (
          <div key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={13} className="inline mr-1" /> {t.label}
          </div>
        ))}
      </div>

      {tab === "setup" && <CAQHConnectionSetup onGoToCsv={() => setTab("csv_import")} />}
      {tab === "csv_import" && <CAQHCsvImport />}
      {tab === "bulk_import" && <CAQHBulkImport />}
      {tab === "auto_sync" && <CAQHAutoSync />}
      {tab === "attestation" && <CAQHAttestationReminders />}
      {tab === "api_test" && (
        <div className="card card-pad">
          <DeferredNotice>Live CAQH / aggregator API connections will be available in a later phase.</DeferredNotice>
        </div>
      )}
      {tab === "docs" && <CAQHDeveloperDocs />}
    </div>
  );
}
