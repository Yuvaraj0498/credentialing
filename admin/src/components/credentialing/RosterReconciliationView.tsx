"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/Modal";
import { DeferredNotice } from "@/components/AlertBox";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useUser } from "@/stores/auth";
import { useShell } from "@/stores/shell";
import { fmtTs } from "@/lib/utils";
import {
  isWriterRole,
  type PayerLite,
  type RosterEntryInput,
  type RosterMissing,
  type RosterNotOurs,
  type RosterReconciliation,
  type RosterUploadResponse,
  type TerminationRequestResponse,
} from "@/types/credentialing-ops";

// ---------- CSV parsing (client-side, per API contract) ----------

/** Quote-aware CSV line splitter (handles "" escapes and commas inside quotes). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseRosterCsv(text: string): RosterEntryInput[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("File must have a header row and at least one data row");
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const iNpi = idx(["npi"]);
  const iFirst = idx(["first name", "firstname", "first_name"]);
  const iLast = idx(["last name", "lastname", "last_name"]);
  const iSpec = idx(["specialty"]);
  if (iNpi < 0 && (iFirst < 0 || iLast < 0)) throw new Error("Header row must include an NPI column or First Name and Last Name columns");
  const entries: RosterEntryInput[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const get = (i: number) => (i >= 0 ? cols[i] ?? "" : "");
    const digits = get(iNpi).replace(/\D/g, "");
    const entry: RosterEntryInput = {
      npi: digits.length === 10 ? digits : "",
      firstName: get(iFirst),
      lastName: get(iLast),
      specialty: get(iSpec),
    };
    if (entry.npi || entry.firstName || entry.lastName) entries.push(entry);
  }
  if (entries.length === 0) throw new Error("No roster rows found in the file");
  if (entries.length > 20000) throw new Error("Roster is too large (max 20,000 rows)");
  return entries;
}

// ---------- Column row ----------

function PersonRow({ name, npi, href, children }: { name: string; npi: string | null; href?: string; children?: ReactNode }) {
  return (
    <div className="p-3 border-b border-line last:border-0 flex items-center gap-2">
      <Avatar name={name} size={26} />
      <div className="flex-1 min-w-0">
        {href ? (
          <Link href={href} className="block text-sm font-medium truncate hover:underline">{name}</Link>
        ) : (
          <div className="text-sm font-medium truncate">{name}</div>
        )}
        <div className="text-xs text-ink-light font-mono">{npi || "—"}</div>
      </div>
      {children}
    </div>
  );
}

type Pending = { kind: "resubmit"; row: RosterMissing } | { kind: "terminate"; row: RosterNotOurs };

export function RosterReconciliationView() {
  const toast = useToast();
  const user = useUser();
  const { publish } = useShell();
  const canWrite = isWriterRole(user.role);
  const fileRef = useRef<HTMLInputElement>(null);

  const payersQ = useAsync(() => api.get<PayerLite[]>("/payers", { activeOnly: true }), []);
  const payers = (payersQ.data ?? []).filter((p) => p.active);
  const [payerChoice, setPayerChoice] = useState<number | null>(null);
  const selectedPayer = payerChoice ?? payers[0]?.id ?? null;
  const payer = payers.find((p) => p.id === selectedPayer);

  const reconQ = useAsync<RosterReconciliation>(
    selectedPayer ? () => api.get<RosterReconciliation>("/payers/" + selectedPayer + "/roster-reconciliation") : null,
    [selectedPayer]
  );
  const recon = reconQ.data && reconQ.data.payerId === selectedPayer ? reconQ.data : undefined;

  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [acting, setActing] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file || !selectedPayer) return;
    setUploading(true);
    try {
      const entries = parseRosterCsv(await file.text());
      const res = await api.post<RosterUploadResponse>("/payers/" + selectedPayer + "/rosters", { fileName: file.name, entries });
      toast("Payer roster uploaded · " + res.rowCount + " row(s)");
      await reconQ.reload();
    } catch (e) {
      toast("Roster upload failed: " + errorMessage(e), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmAction = async () => {
    if (!pending) return;
    setActing(true);
    try {
      if (pending.kind === "resubmit") {
        await api.post("/enrollments/" + pending.row.enrollmentId + "/resubmit", {});
        toast("Enrollment resubmitted for " + pending.row.providerName);
        publish("enrollments");
      } else {
        await api.post<TerminationRequestResponse>("/roster-entries/" + pending.row.entryId + "/termination-request");
        toast("Termination requested — follow-up task created");
        publish("tasks");
      }
      setPending(null);
      await reconQ.reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setActing(false);
    }
  };

  const inBoth = recon?.matched ?? [];
  const onlyOurs = recon?.missingFromPayer ?? [];
  const onlyPayers = recon?.notOurs ?? [];
  const hasUpload = !!recon?.uploadedAt;

  const uploadButton = (
    <button className="btn btn-primary" disabled={!canWrite || !selectedPayer || uploading} onClick={() => fileRef.current?.click()}>
      {uploading ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Upload" size={14} />} Upload payer roster
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Roster Reconciliation"
        subtitle="Compare your active roster against the payer-reported roster to find discrepancies"
        actions={canWrite ? uploadButton : undefined}
      />
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {payersQ.error ? (
        <ErrorState message={payersQ.error} onRetry={payersQ.reload} />
      ) : payersQ.loading && !payersQ.data ? (
        <div className="card"><Loading /></div>
      ) : payers.length === 0 ? (
        <div className="card"><EmptyState icon="Building2" title="No active payers" description="Activate a payer to reconcile its roster." /></div>
      ) : (
        <>
          <div className="card card-pad mb-4">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div className="flex-1" style={{ minWidth: 220 }}>
                <label className="label">Payer</label>
                <select value={selectedPayer ?? ""} onChange={(e) => setPayerChoice(Number(e.target.value))} className="input" style={{ maxWidth: 320 }}>
                  {payers.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.fullName || p.name}</option>)}
                </select>
              </div>
              {hasUpload && recon && (
                <div className="text-xs text-ink-light text-right">
                  <div className="flex items-center gap-1 justify-end text-ink font-medium"><Icon name="FileSpreadsheet" size={12} /> {recon.fileName || "Payer roster"}</div>
                  <div className="mt-0.5">Uploaded {fmtTs(recon.uploadedAt)} · {recon.rowCount ?? 0} row(s) · {recon.ourApprovedCount} approved on our side</div>
                </div>
              )}
            </div>
          </div>

          {reconQ.error ? (
            <ErrorState message={reconQ.error} onRetry={reconQ.reload} />
          ) : !recon ? (
            <div className="card"><Loading /></div>
          ) : !hasUpload ? (
            <div className="card">
              <EmptyState
                icon="UploadCloud"
                title={"No roster uploaded for " + (payer?.name ?? recon.payerName)}
                description={
                  <>
                    {recon.message || "Upload the payer roster (CSV) to reconcile."}
                    <span className="block mt-1 text-xs text-ink-faint">CSV columns: NPI, First Name, Last Name, Specialty · {recon.ourApprovedCount} approved enrollment(s) on our side</span>
                  </>
                }
                action={canWrite ? <div className="mt-4 inline-flex">{uploadButton}</div> : undefined}
              />
            </div>
          ) : (
            <>
              {recon.integration === "deferred" && recon.message && <DeferredNotice className="mb-4">{recon.message}</DeferredNotice>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <StatCard label="In Sync" value={inBoth.length} sub="On both rosters" icon="CheckCircle2" color="var(--success)" />
                <StatCard label="Missing from Payer" value={onlyOurs.length} sub="We have, payer doesn't" icon="UserMinus" color="var(--warn)" emphasize={onlyOurs.length > 0} />
                <StatCard label="Phantom on Payer" value={onlyPayers.length} sub="Payer has, we don't" icon="UserX" color="var(--danger)" emphasize={onlyPayers.length > 0} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card">
                  <div className="p-3 border-b border-line bg-soft">
                    <div className="flex items-center gap-2">
                      <Icon name="CheckCircle2" size={14} style={{ color: "var(--success)" }} />
                      <h4 className="font-semibold text-sm">In Sync ({inBoth.length})</h4>
                    </div>
                  </div>
                  {inBoth.length === 0 ? <div className="p-4 text-xs text-ink-light text-center">None</div> :
                    inBoth.map((p) => (
                      <PersonRow key={p.entryId + ":" + p.enrollmentId} name={p.providerName} npi={p.npi} href={"/providers/" + p.providerId} />
                    ))
                  }
                </div>

                <div className="card" style={{ borderColor: "var(--warn)", borderWidth: 1 }}>
                  <div className="p-3 border-b border-line" style={{ background: "var(--warn-soft)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="UserMinus" size={14} style={{ color: "#a16207" }} />
                      <h4 className="font-semibold text-sm">Missing from {payer?.name ?? recon.payerName} ({onlyOurs.length})</h4>
                    </div>
                    <div className="text-[10px] text-ink-light mt-1">Action: Re-submit credentialing application</div>
                  </div>
                  {onlyOurs.length === 0 ? <div className="p-4 text-xs text-ink-light text-center">None</div> :
                    onlyOurs.map((p) => (
                      <PersonRow key={p.enrollmentId} name={p.providerName} npi={p.npi} href={"/providers/" + p.providerId}>
                        {canWrite && (
                          <button className="btn btn-primary text-xs" onClick={() => setPending({ kind: "resubmit", row: p })}><Icon name="Send" size={10} /> Resubmit</button>
                        )}
                      </PersonRow>
                    ))
                  }
                </div>

                <div className="card" style={{ borderColor: "var(--danger)", borderWidth: 1 }}>
                  <div className="p-3 border-b border-line" style={{ background: "var(--danger-soft)" }}>
                    <div className="flex items-center gap-2">
                      <Icon name="UserX" size={14} style={{ color: "#991b1b" }} />
                      <h4 className="font-semibold text-sm">On Payer Roster Only ({onlyPayers.length})</h4>
                    </div>
                    <div className="text-[10px] text-ink-light mt-1">Action: Request termination from payer</div>
                  </div>
                  {onlyPayers.length === 0 ? <div className="p-4 text-xs text-ink-light text-center">None</div> :
                    onlyPayers.map((p) => {
                      const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown provider";
                      return (
                        <div key={p.entryId} className="p-3 border-b border-line last:border-0 flex items-center gap-2">
                          <Avatar name={name} size={26} />
                          <div className="flex-1 min-w-0">
                            {p.providerId ? (
                              <Link href={"/providers/" + p.providerId} className="block text-sm font-medium truncate hover:underline">{name}</Link>
                            ) : (
                              <div className="text-sm font-medium truncate">{name}</div>
                            )}
                            <div className="text-xs text-ink-light font-mono">{p.npi || "—"}</div>
                            <div className="text-[10px] text-ink-faint mt-0.5">
                              {p.reason === "not_approved" ? "Our provider · no approved enrollment" : "Not our provider"}
                            </div>
                          </div>
                          {p.actionStatus === "termination_requested" ? (
                            <span className="pill pill-neutral" style={{ whiteSpace: "nowrap" }}><Icon name="Clock" size={10} className="inline mr-1" />Termination requested</span>
                          ) : canWrite ? (
                            <button className="btn btn-danger text-xs" onClick={() => setPending({ kind: "terminate", row: p })}><Icon name="X" size={10} /> Terminate</button>
                          ) : null}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </>
          )}
        </>
      )}

      {pending && (
        <ConfirmDialog
          title={pending.kind === "resubmit" ? "Resubmit enrollment?" : "Request termination?"}
          message={pending.kind === "resubmit"
            ? <>Re-submit the credentialing application for <strong>{pending.row.providerName}</strong> with {payer?.name ?? "this payer"}? The enrollment moves back to In Progress.</>
            : <>Request that {payer?.name ?? "the payer"} remove <strong>{[pending.row.firstName, pending.row.lastName].filter(Boolean).join(" ") || "this provider"}</strong>{pending.row.npi ? " (NPI " + pending.row.npi + ")" : ""} from their roster? A high-priority follow-up task will be created.</>}
          confirmLabel={pending.kind === "resubmit" ? "Resubmit" : "Request termination"}
          danger={pending.kind === "terminate"}
          busy={acting}
          onConfirm={confirmAction}
          onClose={() => !acting && setPending(null)}
        />
      )}
    </div>
  );
}
