"use client";

import { useEffect, useRef, useState } from "react";
import { AlertBox, DeferredNotice } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { Pill } from "@/components/Pill";
import { useShell } from "@/stores/shell";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { fmtDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { ALLOWED_EXT, fileExt, MAX_FILE_BYTES } from "@/components/providers/shared";
import { usePayers } from "@/components/enrollments/shared";
import { isPrivatePayer } from "@/lib/constants";
import type { BatchResultRow, ClassifyResult, DocumentRow, ProviderLite } from "@/types/providers";

interface PickedFile {
  name: string;
  size: number;
  lastModified: number;
  file: File;
  relativePath?: string;
  /** Selected doc type code ("" = uncategorized → skipped by the server). */
  docType: string;
}

type RowResult = { status: "uploaded" | "skipped" | "failed"; reason: string | null; label: string | null };

// Minimal typings for the File System Access API (Chrome/Edge).
interface FsFileHandle { kind: "file"; name: string; getFile: () => Promise<File> }
interface FsDirHandle { kind: "directory"; name: string; entries: () => AsyncIterableIterator<[string, FsFileHandle | FsDirHandle]> }
type DirPickerWindow = Window & { showDirectoryPicker?: (opts?: { mode?: "read" | "readwrite" }) => Promise<FsDirHandle> };

/** Upload requests are split so each stays under the API's 100 MB request limit. */
const MAX_BATCH_BYTES = 90 * 1024 * 1024;

/**
 * Prototype DocumentFolderPicker (v3 L13958) — uploads go to the provider's document checklist via the batch endpoint,
 * recorded for the chosen target payer portal (prototype v3 PRIVATE_PAYERS).
 */
export function DocumentFolderPicker() {
  const toast = useToast();
  const { user, can } = useAuth();
  const { publish } = useShell();
  const isProvider = user?.role === "provider";
  const [selectedFiles, setSelectedFiles] = useState<PickedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<(RowResult | undefined)[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(isProvider && user?.providerId ? String(user.providerId) : "");
  const [directoryName, setDirectoryName] = useState<string | null>(null);
  const [watchMode, setWatchMode] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [supportsFileSystemAPI, setSupports] = useState(false);
  const payersQ = usePayers(true);
  const privatePayers = (payersQ.data || []).filter(isPrivatePayer);
  const [pickedPayer, setSelectedPayer] = useState<string | null>(null);
  // Default to the first private payer (like the prototype); "" = provider file only.
  const selectedPayer = pickedPayer ?? (privatePayers[0] ? String(privatePayers[0].id) : "");
  const payerName = privatePayers.find((p) => String(p.id) === selectedPayer)?.name || null;

  useEffect(() => {
    setSupports(typeof window !== "undefined" && "showDirectoryPicker" in window);
  }, []);

  const providers = useAsync<ProviderLite[]>(isProvider ? null : () => api.get<ProviderLite[]>("/providers/all-lite"), [isProvider]);
  useEffect(() => {
    if (!isProvider && !selectedProvider && providers.data?.length) setSelectedProvider(String(providers.data[0].id));
  }, [providers.data, isProvider, selectedProvider]);

  // Checklist (doc types + labels) of the target provider.
  const docs = useAsync<DocumentRow[]>(selectedProvider ? () => api.get<DocumentRow[]>("/providers/" + selectedProvider + "/documents") : null, [selectedProvider]);
  const docTypes = docs.data || [];
  const labelOf = (code: string) => docTypes.find((d) => d.docType === code)?.label || code;

  const providerName = isProvider ? user?.displayName || "My documents" : providers.data?.find((p) => String(p.id) === selectedProvider)?.name || "provider";

  /** Guesses doc types from the file names (server-side whole-word matching). */
  const detect = async (files: PickedFile[]) => {
    if (!selectedProvider || files.length === 0) return files;
    setDetecting(true);
    try {
      const res = await api.post<ClassifyResult[]>("/providers/" + selectedProvider + "/documents/classify", { fileNames: files.map((f) => f.name) });
      return files.map((f, i) => ({ ...f, docType: res[i]?.docType || "" }));
    } catch (e) {
      toast("Could not detect document types: " + errorMessage(e), "warn");
      return files;
    } finally {
      setDetecting(false);
    }
  };

  const loadFiles = async (files: PickedFile[], label: string) => {
    setUploadResults([]);
    setSelectedFiles(files);
    toast("Loaded " + files.length + " file(s) from " + label);
    setSelectedFiles(await detect(files));
  };

  // Modern API path: File System Access API (Chrome/Edge only). Reads sub-folders too.
  const pickFolderModern = async () => {
    const w = window as DirPickerWindow;
    if (!w.showDirectoryPicker) return;
    try {
      const handle = await w.showDirectoryPicker({ mode: "read" });
      setDirectoryName(handle.name);
      const files: PickedFile[] = [];
      const walk = async (dir: FsDirHandle, prefix: string) => {
        for await (const [name, entry] of dir.entries()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            files.push({ name, size: file.size, lastModified: file.lastModified, file, relativePath: prefix + name, docType: "" });
          } else if (entry.kind === "directory") {
            await walk(entry, prefix + name + "/");
          }
        }
      };
      await walk(handle, handle.name + "/");
      await loadFiles(files, handle.name);
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") toast("Folder picker error: " + err.message, "error");
    }
  };

  // Fallback path: webkitdirectory (all browsers)
  const pickFolderClassic = () => folderInputRef.current?.click();
  const handleClassicFolderPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: PickedFile[] = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
      file: f,
      relativePath: f.webkitRelativePath,
      docType: "",
    }));
    e.target.value = "";
    await loadFiles(files, "folder");
  };

  // Re-detect when the target provider changes after files were picked.
  const redetect = async (providerId: string) => {
    setSelectedProvider(providerId);
    setUploadResults([]);
  };
  useEffect(() => {
    if (selectedFiles.length && selectedProvider) detect(selectedFiles).then(setSelectedFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  const clientSkipReason = (f: PickedFile): string | null => {
    if (!ALLOWED_EXT.includes(fileExt(f.name))) return "File type not allowed";
    if (f.size > MAX_FILE_BYTES) return "File exceeds 25 MB";
    if (f.size === 0) return "Empty file";
    return null;
  };

  const uploadAll = async () => {
    if (!selectedProvider) return toast("Pick a target provider", "warn");
    setUploading(true);
    const results: (RowResult | undefined)[] = selectedFiles.map(() => undefined);
    // Client-side checks first; the rest goes to the server in size-limited batches.
    const pending: number[] = [];
    selectedFiles.forEach((f, i) => {
      const reason = clientSkipReason(f);
      if (reason) results[i] = { status: "skipped", reason, label: null };
      else pending.push(i);
    });
    setUploadResults([...results]);

    const batches: number[][] = [];
    let cur: number[] = [];
    let curBytes = 0;
    pending.forEach((i) => {
      const size = selectedFiles[i].size;
      if (cur.length && curBytes + size > MAX_BATCH_BYTES) {
        batches.push(cur);
        cur = [];
        curBytes = 0;
      }
      cur.push(i);
      curBytes += size;
    });
    if (cur.length) batches.push(cur);

    for (const batch of batches) {
      const form = new FormData();
      batch.forEach((i) => {
        const f = selectedFiles[i];
        form.append("files", f.file, f.name);
        form.append("relativePaths", f.relativePath || f.name);
        form.append("docType", f.docType || "");
      });
      try {
        if (selectedPayer) form.append("payerId", selectedPayer);
        const res = await api.upload<BatchResultRow[]>("/providers/" + selectedProvider + "/documents/batch", form);
        batch.forEach((i, k) => {
          const r = res[k];
          results[i] = r ? { status: r.status, reason: r.reason, label: r.label } : { status: "failed", reason: "No result returned", label: null };
        });
      } catch (e) {
        batch.forEach((i) => (results[i] = { status: "failed", reason: errorMessage(e), label: null }));
      }
      setUploadResults([...results]);
    }
    setUploading(false);
    const successful = results.filter((r) => r?.status === "uploaded").length;
    toast(successful + " of " + results.length + " file(s) uploaded successfully", successful === results.length ? "success" : successful > 0 ? "warn" : "error");
    if (successful > 0) {
      publish("providers");
      publish("notifications");
      docs.reload();
    }
  };

  const canUpload = can("create", "document");

  return (
    <div>
      <PageHeader title="Document Folder Sync" subtitle="Pick a folder from your computer and upload documents to a payer in bulk" />

      <div className="card card-pad mb-4" style={{ background: "var(--info-soft)", borderColor: "var(--info)" }}>
        <div className="flex items-start gap-3">
          <Icon name="Info" size={18} className="text-info flex-shrink-0 mt-0.5" style={{ color: "var(--info)" }} />
          <div className="text-xs text-ink">
            <strong>Two folder-picker modes available:</strong>
            <ul className="mt-1 ml-4 list-disc">
              <li>
                <strong>Modern (Chrome/Edge only):</strong> File System Access API — pick a folder once, browser holds a handle for the session, can be re-read without re-picking.
              </li>
              <li>
                <strong>Universal (all browsers):</strong> webkitdirectory input — user picks folder each time via native dialog.
              </li>
            </ul>
            <div className="mt-2">
              Document types are detected from each file name (e.g. <span className="font-mono">DEA_2026.pdf</span> → DEA Certificate). Files whose type can&apos;t be recognised are skipped — pick a type in the table before uploading.
            </div>
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="card card-pad mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label">Target Provider</label>
            {isProvider ? (
              <select value={selectedProvider} className="input" disabled>
                <option value={selectedProvider}>{user?.displayName}</option>
              </select>
            ) : (
              <select value={selectedProvider} onChange={(e) => redetect(e.target.value)} className="input" disabled={providers.loading || uploading}>
                {providers.loading && <option value="">Loading providers…</option>}
                {!providers.loading && (providers.data || []).length === 0 && <option value="">No providers</option>}
                {(providers.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.npi ? " · " + p.npi : ""}
                  </option>
                ))}
              </select>
            )}
            {providers.error && <div className="field-error">{providers.error}</div>}
            {isProvider && !user?.providerId && <div className="field-error">Your account is not linked to a provider profile yet.</div>}
          </div>
          <div>
            <label className="label">Target Payer Portal</label>
            <select value={selectedPayer} onChange={(e) => setSelectedPayer(e.target.value)} className="input" disabled={payersQ.loading || uploading}>
              {payersQ.loading && <option value="">Loading payers…</option>}
              {privatePayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="">No payer — provider file only</option>
            </select>
            <div className="text-[10px] text-ink-faint mt-1">
              Files are saved to the provider&apos;s document checklist{payerName ? " for the " + payerName + " submission" : ""}. Payer portals have no upload API — attach them in the portal after
              signing in from Payer Submissions.
            </div>
          </div>
        </div>
      </div>

      {/* Folder pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="card card-pad">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Icon name="FolderOpen" size={16} className="text-accent" />
            <h3 className="font-semibold text-sm text-ink">Modern Folder Picker</h3>
            {supportsFileSystemAPI ? <Pill type="success">Supported</Pill> : <Pill type="warn">Not supported in this browser</Pill>}
          </div>
          <p className="text-xs text-ink-light mb-3">Uses File System Access API. Chrome/Edge only. Grants persistent read access to the picked folder for the session.</p>
          <button onClick={pickFolderModern} disabled={!supportsFileSystemAPI || uploading || !selectedProvider} className="btn btn-primary w-full">
            <Icon name="FolderOpen" size={13} /> Pick Folder
          </button>
          {directoryName && (
            <div className="text-[10px] text-ink-faint mt-2">
              <Icon name="Folder" size={10} className="inline" /> Handle: {directoryName}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Icon name="Folder" size={16} className="text-info" style={{ color: "var(--info)" }} />
            <h3 className="font-semibold text-sm text-ink">Universal Folder Picker</h3>
            <Pill type="success">All browsers</Pill>
          </div>
          <p className="text-xs text-ink-light mb-3">Uses webkitdirectory input. Pick a folder — browser reads all files inside via native dialog.</p>
          <button onClick={pickFolderClassic} disabled={uploading || !selectedProvider} className="btn btn-primary w-full">
            <Icon name="Folder" size={13} /> Pick Folder
          </button>
          <input ref={folderInputRef} type="file" className="hidden" multiple onChange={handleClassicFolderPicked} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
        </div>
      </div>

      {!canUpload && <AlertBox type="warn">Your role can view documents but not upload them.</AlertBox>}

      {/* File list */}
      {selectedFiles.length > 0 && (
        <div className="card mb-4 overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-semibold text-ink">Selected Files</h3>
              <p className="text-xs text-ink-light mt-1">
                {selectedFiles.length} file(s) · total {Math.round(selectedFiles.reduce((s, f) => s + f.size, 0) / 1024)} KB
                {detecting && (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="loader" style={{ width: 10, height: 10 }} /> detecting types…
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={watchMode} onChange={(e) => setWatchMode(e.target.checked)} />
                Watch folder for changes
              </label>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setUploadResults([]);
                  setDirectoryName(null);
                }}
                className="btn btn-ghost text-xs"
                disabled={uploading}
              >
                <Icon name="X" size={11} /> Clear
              </button>
              <button onClick={uploadAll} disabled={uploading || detecting || !canUpload || !selectedProvider} className="btn btn-primary">
                {uploading ? (
                  <>
                    <span className="loader"></span> Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="Upload" size={13} /> Upload All to {payerName || providerName}
                  </>
                )}
              </button>
            </div>
          </div>
          {watchMode && (
            <div className="mx-4 mt-3">
              <DeferredNotice>
                Continuous folder watching (auto-uploading new files as they appear) is planned for a later phase — it needs a small desktop agent because browsers can&apos;t watch the local file system. For now, pick the folder again to upload new files.
              </DeferredNotice>
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Detected Type</th>
                  <th>Last Modified</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedFiles.map((f, i) => {
                  const result = uploadResults[i];
                  return (
                    <tr key={i}>
                      <td className="font-mono text-xs">
                        <Icon name="FileText" size={11} className="inline mr-1 text-ink-light" />
                        {f.relativePath || f.name}
                      </td>
                      <td className="font-mono text-xs">{Math.round(f.size / 1024)} KB</td>
                      <td>
                        {result?.status === "uploaded" ? (
                          <Pill type="info">{result.label || labelOf(f.docType)}</Pill>
                        ) : (
                          <select
                            value={f.docType}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSelectedFiles((prev) => prev.map((p, idx) => (idx === i ? { ...p, docType: v } : p)));
                            }}
                            className="input input-sm"
                            style={{ minWidth: 170, color: f.docType ? undefined : "#a16207" }}
                            disabled={uploading || docs.loading}
                            aria-label={"Document type for " + f.name}
                          >
                            <option value="">Uncategorized (skip)</option>
                            {docTypes.map((d) => (
                              <option key={d.docType} value={d.docType}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="text-xs text-ink-light">{fmtDate(new Date(f.lastModified))}</td>
                      <td>
                        {!result ? (
                          <span className="text-ink-faint text-xs">—</span>
                        ) : result.status === "uploaded" ? (
                          <Pill type="success">✓ Uploaded</Pill>
                        ) : (
                          <div>
                            <Pill type={result.status === "skipped" ? "warn" : "danger"}>{result.status === "skipped" ? "Skipped" : "Failed"}</Pill>
                            {result.reason && <div className="text-[10px] text-ink-faint mt-0.5">{result.reason}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
