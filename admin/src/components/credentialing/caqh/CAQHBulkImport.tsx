"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { StatCard } from "@/components/StatCard";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/stores/toast";
import { fmtDate, todayISO } from "@/lib/utils";
import { useShell } from "@/stores/shell";
import { bulkRowToImportRow, downloadText, parseBulkCsv, SAMPLE_BULK_CSV, type BulkRow } from "./csvParsers";
import { ImportTarget, targetPayload, type ImportTargetValue } from "./ImportTarget";
import type { ImportResponse } from "@/types/caqh";

type Stage = "upload" | "parsing" | "preview" | "importing" | "done";

/** Indexes (into `rows`) of the valid rows — uses the original row index (fixes prototype L9379). */
const validIndexes = (rows: BulkRow[]) => rows.map((r, i) => (r.valid ? i : -1)).filter((i) => i >= 0);

export function CAQHBulkImport() {
  const toast = useToast();
  const { can } = useAuth();
  const { publish, refreshCounters } = useShell();
  const canImport = can("create", "provider");
  const [stage, setStage] = useState<Stage>("upload");
  const [parsedRows, setParsedRows] = useState<BulkRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filename, setFilename] = useState("");
  const [importResults, setImportResults] = useState<ImportResponse | null>(null);
  const [target, setTarget] = useState<ImportTargetValue>({ practiceId: null, locationId: null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  const loadRows = (rows: BulkRow[]) => {
    setParsedRows(rows);
    // Default: all valid rows selected
    setSelectedRows(new Set(validIndexes(rows)));
    setStage("preview");
  };

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setStage("parsing");
    try {
      const text = await file.text();
      loadRows(parseBulkCsv(text));
    } catch (e) {
      toast("Parse error: " + errorMessage(e), "error");
      setStage("upload");
    }
  };

  const handleUseSample = () => {
    setFilename("caqh-roster-bulk-export.csv");
    loadRows(parseBulkCsv(SAMPLE_BULK_CSV));
  };

  const handleDownloadSample = () => {
    downloadText(SAMPLE_BULK_CSV, "caqh-roster-bulk-sample.csv");
    toast("Sample bulk roster downloaded");
  };

  const toggleRow = (i: number) => {
    const next = new Set(selectedRows);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelectedRows(next);
  };

  const toggleAll = () => {
    if (selectedRows.size === parsedRows.filter((r) => r.valid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validIndexes(parsedRows)));
    }
  };

  const runImport = async () => {
    const toImport = Array.from(selectedRows)
      .sort((a, b) => a - b)
      .map((i) => parsedRows[i]);
    if (toImport.length === 0) return;
    setStage("importing");
    try {
      const res = await api.post<ImportResponse>("/providers/import", { ...targetPayload(target), providers: toImport.map(bulkRowToImportRow) });
      setImportResults(res);
      setStage("done");
      toast("Imported " + res.created.length + " provider(s)", res.created.length > 0 ? "success" : "warn");
      if (res.created.length > 0) {
        publish("providers");
        refreshCounters();
      }
    } catch (e) {
      toast(errorMessage(e), "error");
      setStage("preview");
    }
  };

  const reset = () => {
    setStage("upload");
    setParsedRows([]);
    setSelectedRows(new Set());
    setFilename("");
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (stage === "upload") {
    return (
      <div>
        <div className="card card-pad mb-4">
          <h3 className="font-display font-semibold text-ink mb-2">Bulk Import from CAQH Roster</h3>
          <p className="text-xs text-ink-light mb-4">
            Upload a multi-provider CSV (one provider per row) from CAQH&apos;s Roster Management export, your PO dashboard, or an aggregator service. Each row will be reviewed before import.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
            style={{ background: "var(--bg-soft)" }}
          >
            <Icon name="FileSpreadsheet" size={32} className="mx-auto text-ink-faint mb-3" />
            <div className="font-medium text-ink mb-1">Drop a multi-row CSV here, or click to browse</div>
            <div className="text-xs text-ink-light">Expects one header row + N provider rows. Both Field/Value and columnar formats supported.</div>
            <input ref={fileInputRef} type="file" accept=".csv,.tsv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line text-xs flex-wrap">
            <Icon name="Sparkles" size={12} className="text-accent" />
            <span className="text-ink-light">Need a test file? </span>
            <button onClick={handleDownloadSample} className="text-accent font-medium hover:underline">Download 15-provider sample</button>
            <span className="text-ink-faint">or</span>
            <button onClick={handleUseSample} className="text-accent font-medium hover:underline">use sample now</button>
          </div>
        </div>

        <div className="card card-pad" style={{ background: "var(--info-soft)" }}>
          <div className="flex items-start gap-2 text-xs text-ink">
            <Icon name="Info" size={13} className="text-info flex-shrink-0 mt-0.5" />
            <div>
              <strong>Expected columns (any subset works):</strong> CAQH Provider ID, NPI, First Name, Last Name, Suffix, Specialty, Email, Phone, License Number, License State, License Expiration, DEA Number, DEA Expiration, Malpractice Carrier, Malpractice Expiration, Profile Status, Last Attestation, Authorization Status.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "parsing") {
    return (
      <div className="card card-pad text-center" style={{ padding: 60 }}>
        <span className="loader" style={{ width: 32, height: 32, margin: "0 auto" }}></span>
        <div className="mt-4 font-medium text-ink">Parsing {filename}...</div>
        <div className="text-xs text-ink-light mt-2">Validating provider rows and checking data quality</div>
      </div>
    );
  }

  if (stage === "preview") {
    const validRows = parsedRows.filter((r) => r.valid);
    const invalidRows = parsedRows.filter((r) => !r.valid);
    const allValidSelected = validRows.length > 0 && selectedRows.size === validRows.length;

    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Rows" value={parsedRows.length} sub="Parsed from file" icon="FileSpreadsheet" color="var(--ink)" />
          <StatCard label="Valid" value={validRows.length} sub="Ready to import" icon="CheckCircle2" color="var(--success)" />
          <StatCard label="Issues" value={invalidRows.length} sub="Skipped" icon="AlertTriangle" color="var(--warn)" emphasize={invalidRows.length > 0} />
          <StatCard label="Selected" value={selectedRows.size} sub="To be imported" icon="CheckSquare" color="var(--accent)" />
        </div>

        {canImport && <ImportTarget value={target} onChange={setTarget} />}

        <div className="card overflow-hidden mb-4">
          <div className="p-3 border-b border-line flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="btn btn-secondary text-xs">
                <Icon name={allValidSelected ? "Square" : "CheckSquare"} size={11} /> {allValidSelected ? "Deselect All" : "Select All Valid"}
              </button>
              <span className="text-xs text-ink-light">{selectedRows.size} of {validRows.length} valid rows selected</span>
            </div>
            <button onClick={reset} className="btn btn-ghost text-xs"><Icon name="Upload" size={11} /> Upload different file</button>
          </div>
          <div className="table-scroll" style={{ maxHeight: 400, overflowY: "auto" }}>
            <table>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg)", zIndex: 1 }}>
                <tr>
                  <th></th>
                  <th>Provider</th>
                  <th>NPI</th>
                  <th>CAQH ID</th>
                  <th>Specialty</th>
                  <th>License</th>
                  <th>DEA Status</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => {
                  const isSelected = selectedRows.has(i);
                  const deaExpired = !!row.deaExpiration && row.deaExpiration < today;
                  const licenseExpired = !!row.licenseExpiration && row.licenseExpiration < today;
                  return (
                    <tr key={i} className={!row.valid ? "opacity-50" : ""} style={{ background: isSelected ? "var(--accent-soft)" : "transparent" }}>
                      <td>
                        <input type="checkbox" checked={isSelected} disabled={!row.valid} onChange={() => toggleRow(i)} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={(row.firstName || "") + " " + (row.lastName || "")} size={24} />
                          <div>
                            <div className="text-sm font-medium">{row.firstName} {row.lastName}{row.suffix ? ", " + row.suffix : ""}</div>
                            <div className="text-[10px] text-ink-faint">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{row.npi || <span className="text-danger">—</span>}</td>
                      <td className="font-mono text-xs">{row.caqhId}</td>
                      <td className="text-xs">{row.specialty}</td>
                      <td className="text-xs">
                        {row.license} <span className="text-ink-faint">({row.licenseState})</span>
                        {licenseExpired && <span className="ml-1"><Pill type="danger">expired</Pill></span>}
                      </td>
                      <td className="text-xs">
                        {row.dea ? (
                          deaExpired ? <Pill type="danger">Expired {fmtDate(row.deaExpiration)}</Pill> : <Pill type="success">Active</Pill>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {row.valid ? (
                          deaExpired || licenseExpired ? <Pill type="warn">Will import with warnings</Pill> : <Pill type="success">Clean</Pill>
                        ) : (
                          <Pill type="danger">{row.errors.join(", ")}</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button onClick={reset} className="btn btn-ghost"><Icon name="X" size={13} /> Cancel</button>
          {canImport && (
            <button onClick={runImport} disabled={selectedRows.size === 0} className="btn btn-primary">
              <Icon name="Download" size={13} /> Import {selectedRows.size} Provider{selectedRows.size === 1 ? "" : "s"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === "importing") {
    return (
      <div className="card card-pad text-center" style={{ padding: 60 }}>
        <div className="mb-4">
          <Icon name="Download" size={32} className="mx-auto text-accent" />
        </div>
        <div className="font-display text-xl font-bold text-ink mb-2">Importing {selectedRows.size} providers...</div>
        <div className="text-xs text-ink-light mb-4">Validating each row and creating provider records</div>
        <div className="max-w-md mx-auto flex justify-center">
          <span className="loader" style={{ width: 24, height: 24 }}></span>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    const errors = importResults?.skipped || [];
    return (
      <div className="card card-pad text-center" style={{ padding: 60 }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <Icon name="Check" size={32} />
        </div>
        <h3 className="font-display text-xl font-bold text-ink">Bulk Import Complete</h3>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6 text-sm">
          <div>
            <div className="font-display text-3xl font-bold text-success">{importResults?.created.length || 0}</div>
            <div className="text-xs text-ink-light">Imported</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-danger">{errors.length}</div>
            <div className="text-xs text-ink-light">Failed</div>
          </div>
          <div>
            <div className="font-display text-3xl font-bold text-warn">{parsedRows.filter((r) => !r.valid).length}</div>
            <div className="text-xs text-ink-light">Skipped</div>
          </div>
        </div>
        {errors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg text-left max-w-md mx-auto" style={{ background: "var(--danger-soft)" }}>
            <div className="text-xs font-semibold mb-1">Errors:</div>
            {errors.map((e, i) => (
              <div key={i} className="text-xs text-danger">• Row {e.rowIndex} {e.name}: {e.reason}</div>
            ))}
          </div>
        )}
        <button onClick={reset} className="btn btn-primary mt-6"><Icon name="Plus" size={13} /> Import Another File</button>
      </div>
    );
  }

  return null;
}
