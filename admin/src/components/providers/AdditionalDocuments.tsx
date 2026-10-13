"use client";

import { useState } from "react";
import { DocStatusBadge } from "@/components/Pill";
import { ErrorState } from "@/components/AsyncState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { BlurLoader } from "@/components/BusyOverlay";
import { ApiError, api, errorMessage } from "@/lib/api";
import { fmtDate, todayISO } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ALLOWED_EXT, fileExt, MAX_FILE_BYTES } from "./shared";
import { isWordFile } from "./ProviderOverview";
import type { AdditionalDocument, DocumentRow } from "@/types/providers";

/** Document types for the Add More Document form (every type in the system, in their usual order). */
export function docTypeOptions(rows: DocumentRow[]) {
  const seen = new Map<string, { docType: string; label: string; sortOrder: number }>();
  for (const r of rows) if (!seen.has(r.docType)) seen.set(r.docType, { docType: r.docType, label: r.label, sortOrder: r.sortOrder ?? 999 });
  return [...seen.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

/**
 * Extra documents of a provider, besides the required list. The provider adds them with Add More Document
 * (My Documents header); staff see them on the provider's page. Shown only once there is at least one.
 * `reloadKey` changes after a document was added, to load the list again.
 */
export function AdditionalDocuments({ providerId, reloadKey = 0 }: { providerId: number; reloadKey?: number }) {
  const state = useAsync(() => api.get<AdditionalDocument[]>("/providers/" + providerId + "/additional-documents"), [providerId, reloadKey]);
  const docs = state.data || [];
  if (!state.error && docs.length === 0) return null;
  return (
    <div className="card mt-4" id="additional-documents">
      <div className="p-5 pb-3 border-b border-line flex items-center gap-2 flex-wrap">
        <Icon name="FilePlus" size={16} style={{ color: "var(--accent)" }} />
        <h3 className="font-display font-semibold text-ink">Additional Documents</h3>
        <span className="text-xs text-ink-faint">{docs.length ? docs.length + (docs.length === 1 ? " document" : " documents") : ""}</span>
      </div>
      {state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Title / File</th>
                <th>Expires</th>
                <th>Added</th>
                <th>Status</th>
                <th className="text-right">File</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.docTypeLabel}</td>
                  <td>
                    <div className="text-sm">{d.title || d.fileName || "—"}</div>
                    {d.title && d.fileName && <div className="text-[10px] text-ink-faint truncate" style={{ maxWidth: 260 }}>{d.fileName}</div>}
                    {d.notes && <div className="text-[11px] text-ink-light mt-0.5" style={{ maxWidth: 320, whiteSpace: "pre-wrap" }}>{d.notes}</div>}
                  </td>
                  <td className="text-ink-light text-xs">{d.expiresAt ? fmtDate(d.expiresAt) : "—"}</td>
                  <td className="text-ink-light text-xs">{fmtDate(d.uploadedAt)}</td>
                  <td>
                    <DocStatusBadge status={d.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <ExtraFileButton doc={d} inline />
                    <ExtraFileButton doc={d} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** View (opens in a new tab; not for Word files, which browsers cannot show) or Download. */
function ExtraFileButton({ doc, inline }: { doc: AdditionalDocument; inline?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (inline && isWordFile(doc.fileName)) return null;
  const path = "/additional-documents/" + doc.id + "/download";
  return (
    <button
      className="btn-ghost p-1"
      title={inline ? "View file in a new tab" : "Download"}
      aria-label={(inline ? "View file " : "Download ") + (doc.fileName || doc.docTypeLabel)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (inline) await api.openInNewTab(path, { inline: true });
          else await api.download(path, { inline: false }, doc.fileName || "document");
        } catch (err) {
          toast(errorMessage(err), "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <span className="loader" style={{ width: 11, height: 11 }} /> : <Icon name={inline ? "ExternalLink" : "Download"} size={13} />}
    </button>
  );
}

export function AddMoreDocumentModal({ providerId, types, onClose, onSaved }: { providerId: number; types: { docType: string; label: string }[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ docType: "", title: "", expiresAt: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const pickFile = (f: File | null) => {
    setErrors((e) => ({ ...e, file: "" }));
    if (!f) return setFile(null);
    if (!ALLOWED_EXT.includes(fileExt(f.name))) {
      setFile(null);
      return setErrors((e) => ({ ...e, file: "This file type is not allowed (" + ALLOWED_EXT.join(", ") + ")" }));
    }
    if (f.size > MAX_FILE_BYTES) {
      setFile(null);
      return setErrors((e) => ({ ...e, file: "The file is larger than 25 MB" }));
    }
    setFile(f);
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.docType) e.docType = "Required";
    if (!file) e.file = "Required";
    if (form.expiresAt && form.expiresAt < todayISO()) e.expiresAt = "Choose today or a later date";
    setErrors(e);
    if (Object.keys(e).length) return;
    const fd = new FormData();
    fd.append("file", file as File);
    fd.append("docType", form.docType);
    if (form.title.trim()) fd.append("title", form.title.trim());
    if (form.expiresAt) fd.append("expiresAt", form.expiresAt);
    if (form.notes.trim()) fd.append("notes", form.notes.trim());
    setBusy(true);
    try {
      await api.upload("/providers/" + providerId + "/additional-documents", fd);
      toast("Document added");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors);
      else toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add More Document" subtitle="Give your credentialing team another document." onClose={busy ? undefined : onClose} maxWidth={560}>
      <BlurLoader show={busy} label="Uploading document, please wait" />
      <div className="space-y-3">
        <Field label="Document Type" required error={errors.docType}>
          <select value={form.docType} onChange={(e) => set("docType", e.target.value)} className="input" aria-label="Document Type">
            <option value="">— Select —</option>
            {types.map((t) => (
              <option key={t.docType} value={t.docType}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="File" required error={errors.file} hint="PDF, image, Word or Excel, up to 25 MB">
          <input type="file" className="input" accept={ALLOWED_EXT.map((x) => "." + x).join(",")} onChange={(e) => pickFile(e.target.files?.[0] || null)} aria-label="File" />
        </Field>
        <Field label="Title" error={errors.title}>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className="input" maxLength={200} placeholder="e.g. Texas Medical License" />
        </Field>
        <Field label="Expiration Date" error={errors.expiresAt}>
          <input type="date" min={todayISO()} value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className="input" />
        </Field>
        <Field label="Notes" error={errors.notes}>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="input" rows={3} maxLength={1000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          <Icon name="Upload" size={13} /> Add Document
        </button>
      </div>
    </Modal>
  );
}
