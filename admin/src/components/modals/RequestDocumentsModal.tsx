"use client";

import { useState } from "react";
import { DocStatusBadge } from "@/components/Pill";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ApiError, api, errorMessage } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import type { InviteResponse, ProviderDetail } from "@/types/providers";

/**
 * Provider page → Request Documents: emails the provider a secure link + PIN that asks only for the chosen
 * missing / expired documents (uploads arrive as Pending Review). The email uses the Document Request template chosen
 * in Custom Templates ("Use this template").
 */
export function RequestDocumentsModal({ provider, onClose, onSent }: { provider: ProviderDetail; onClose: () => void; onSent: (res: InviteResponse) => void }) {
  const open = provider.documents.filter((d) => d.status === "missing" || d.status === "expired");
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(open.map((d) => d.docType)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (docType: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(docType)) n.delete(docType);
      else n.add(docType);
      return n;
    });
  const allOn = chosen.size === open.length && open.length > 0;

  const send = async () => {
    if (chosen.size === 0) {
      setError("Choose at least one document");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<InviteResponse>("/providers/" + provider.id + "/document-requests", {
        docTypes: open.filter((d) => chosen.has(d.docType)).map((d) => d.docType),
      });
      onSent(res);
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors.docTypes ? err.fieldErrors.docTypes : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Request Documents" subtitle={"Email " + provider.firstName + " a secure link to upload the documents that are still needed."} onClose={busy ? undefined : onClose} maxWidth={560}>
      <div className="space-y-4">
        <div className="text-xs text-ink-light flex items-center gap-1.5">
          <Icon name="Mail" size={12} /> Sent to <span className="font-medium text-ink">{provider.email || "—"}</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label" style={{ marginBottom: 0 }}>
              Documents to request ({chosen.size} of {open.length})
            </label>
            {open.length > 1 && (
              <button className="text-xs text-accent hover:underline" onClick={() => setChosen(allOn ? new Set() : new Set(open.map((d) => d.docType)))}>
                {allOn ? "Clear all" : "Select all"}
              </button>
            )}
          </div>
          <div className="rounded-lg border border-line divide-y divide-line max-h-72 overflow-y-auto">
            {open.map((d) => (
              <label key={d.docType} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-soft">
                <input type="checkbox" checked={chosen.has(d.docType)} onChange={() => toggle(d.docType)} aria-label={d.label} />
                <span className="flex-1 text-sm text-ink">
                  {d.label}
                  {d.critical && <span className="text-[10px] text-ink-faint"> · mandatory</span>}
                  {d.status === "expired" && d.expiresAt && <span className="block text-[11px] text-ink-faint">Expired {fmtDate(d.expiresAt)}</span>}
                </span>
                <DocStatusBadge status={d.status} />
              </label>
            ))}
          </div>
        </div>
        <div className="px-3 py-2 rounded-lg text-xs flex items-start gap-2" style={{ background: "var(--info-soft)", color: "#1d4ed8" }}>
          <Icon name="Info" size={13} className="mt-0.5 shrink-0" />
          <span>The provider opens the link, enters the PIN and uploads only these documents. Each upload waits for your review (Pending Review). Earlier links stop working.</span>
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={send} disabled={busy || chosen.size === 0}>
            {busy ? <span className="loader" /> : <Icon name="Send" size={13} />} Send Request
          </button>
        </div>
      </div>
    </Modal>
  );
}
