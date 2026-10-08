"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/stores/toast";
import { todayISO } from "@/lib/utils";
import { useShell } from "@/stores/shell";
import { downloadText, parseCaqhCsv, parsedToImportRow, SAMPLE_CSV, type CaqhParsed } from "./csvParsers";
import { ImportTarget, targetPayload, type ImportTargetValue } from "./ImportTarget";
import type { ImportResponse } from "@/types/caqh";

type Stage = "upload" | "parsing" | "preview" | "done";

export function CAQHCsvImport() {
  const toast = useToast();
  const { can } = useAuth();
  const { publish, refreshCounters } = useShell();
  const canImport = can("create", "provider");
  const [stage, setStage] = useState<Stage>("upload");
  const [parsedData, setParsedData] = useState<CaqhParsed | null>(null);
  const [filename, setFilename] = useState("");
  const [target, setTarget] = useState<ImportTargetValue>({ practiceId: null, locationId: null });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setStage("parsing");
    try {
      const text = await file.text();
      const parsed = parseCaqhCsv(text);
      setParsedData(parsed);
      setStage("preview");
    } catch (e) {
      toast("Parse error: " + errorMessage(e), "error");
      setStage("upload");
    }
  };

  const handleDownloadSample = () => {
    downloadText(SAMPLE_CSV, "caqh-sample-export-stephanie-carlson.csv");
    toast("Sample CSV downloaded — upload it back to test the parser");
  };

  const handleUseSample = () => {
    setFilename("caqh-sample-export-stephanie-carlson.csv");
    setParsedData(parseCaqhCsv(SAMPLE_CSV));
    setStage("preview");
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    try {
      const res = await api.post<ImportResponse>("/providers/import", { ...targetPayload(target), providers: [parsedToImportRow(parsedData)] });
      setResult(res);
      setStage("done");
      if (res.created.length > 0) {
        toast("Imported " + (parsedData.firstName || "") + " " + (parsedData.lastName || "") + " from CAQH");
        publish("providers");
        refreshCounters();
      } else {
        toast(res.skipped[0]?.reason || "Provider was not imported", "error");
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStage("upload");
    setParsedData(null);
    setFilename("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const created = result?.created[0];
  const skipped = result?.skipped[0];

  return (
    <div>
      {stage === "upload" && (
        <div>
          <div className="card card-pad mb-4">
            <h3 className="font-display font-semibold text-ink mb-2">Upload CAQH Export</h3>
            <p className="text-xs text-ink-light mb-4">
              The provider exports their ProView profile as CSV from <a href="https://proview.caqh.org" target="_blank" rel="noreferrer" className="text-accent underline">proview.caqh.org</a> → My Information → Export. Upload the file here to auto-create the provider record.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-line rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
              style={{ background: "var(--bg-soft)" }}
            >
              <Icon name="Upload" size={32} className="mx-auto text-ink-faint mb-3" />
              <div className="font-medium text-ink mb-1">Drop your CAQH CSV here, or click to browse</div>
              <div className="text-xs text-ink-light">Accepts .csv exports from CAQH ProView</div>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line text-xs flex-wrap">
              <Icon name="Sparkles" size={12} className="text-accent" />
              <span className="text-ink-light">Don&apos;t have a CAQH export? </span>
              <button onClick={handleDownloadSample} className="text-accent font-medium hover:underline">Download sample</button>
              <span className="text-ink-faint">or</span>
              <button onClick={handleUseSample} className="text-accent font-medium hover:underline">use sample now</button>
            </div>
          </div>

          <div className="card card-pad">
            <h4 className="font-semibold text-sm text-ink mb-2">What gets imported</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                { label: "Demographics", icon: "User" },
                { label: "NPI + CAQH ID", icon: "IdCard" },
                { label: "License", icon: "Award" },
                { label: "DEA", icon: "Pill" },
                { label: "Malpractice", icon: "Shield" },
                { label: "Education", icon: "GraduationCap" },
                { label: "Board Certs", icon: "Stamp" },
                { label: "Practice Info", icon: "Building" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 p-2 rounded" style={{ background: "var(--bg-soft)" }}>
                  <Icon name={f.icon} size={12} className="text-accent" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === "parsing" && (
        <div className="card card-pad text-center" style={{ padding: 60 }}>
          <span className="loader" style={{ width: 32, height: 32, margin: "0 auto" }}></span>
          <div className="mt-4 font-medium text-ink">Parsing {filename}...</div>
          <div className="text-xs text-ink-light mt-2">Extracting provider data fields</div>
        </div>
      )}

      {stage === "preview" && parsedData && (
        <div>
          <div className="card card-pad mb-4" style={{ background: "var(--success-soft)", borderColor: "var(--success)" }}>
            <div className="flex items-center gap-3">
              <Icon name="CheckCircle2" size={20} className="text-success" />
              <div>
                <div className="font-semibold text-ink">Parsed successfully</div>
                <div className="text-xs text-ink-light">{Object.values(parsedData).filter((v) => v !== null && v !== undefined && v !== "").length} fields extracted from {filename}</div>
              </div>
            </div>
          </div>

          {canImport && <ImportTarget value={target} onChange={setTarget} disabled={importing} />}

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-line">
              <h3 className="font-display font-semibold text-ink">Preview — {parsedData.firstName} {parsedData.lastName}, {parsedData.suffix}</h3>
              <p className="text-xs text-ink-light mt-1">Review the parsed data before importing into your system</p>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <PreviewSection title="Identity" fields={[
                ["CAQH Provider ID", parsedData.caqhId],
                ["NPI", parsedData.npi],
                ["Date of Birth", parsedData.dob],
                ["Email", parsedData.email],
                ["Phone", parsedData.phone],
              ]} />
              <PreviewSection title="Professional" fields={[
                ["Specialty", parsedData.specialty],
                ["Taxonomy", parsedData.taxonomy],
                ["Medical School", parsedData.medicalSchool],
                ["Graduation", parsedData.medSchoolGrad],
                ["Residency", parsedData.residency],
              ]} />
              <PreviewSection title="License" fields={[
                ["License #", parsedData.license],
                ["State", parsedData.licenseState],
                ["Status", parsedData.licenseStatus],
                ["Issued", parsedData.licenseIssued],
                ["Expires", parsedData.licenseExpiration],
              ]} />
              <PreviewSection title="DEA" fields={[
                ["DEA #", parsedData.dea],
                ["Schedules", parsedData.deaSchedules],
                ["Issued", parsedData.deaIssued],
                ["Expires", parsedData.deaExpiration, parsedData.deaExpiration && parsedData.deaExpiration < today ? "expired" : "ok"],
              ]} />
              <PreviewSection title="Malpractice" fields={[
                ["Carrier", parsedData.malpracticeCarrier],
                ["Policy", parsedData.malpracticePolicy],
                ["Per Occurrence", parsedData.malpracticeLimit ? "$" + Number(parsedData.malpracticeLimit).toLocaleString() : null],
                ["Aggregate", parsedData.malpracticeAggregate ? "$" + Number(parsedData.malpracticeAggregate).toLocaleString() : null],
                ["Expires", parsedData.malpracticeExpiration],
              ]} />
              <PreviewSection title="Practice & Attestation" fields={[
                ["Address", parsedData.practiceAddress],
                ["City, State ZIP", [parsedData.practiceCity, parsedData.practiceState, parsedData.practiceZip].filter(Boolean).join(", ")],
                ["Last Attested", parsedData.lastAttestation],
                ["Attestation Status", parsedData.attestationStatus],
                ["Profile Status", parsedData.profileStatus],
              ]} />
            </div>
            <div className="p-4 border-t border-line bg-bg-soft flex justify-between items-center flex-wrap gap-2">
              <button onClick={reset} className="btn btn-ghost" disabled={importing}><Icon name="X" size={13} /> Cancel</button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={reset} className="btn btn-secondary" disabled={importing}><Icon name="Upload" size={13} /> Upload Different File</button>
                {canImport && (
                  <button onClick={handleImport} className="btn btn-primary" disabled={importing}>
                    {importing ? <span className="loader" style={{ borderTopColor: "white" }}></span> : <Icon name="Check" size={13} />} Import This Provider
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {stage === "done" && created && (
        <div className="card card-pad text-center" style={{ padding: 60 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
            <Icon name="Check" size={32} />
          </div>
          <h3 className="font-display text-xl font-bold text-ink">Imported Successfully</h3>
          <p className="text-sm text-ink-light mt-2">{created.name} is now in your provider roster</p>
          <div className="flex justify-center gap-2 mt-6">
            <Link href={"/providers/" + created.id} className="btn btn-secondary"><Icon name="ExternalLink" size={13} /> View Provider</Link>
            <button onClick={reset} className="btn btn-primary"><Icon name="Plus" size={13} /> Import Another</button>
          </div>
        </div>
      )}

      {stage === "done" && !created && (
        <div className="card card-pad text-center" style={{ padding: 60 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <Icon name="X" size={32} />
          </div>
          <h3 className="font-display text-xl font-bold text-ink">Not Imported</h3>
          <p className="text-sm text-ink-light mt-2">
            {skipped ? (skipped.name ? skipped.name + ": " : "") + skipped.reason : "The provider could not be imported."}
          </p>
          <button onClick={reset} className="btn btn-primary mt-6"><Icon name="Upload" size={13} /> Upload Different File</button>
        </div>
      )}
    </div>
  );
}

function PreviewSection({ title, fields }: { title: string; fields: [string, ReactNode | null | undefined, string?][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <div key={i} className="flex justify-between gap-3 text-xs">
            <span className="text-ink-light">{f[0]}</span>
            <span className={"text-right text-ink font-medium " + (f[2] === "expired" ? "text-danger" : "")}>
              {f[1] || <span className="text-ink-faint italic">—</span>}
              {f[2] === "expired" && <Icon name="AlertTriangle" size={10} className="inline ml-1" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
