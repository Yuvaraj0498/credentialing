"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { ProviderCredentialingReport } from "./ProviderCredentialingReport";
import { PayerEnrollmentReport } from "./PayerEnrollmentReport";

type ReportTab = "provider" | "payer" | "staff" | "analytics";
const TABS: ReportTab[] = ["provider", "payer", "staff", "analytics"];

export function ReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab") as ReportTab | null;
  const tab: ReportTab = raw && TABS.includes(raw) ? raw : "provider";
  const setTab = (t: ReportTab) => router.replace(pathname + (t === "provider" ? "" : "?tab=" + t), { scroll: false });

  return (
    <div>
      <PageHeader title="Reporting Dashboard" subtitle="Comprehensive credentialing analytics and operational reports" />

      <div className="tabs mb-6">
        <div className={"tab " + (tab === "provider" ? "active" : "")} onClick={() => setTab("provider")}>Provider Credentialing</div>
        <div className={"tab " + (tab === "payer" ? "active" : "")} onClick={() => setTab("payer")}>Payer Enrollment</div>
        <div className={"tab " + (tab === "staff" ? "active" : "")} onClick={() => setTab("staff")}>Staff Performance</div>
        <div className={"tab " + (tab === "analytics" ? "active" : "")} onClick={() => setTab("analytics")}>
          <Icon name="BarChart3" size={13} className="inline mr-1" /> Analytics
        </div>
      </div>

      {tab === "provider" && <ProviderCredentialingReport />}
      {tab === "payer" && <PayerEnrollmentReport />}
      {tab === "staff" && <EmptyState icon="Users" title="Staff Performance" description="Track who's processing what — workload distribution and turnaround times by staff member." />}
      {tab === "analytics" && <EmptyState icon="BarChart3" title="Analytics" description="Advanced trend analysis and forecasting reports." />}
    </div>
  );
}
