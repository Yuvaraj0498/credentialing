"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { useShell, useTopic } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ProviderEnrollmentsTab } from "@/components/enrollments/ProviderEnrollmentsTab";
import { ProviderBillingWidget } from "@/components/widgets/ProviderBillingWidget";
import { AssignProviderToLocationModal } from "@/components/modals/AssignProviderToLocationModal";
import { AppointmentLetterModal } from "@/components/modals/AppointmentLetterModal";
import { FollowUpWidget, TimeTrackerWidget } from "@/components/widgets/ActivityWidgets";
import { ProviderEditModal } from "@/components/modals/ProviderEditModal";
import { ProviderInfo } from "./ProviderInfo";
import { ProviderOverview } from "./ProviderOverview";
import { SendLinkModal } from "@/components/modals/SendLinkModal";
import { providerStatusLabel, StatusDropdown } from "./shared";
import type { ProviderDetail, ProviderStatus } from "@/types/providers";

type Tab = "overview" | "enrollments" | "activity" | "info";
const TABS: Tab[] = ["overview", "enrollments", "activity", "info"];

/** Prototype ProviderDetailView (L1784). Tabs are deep-linked via ?tab=. */
export function ProviderDetailView({ providerId }: { providerId: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { can } = useAuth();
  const { publish } = useShell();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "overview";

  const { data: provider, loading, error, reload, setData } = useAsync(() => api.get<ProviderDetail>("/providers/" + providerId), [providerId]);
  useTopic("providers", reload);
  useTopic("enrollments", reload);

  const [modal, setModal] = useState<null | "link" | "letter" | "assign" | "edit">(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const setTab = (t: Tab) => router.replace("/providers/" + providerId + (t === "overview" ? "" : "?tab=" + t), { scroll: false });

  const changeStatus = async (status: ProviderStatus) => {
    setStatusBusy(true);
    try {
      const p = await api.patch<ProviderDetail>("/providers/" + providerId + "/status", { status });
      setData(p);
      toast("Status changed to " + providerStatusLabel(status));
      publish("providers");
      publish("notifications");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setStatusBusy(false);
    }
  };

  const canUpdate = can("update", "provider");
  const canUpload = can("create", "document");

  return (
    <AsyncBoundary loading={loading && !provider} error={error} onRetry={reload}>
      {provider && (
        <div>
          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-1 text-xs text-ink-light">
              <Link href="/providers" className="hover:text-ink">Providers</Link>
              <Icon name="ChevronRight" size={12} className="text-ink-faint" />
              <span className="text-ink font-medium">
                {provider.firstName} {provider.lastName}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canUpload && (
                <Link href={"/providers/" + provider.id + "/upload"} className="btn btn-primary">
                  <Icon name="Sparkles" size={14} /> AI Upload Documents
                </Link>
              )}
              {canUpdate && (
                <>
                  <button onClick={() => setModal("link")} className="btn btn-secondary"><Icon name="Send" size={14} /> Send Link</button>
                  <button onClick={() => setModal("letter")} className="btn btn-secondary"><Icon name="FileText" size={14} /> Generate Letter</button>
                  <button onClick={() => setModal("assign")} className="btn btn-secondary"><Icon name="MapPin" size={14} /> Assign Location</button>
                  <button onClick={() => setModal("edit")} className="btn btn-secondary"><Icon name="Pencil" size={14} /> Edit Provider</button>
                </>
              )}
            </div>
          </div>

          {/* Provider header card */}
          <div className="card card-pad mb-6">
            <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
              <Avatar name={provider.firstName + " " + provider.lastName} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-3xl font-bold text-ink">
                    {provider.firstName} {provider.lastName}
                  </h1>
                </div>
                <p className="text-sm text-ink-light">{provider.specialty}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-ink-light">
                  <span className="flex items-center gap-1"><Icon name="IdCard" size={12} /> NPI: {provider.npi || "—"}</span>
                  {provider.email && <span className="flex items-center gap-1"><Icon name="Mail" size={12} /> {provider.email}</span>}
                  {provider.practiceId && <span className="flex items-center gap-1"><Icon name="MapPin" size={12} /> Practice: {provider.practiceName || "—"}</span>}
                  {provider.telemed && <Pill type="info">Telemed</Pill>}
                  {provider.locationId && <span className="flex items-center gap-1"><Icon name="Building" size={12} /> {provider.locationName}</span>}
                </div>
              </div>
              <div className="flex-shrink-0">
                <StatusDropdown status={provider.status} disabled={!canUpdate} busy={statusBusy} onChange={changeStatus} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs mb-6 overflow-x-auto">
            <div className={"tab " + (tab === "overview" ? "active" : "")} onClick={() => setTab("overview")}>Overview</div>
            <div className={"tab " + (tab === "enrollments" ? "active" : "")} onClick={() => setTab("enrollments")}>
              Enrollments {provider.enrollments.total > 0 && <span className="ml-1 text-[10px] opacity-60">({provider.enrollments.total})</span>}
            </div>
            <div className={"tab " + (tab === "activity" ? "active" : "")} onClick={() => setTab("activity")}>Activity &amp; Time</div>
            <div className={"tab " + (tab === "info" ? "active" : "")} onClick={() => setTab("info")}>Provider Information</div>
          </div>

          {tab === "overview" && <ProviderOverview provider={provider} onChanged={reload} />}
          {tab === "enrollments" && <ProviderEnrollmentsTab providerId={provider.id} onUploadDocs={canUpload ? () => router.push("/providers/" + provider.id + "/upload") : undefined} />}
          {tab === "activity" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TimeTrackerWidget providerId={provider.id} providerName={provider.firstName + " " + provider.lastName} />
                <FollowUpWidget providerId={provider.id} providerName={provider.firstName + " " + provider.lastName} />
              </div>
              <ProviderBillingWidget providerId={provider.id} />
            </div>
          )}
          {tab === "info" && <ProviderInfo provider={provider} />}

          {modal === "link" && (
            <SendLinkModal
              provider={provider}
              onClose={() => setModal(null)}
              onSent={(inv) => {
                toast("Link sent to " + inv.email);
                setModal(null);
                publish("notifications");
                publish("providers");
              }}
            />
          )}
          {modal === "letter" && <AppointmentLetterModal provider={provider} onClose={() => setModal(null)} />}
          {modal === "assign" && (
            <AssignProviderToLocationModal
              provider={provider}
              onClose={() => setModal(null)}
              onSaved={(p) => {
                setData(p);
                setModal(null);
                publish("providers");
              }}
            />
          )}
          {modal === "edit" && (
            <ProviderEditModal
              provider={provider}
              onClose={() => setModal(null)}
              onSaved={(p) => {
                setData(p);
                setModal(null);
                toast("Provider updated");
                publish("providers");
              }}
            />
          )}
        </div>
      )}
    </AsyncBoundary>
  );
}
