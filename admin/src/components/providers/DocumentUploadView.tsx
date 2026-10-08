"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AsyncBoundary } from "@/components/AsyncState";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/Modal";
import { DeferredNotice } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { useShell } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { fileExt, MAX_FILE_BYTES } from "./shared";

/** Like the prototype: documents are PDF or images. */
const UPLOAD_EXT = ["pdf", "jpg", "jpeg", "png"];
import { VerifyClassificationModal, type ClassifiedItem } from "@/components/modals/VerifyClassificationModal";
import type { ClassifyResult, DocumentRow, ProviderDetail, UploadResult } from "@/types/providers";

/**
 * Prototype DocumentUploadView (L2236).
 * Staff: /providers/{id}/upload. Provider portal: /my-documents/upload (portal=true, own provider id).
 */
export function DocumentUploadView({ providerId, portal = false }: { providerId: number; portal?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { can, user } = useAuth();
  const { publish } = useShell();
  const { data: provider, loading, error, reload, setData } = useAsync(() => api.get<ProviderDetail>(portal ? "/me/provider" : "/providers/" + providerId), [providerId, portal]);

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classified, setClassified] = useState<ClassifiedItem[]>([]);
  const [showVerify, setShowVerify] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<DocumentRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backHref = portal ? "/my-documents" : "/providers/" + providerId;
  const staff = user?.role !== "provider";

  const handleFilesSelected = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    Array.from(list).forEach((f) => {
      if (!UPLOAD_EXT.includes(fileExt(f.name))) rejected.push(f.name + " (only PDF, JPG or PNG)");
      else if (f.size > MAX_FILE_BYTES) rejected.push(f.name + " (over 25 MB)");
      else if (f.size === 0) rejected.push(f.name + " (empty file)");
      else accepted.push(f);
    });
    setFileError(rejected.length ? "Skipped: " + rejected.join(", ") : null);
    setFiles((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const docTypes = provider?.documents || [];

  const handleClassify = async () => {
    if (!provider) return;
    if (mode === "manual") {
      setClassified(files.map((f) => ({ file: f, docType: "", detected: false, expiresAt: "", confirmed: false })));
      setShowVerify(true);
      return;
    }
    setClassifying(true);
    try {
      const res = await api.post<ClassifyResult[]>("/providers/" + provider.id + "/documents/classify", { fileNames: files.map((f) => f.name) });
      setClassified(
        files.map((f, i) => {
          const r = res[i];
          return { file: f, docType: r?.docType || "", detected: !!r?.docType, expiresAt: "", confirmed: false };
        })
      );
      setShowVerify(true);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setClassifying(false);
    }
  };

  /** Uploads the edited items from the verify modal (fixes the prototype bug that submitted the unedited list). */
  const handleSubmit = async (items: ClassifiedItem[]) => {
    if (!provider) return;
    const form = new FormData();
    items.forEach((it) => {
      form.append("files", it.file, it.file.name);
      form.append("docType", it.docType);
      form.append("expiresAt", it.expiresAt || "");
      form.append("status", it.status || "");
    });
    setUploading(true);
    try {
      const res = await api.upload<UploadResult>("/providers/" + provider.id + "/documents/upload", form);
      toast(res.uploaded.length + " document(s) uploaded");
      setShowVerify(false);
      setFiles([]);
      setClassified([]);
      setData({ ...provider, documents: res.documents });
      publish("providers");
      publish("notifications");
      router.push(backHref);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api.delete("/documents/" + removing.id + "/file");
      toast("File removed");
      setRemoving(null);
      reload();
      publish("providers");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <AsyncBoundary loading={loading && !provider} error={error} onRetry={reload}>
      {provider && (
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-ink-light mb-4">
            {portal ? (
              <Link href="/my-documents" className="hover:text-ink">My Documents</Link>
            ) : (
              <>
                <Link href="/providers" className="hover:text-ink">Providers</Link>
                <Icon name="ChevronRight" size={12} className="text-ink-faint" />
                <Link href={backHref} className="hover:text-ink">
                  {provider.firstName} {provider.lastName}
                </Link>
              </>
            )}
            <Icon name="ChevronRight" size={12} className="text-ink-faint" />
            <span className="text-ink font-medium">Document Upload</span>
          </div>

          {/* Provider header card */}
          <div className="card card-pad mb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Avatar name={provider.firstName + " " + provider.lastName} size={48} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-ink">
                      {provider.firstName} {provider.lastName}
                    </h2>
                    <Pill type={provider.status === "active" ? "success" : "warn"}>{provider.status === "active" ? "Active" : "Pending"}</Pill>
                  </div>
                  <p className="text-sm text-ink-light">{provider.specialty}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-light flex-wrap">
                    <span>NPI {provider.npi || "—"}</span>
                    {provider.email && <span>· {provider.email}</span>}
                    {provider.phone && <span>· {provider.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl font-bold text-accent">
                  {provider.documentProgress.approved}
                  <span className="text-ink-faint text-lg">/{provider.documentProgress.required}</span>
                </div>
                <div className="text-xs text-ink-light">requirements met</div>
              </div>
            </div>
          </div>

          {/* AI / Manual tabs */}
          <div className="tabs mb-4" style={{ maxWidth: 400, margin: "0 auto 16px" }}>
            <div className={"tab " + (mode === "ai" ? "active" : "")} onClick={() => setMode("ai")}>
              <Icon name="Sparkles" size={13} className="inline mr-1" /> AI-Powered Upload
            </div>
            <div className={"tab " + (mode === "manual" ? "active" : "")} onClick={() => setMode("manual")}>
              <Icon name="FileText" size={13} className="inline mr-1" /> Manual Upload
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Requirements list */}
            <div className="card">
              <div className="p-3 border-b border-line">
                <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider flex items-center justify-between">
                  <span>Requirements</span>
                  <span className="text-ink-light font-mono">
                    {provider.documentProgress.approved}/{provider.documentProgress.required}
                  </span>
                </div>
              </div>
              <div className="p-2">
                {docTypes.map((doc) => {
                  const isApproved = doc.status === "approved";
                  const isNa = doc.status === "na";
                  const isPending = doc.status === "pending_review";
                  const isExpired = doc.status === "expired";
                  return (
                    <div key={doc.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs">
                      <Icon
                        name={isApproved ? "CheckCircle2" : isNa ? "MinusCircle" : isPending ? "Clock" : isExpired ? "AlertCircle" : "Circle"}
                        size={12}
                        style={{ color: isApproved ? "var(--success)" : isExpired ? "var(--danger)" : isPending ? "var(--warn)" : "var(--ink-faint)" }}
                      />
                      <span className={isApproved ? "text-success font-medium" : isNa ? "text-ink-faint italic" : "text-ink-light"} style={isApproved ? { color: "var(--success)" } : undefined}>
                        {doc.label}
                      </span>
                      {isNa && <span className="ml-auto text-[10px] text-ink-faint">N/A</span>}
                      {isPending && <span className="ml-auto text-[10px] text-ink-faint">Review</span>}
                      {isExpired && <span className="ml-auto text-[10px]" style={{ color: "var(--danger)" }}>Expired</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upload area */}
            <div className="lg:col-span-3 card">
              <div className="p-4 border-b border-line flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon name={mode === "ai" ? "Sparkles" : "FileText"} size={14} style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold text-ink">{mode === "ai" ? "AI-Powered Classification" : "Manual Classification"}</span>
                  <span className="text-xs text-ink-light">· {mode === "ai" ? "Drop files to auto-classify" : "Choose the document type for each file"}</span>
                </div>
                {files.length > 0 && !classifying && !showVerify && (
                  <button onClick={handleClassify} className="btn btn-primary">
                    <Icon name={mode === "ai" ? "Sparkles" : "ListChecks"} size={13} /> {mode === "ai" ? "Classify & Upload" : "Review & Upload"} ({files.length})
                  </button>
                )}
              </div>

              <div className="p-6">
                {mode === "ai" && (
                  <DeferredNotice className="mb-4">
                    AI document reading arrives in a later phase. For now document types are auto-detected from the file name — you can review and correct each one before uploading.
                  </DeferredNotice>
                )}
                {files.length === 0 ? (
                  <div
                    className="dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("dragging");
                    }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("dragging")}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("dragging");
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                  >
                    <Icon name="UploadCloud" size={36} className="text-ink-faint" />
                    <div className="font-display font-semibold text-ink mt-3">Drop documents here</div>
                    <p className="text-sm text-ink-light mt-1">Or click to select files. {mode === "ai" ? "We'll classify them automatically." : "You'll choose each document's type next."}</p>
                    <p className="text-xs text-ink-faint mt-3">Supports PDF, JPG, PNG · Up to 25MB per file</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-ink-light mb-3">
                      {files.length} file{files.length > 1 ? "s" : ""} selected
                    </div>
                    <div className="space-y-2">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-soft rounded">
                          <Icon name="FileText" size={14} className="text-ink-light" />
                          <div className="flex-1 text-sm text-ink truncate">{f.name}</div>
                          <span className="text-xs text-ink-light">{Math.round(f.size / 1024)} KB</span>
                          <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} className="btn-ghost p-1" aria-label={"Remove " + f.name} disabled={classifying}>
                            <Icon name="X" size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary mt-3" style={{ width: "100%" }} disabled={classifying}>
                      <Icon name="Plus" size={13} /> Add more files
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept={UPLOAD_EXT.map((e) => "." + e).join(",")}
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                {fileError && <div className="field-error mt-2">{fileError}</div>}

                {classifying && (
                  <div className="mt-4 px-4 py-3 rounded-lg" style={{ background: "var(--accent-soft)" }}>
                    <div className="flex items-center gap-2">
                      <div className="loader"></div>
                      <span className="text-sm text-ink font-medium">Detecting document types...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents on file */}
            <div className="card">
              <div className="p-3 border-b border-line">
                <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider">Documents on File</div>
              </div>
              <div className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 500 }}>
                {docTypes.filter((d) => d.hasFile).length === 0 ? (
                  <div className="text-xs text-ink-faint italic p-2">No files uploaded yet.</div>
                ) : (
                  docTypes
                    .filter((d) => d.hasFile)
                    .map((d) => (
                      <div key={d.id} className="p-2 rounded hover:bg-soft text-xs">
                        <div className="flex items-start gap-2">
                          <Icon name="FileText" size={12} className="text-accent flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-accent font-medium truncate" title={d.fileName || ""}>{d.fileName}</div>
                            <div className="text-ink-faint text-[10px]">{d.label}</div>
                          </div>
                          {staff && can("delete", "document") && (
                            <button className="btn-ghost p-0.5" onClick={() => setRemoving(d)} aria-label={"Remove " + d.fileName}>
                              <Icon name="Trash2" size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Verify Modal */}
          {showVerify && classified.length > 0 && (
            <VerifyClassificationModal
              classified={classified}
              docTypes={docTypes}
              staffUpload={staff}
              busy={uploading}
              onClose={() => {
                if (uploading) return;
                setShowVerify(false);
                setClassified([]);
              }}
              onComplete={handleSubmit}
            />
          )}
          {removing && (
            <ConfirmDialog
              title="Remove file?"
              message={
                <>
                  The file <strong>{removing.fileName}</strong> will be deleted and {removing.label} becomes <strong>Missing</strong>.
                </>
              }
              confirmLabel="Remove File"
              busy={removeBusy}
              onConfirm={removeFile}
              onClose={() => setRemoving(null)}
            />
          )}
        </div>
      )}
    </AsyncBoundary>
  );
}
