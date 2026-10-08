"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/Pill";
import { todayISO } from "@/lib/utils";
import type { DocumentRow } from "@/types/providers";

export interface ClassifiedItem {
  file: File;
  /** DocType code; "" = not recognised yet. */
  docType: string;
  /** True when the type was auto-detected from the file name. */
  detected: boolean;
  expiresAt: string;
  confirmed: boolean;
  /** Document status chosen in the popup (staff only); empty = automatic. */
  status?: DocStatusChoice;
}

export type DocStatusChoice = "approved" | "expired" | "pending_review";

/**
 * Prototype VerifyClassificationModal (L2449).
 * Fix: "Submit All" hands the EDITED items back to the parent (the prototype discarded the edits).
 */
export function VerifyClassificationModal({
  classified,
  docTypes,
  staffUpload,
  busy,
  onClose,
  onComplete,
}: {
  classified: ClassifiedItem[];
  docTypes: DocumentRow[];
  staffUpload: boolean;
  busy?: boolean;
  onClose: () => void;
  onComplete: (items: ClassifiedItem[]) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState<ClassifiedItem[]>(classified);
  const [error, setError] = useState<string | null>(null);
  const cur = items[idx];
  const total = items.length;
  const confirmed = items.filter((c) => c.confirmed).length;
  const today = todayISO();
  const isExpired = (c: ClassifiedItem) => !!c.expiresAt && c.expiresAt < today;
  const expired = items.filter(isExpired).length;
  const typeOf = (code: string) => docTypes.find((d) => d.docType === code);
  const curType = typeOf(cur.docType);

  // Real preview for images and PDFs (object URL), mock card otherwise.
  const previewUrl = useMemo(() => (cur.file.type.startsWith("image/") || cur.file.type === "application/pdf" ? URL.createObjectURL(cur.file) : null), [cur.file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const updateCur = (changes: Partial<ClassifiedItem>) => {
    setError(null);
    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, ...changes } : p)));
  };

  const confirm = () => {
    if (!cur.docType) {
      setError("Choose a document type first");
      return;
    }
    updateCur({ confirmed: true });
    if (idx < total - 1) setIdx(idx + 1);
  };

  const submitAll = () => {
    const missingType = items.findIndex((c) => !c.docType);
    if (missingType >= 0) {
      setIdx(missingType);
      setError("Choose a document type for " + items[missingType].file.name);
      return;
    }
    const seen = new Map<string, string>();
    for (const c of items) {
      if (seen.has(c.docType)) {
        setError("Only one file per document type: " + seen.get(c.docType) + " and " + c.file.name + " are both " + (typeOf(c.docType)?.label || c.docType) + ".");
        return;
      }
      seen.set(c.docType, c.file.name);
    }
    if (confirmed < total) {
      const firstUnconfirmed = items.findIndex((c) => !c.confirmed);
      setIdx(firstUnconfirmed);
      setError("Confirm every document before submitting (" + confirmed + "/" + total + " confirmed).");
      return;
    }
    onComplete(items.map((c) => ({ ...c, status: staffUpload ? c.status || autoStatus(c) : undefined })));
  };

  // Automatic status: past expiration = expired; staff uploads approved; provider uploads await review.
  const autoStatus = (c: ClassifiedItem): DocStatusChoice => (isExpired(c) ? "expired" : staffUpload ? "approved" : "pending_review");
  const statusValue: DocStatusChoice = staffUpload ? cur.status || autoStatus(cur) : "pending_review";

  return (
    <Modal title="Verify Document Classification" subtitle="Review and confirm the AI-classified document information" onClose={busy ? undefined : onClose} maxWidth={1100}>
      <div className="flex items-center justify-end gap-2 mb-3">
        <Pill type="success">
          {confirmed}/{total} confirmed
        </Pill>
        {expired > 0 && <Pill type="danger">{expired} expired</Pill>}
        <span className="text-xs text-ink-light">
          {idx + 1} of {total}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="font-semibold text-ink text-sm truncate">{cur.file.name}</div>
            {cur.detected && cur.docType ? (
              <Pill type="success">
                <Icon name="Sparkles" size={10} /> Auto-detected from filename
              </Pill>
            ) : cur.docType ? (
              <Pill type="info">
                <Icon name="Check" size={10} /> Chosen manually
              </Pill>
            ) : (
              <Pill type="danger">
                <Icon name="AlertCircle" size={10} /> Type not recognised
              </Pill>
            )}
          </div>
          <div className="bg-soft border border-line rounded-lg p-8 text-center" style={{ minHeight: 400 }}>
            {previewUrl && cur.file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={cur.file.name} className="mx-auto rounded shadow-sm" style={{ maxHeight: 480, maxWidth: "100%" }} />
            ) : previewUrl ? (
              <iframe src={previewUrl} title={cur.file.name} className="w-full rounded bg-paper" style={{ height: 480, border: 0 }} />
            ) : (
              <div className="bg-paper rounded shadow-sm p-6 inline-block text-left" style={{ minWidth: 280 }}>
                <div className="font-display text-lg font-bold mb-2 text-ink">{curType?.label || "Document"}</div>
                <div className="space-y-1 text-xs text-ink-light">
                  <div>Preview is not available for this file type.</div>
                  <div className="mt-3 font-mono">{cur.file.name}</div>
                  <div className="font-mono">{Math.round(cur.file.size / 1024)} KB</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Classification fields */}
        <div className="space-y-4">
          <div>
            <label className="label">Document Type</label>
            <select value={cur.docType} onChange={(e) => updateCur({ docType: e.target.value, confirmed: false, detected: false })} className={"input " + (!cur.docType && error ? "input-error" : "")} disabled={busy}>
              <option value="">— Select document type —</option>
              {docTypes.map((d) => (
                <option key={d.docType} value={d.docType}>
                  {d.label}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-ink-faint mt-1">{cur.detected ? "Auto-detected from filename — change it if it's wrong." : "Pick the checklist item this file belongs to."}</div>
          </div>
          <div>
            <label className="label">Document Status</label>
            <select value={statusValue} onChange={(e) => updateCur({ status: e.target.value as DocStatusChoice })} className="input" disabled={busy || !staffUpload}>
              <option value="approved">Approved</option>
              <option value="expired">Expired</option>
              <option value="pending_review">Pending Review</option>
            </select>
            <div className="text-[10px] text-ink-faint mt-1">
              {staffUpload ? "Set the status this document is saved with." : "Your organization reviews uploads before approving them."}
            </div>
          </div>

          <div className="text-xs font-semibold text-ink mt-4 pt-3 border-t border-line">Extracted Information</div>
          <div className="text-xs text-ink-light">Review and edit the extracted fields as needed</div>
          {curType && curType.hasFile && (
            <div className="p-2 rounded text-[11px]" style={{ background: "var(--warn-soft)", color: "#a16207" }}>
              <Icon name="AlertTriangle" size={10} className="inline" /> Replaces the current file <strong>{curType.fileName}</strong>.
            </div>
          )}
        </div>
      </div>

      {error && <div className="field-error mt-3">{error}</div>}

      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-line flex-wrap">
        <div className="flex gap-2">
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0 || busy} className="btn btn-secondary">
            <Icon name="ChevronLeft" size={13} /> Previous
          </button>
          <button onClick={() => setIdx(Math.min(total - 1, idx + 1))} disabled={idx === total - 1 || busy} className="btn btn-secondary">
            Next <Icon name="ChevronRight" size={13} />
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={confirm} className="btn btn-secondary" disabled={cur.confirmed || busy}>
            <Icon name="Check" size={13} /> {cur.confirmed ? "Confirmed" : "Confirm"}
          </button>
          <button onClick={submitAll} className="btn btn-primary" disabled={busy}>
            {busy ? <span className="loader" /> : <Icon name="Check" size={13} />} Submit All ({confirmed}/{total})
          </button>
        </div>
      </div>
    </Modal>
  );
}
