"use client";

import { useState } from "react";
import { DeferredNotice } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/AsyncState";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/Pill";
import { api, errorMessage } from "@/lib/api";
import { useUser } from "@/stores/auth";
import { fmtTs } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ManualVerificationForm } from "@/components/credentialing/ManualVerificationForm";
import { isWriter } from "@/components/credentialing/InfoField";
import type { DeferredResponse, Verification, VerificationSource } from "@/types/credentialing";

interface ProviderInfo {
  licenseState?: string | null;
}

/**
 * Exclusion checks for one provider. Automatic OIG / SAM / NPPES / state-board lookups are deferred:
 * "Run All Checks" calls the endpoint and shows its message; staff record results manually.
 */
export function ExclusionCheckModal({ provider, onClose, onRecorded }: { provider: { id: number; name: string; npi: string | null }; onClose: () => void; onRecorded?: () => void }) {
  const me = useUser();
  const toast = useToast();
  const canWrite = isWriter(me.role);
  const [running, setRunning] = useState(false);
  const [deferred, setDeferred] = useState<string | null>(null);

  const verifications = useAsync(() => api.get<Verification[]>(`/providers/${provider.id}/verifications`), [provider.id]);
  const detail = useAsync(() => api.get<ProviderInfo>(`/providers/${provider.id}`).catch(() => ({}) as ProviderInfo), [provider.id]);
  const licenseState = detail.data?.licenseState;

  // Newest first → first match per source is the latest result.
  const latest = (src: VerificationSource) => (verifications.data ?? []).find((v) => v.source === src) || null;

  const runAll = async () => {
    setRunning(true);
    try {
      const res = await api.post<DeferredResponse>(`/providers/${provider.id}/verifications/run`);
      setDeferred(res.message);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setRunning(false);
    }
  };

  const checks: { id: VerificationSource; label: string; icon: string; source: string }[] = [
    { id: "npi", label: "NPI Registry (CMS)", icon: "Shield", source: "npiregistry.cms.hhs.gov" },
    { id: "oig", label: "OIG Exclusion List", icon: "AlertOctagon", source: "oig.hhs.gov/exclusions" },
    { id: "sam", label: "SAM.gov Debarment", icon: "Ban", source: "sam.gov" },
    { id: "state_license", label: (licenseState ? licenseState + " " : "State ") + "Medical Board", icon: "Award", source: "State licensing authority" },
  ];

  return (
    <Modal title="Run Exclusion Checks" subtitle={"Verify " + provider.name + " against federal and state exclusion databases"} onClose={onClose} maxWidth={560}>
      <div className="space-y-3">
        <div className="p-2 rounded text-xs flex items-start gap-2" style={{ background: "var(--info-soft)", color: "#1e40af" }}>
          <Icon name="Info" size={12} className="mt-0.5" />
          <div>Automatic queries of the OIG LEIE database, SAM.gov, NPI Registry and state medical boards will be available in a later phase. Check each source manually and record the result below.</div>
        </div>

        {deferred && <DeferredNotice>{deferred}</DeferredNotice>}

        {verifications.loading ? (
          <Loading />
        ) : verifications.error ? (
          <div className="text-xs text-danger">{verifications.error} <button className="underline" onClick={verifications.reload}>Retry</button></div>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => {
              const r = latest(c.id);
              return (
                <div key={c.id} className="card card-pad flex items-start gap-3">
                  <Icon name={c.icon} size={18} style={{ color: r ? (r.status === "clear" ? "var(--success)" : "var(--warn)") : "var(--ink-faint)", marginTop: 2 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-ink">{c.label}</div>
                      {r && <Pill type={r.status === "clear" ? "success" : "warn"}>{r.status === "clear" ? "Clear" : "Review"}</Pill>}
                    </div>
                    <div className="text-xs text-ink-light mt-0.5">{r ? r.message || (r.status === "clear" ? "No flags" : "Flagged") : c.source}</div>
                    {r && <div className="text-[10px] text-ink-faint mt-0.5">{fmtTs(r.checkedAt)}{r.runByName ? " · by " + r.runByName : ""}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canWrite && (
          <div className="card card-pad bg-soft">
            <div className="text-sm font-semibold text-ink mb-2">Record a manual result</div>
            <ManualVerificationForm
              providerId={provider.id}
              onRecorded={() => {
                verifications.reload();
                onRecorded?.();
              }}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
          <button onClick={runAll} disabled={running} className="btn btn-primary">
            <Icon name={running ? "Loader" : "Play"} size={13} /> {running ? "Running..." : "Run All Checks"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
