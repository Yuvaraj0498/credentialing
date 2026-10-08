"use client";

import { useState } from "react";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { useUser } from "@/stores/auth";
import { todayISO } from "@/lib/utils";
import { isWriterRole, type HospitalItem, type Letter, type LetterType } from "@/types/credentialing-ops";

const LETTER_TITLES: Record<LetterType, string> = {
  initial: "Letter of Appointment",
  recred: "Re-appointment Letter",
  privileging: "Privileging Confirmation Letter",
};

const esc = (v: string | null | undefined) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "YYYY-MM-DD" → local date string, like the prototype's toLocaleDateString(). */
const localDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString();
};

const cityLine = (city: string | null | undefined, state: string | null | undefined) => [city, state].filter(Boolean).join(", ");

/** Port of the prototype exportPDF (L3852) writing into an already-opened window (avoids pop-up blockers after await). */
function writePrintWindow(win: Window, title: string, contentHtml: string) {
  const css = "body { font-family: -apple-system, sans-serif; padding: 32px; color: #0f172a; }"
    + " h1 { font-size: 24px; margin-bottom: 8px; }"
    + " table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }"
    + " th, td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }"
    + " th { background: #f8f9fb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }"
    + " .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }"
    + " .pill-success { background: #ecfdf5; color: #059669; }"
    + " .pill-warn { background: #fefce8; color: #a16207; }"
    + " .pill-danger { background: #fef2f2; color: #b91c1c; }"
    + " .pill-info { background: #eff6ff; color: #1d4ed8; }"
    + " @media print { body { padding: 0; } }";
  const closeScript = "<" + "/script>";
  const closeStyle = "<" + "/style>";
  const html = "<!doctype html><html><head><title>" + esc(title) + "</title><style>" + css + closeStyle
    + "</head><body>" + contentHtml
    + "<script>setTimeout(function(){window.print();}, 300);" + closeScript
    + "</body></html>";
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** Prototype letter layout (L6572-6587), filled from the server-generated Letter. */
function letterHtml(l: Letter) {
  const p = l.provider;
  const placeName = l.hospital?.name ?? l.organization?.name ?? "";
  const placeCity = l.hospital ? cityLine(l.hospital.city, l.hospital.state) : cityLine(l.organization?.city, l.organization?.state);
  let html = "<h1>" + esc(l.title) + "</h1>";
  html += "<p style='text-align: right; color: #666;'>" + esc(localDate(l.letterDate)) + "</p>";
  html += "<p>To Whom It May Concern,</p>";
  html += "<p>" + esc(l.confirmationText) + "</p>";
  html += "<p><strong>Specialty:</strong> " + esc(p.specialty || "—") + "<br>";
  html += "<strong>License:</strong> " + esc(p.licenseNumber || "—") + " (" + esc(p.licenseState || "—") + ")<br>";
  html += "<strong>Appointment Effective Date:</strong> " + esc(localDate(l.effectiveDate)) + "<br>";
  html += "<strong>Next Re-credentialing Due:</strong> " + esc(localDate(l.nextRecredDue)) + "</p>";
  html += "<p>This appointment is subject to all bylaws, rules, regulations, and policies of " + esc(placeName) + " and is contingent upon continued compliance with all credentialing requirements.</p>";
  html += "<p>Sincerely,</p>";
  html += "<p><strong>Medical Staff Office</strong><br>" + esc(placeName) + (placeCity ? "<br>" + esc(placeCity) : "") + "</p>";
  return html;
}

export function AppointmentLetterModal({
  providerId,
  providerName,
  defaultType = "initial",
  defaultHospitalId,
  onClose,
}: {
  providerId: number;
  providerName?: string;
  defaultType?: LetterType;
  defaultHospitalId?: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const user = useUser();
  const canWrite = isWriterRole(user.role);
  const [type, setType] = useState<LetterType>(defaultType);
  const [hospitalChoice, setHospitalChoice] = useState<number | null>(defaultHospitalId ?? null);
  const [effectiveDate, setEffectiveDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const hospitalsQ = useAsync(() => api.get<HospitalItem[]>("/hospitals"), []);
  const hospitals = (hospitalsQ.data ?? []).filter((h) => h.active || h.id === defaultHospitalId);
  const hospitalId = hospitalChoice ?? hospitals[0]?.id ?? null;
  const hospital = hospitals.find((h) => h.id === hospitalId);

  const letterTitle = LETTER_TITLES[type];
  const name = providerName || "this provider";

  const generatePDF = async () => {
    const errs: Record<string, string> = {};
    if (!effectiveDate) errs.effectiveDate = "Effective date is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // Open the print window synchronously (inside the click) so pop-up blockers allow it.
    const win = window.open("", "_blank");
    setBusy(true);
    try {
      const letter = await api.post<Letter>("/providers/" + providerId + "/letters", {
        letterType: type,
        hospitalId: hospitalId ?? undefined,
        effectiveDate,
      });
      if (win) {
        writePrintWindow(win, letter.title + " — " + letter.provider.lastName, letterHtml(letter));
        toast(letter.title + " generated");
      } else {
        toast(letter.title + " generated — allow pop-ups to print it", "warn");
      }
      onClose();
    } catch (e) {
      win?.close();
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Generate Appointment Letter" subtitle={"For " + name} onClose={onClose} maxWidth={520}>
      <div className="space-y-3">
        <div>
          <label className="label">Letter Type</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "initial", label: "Initial", icon: "FilePlus" },
              { id: "recred", label: "Re-appointment", icon: "RefreshCw" },
              { id: "privileging", label: "Privileging", icon: "Award" },
            ] as { id: LetterType; label: string; icon: string }[]).map((o) => (
              <button key={o.id} type="button" onClick={() => setType(o.id)}
                      className={"card p-3 text-center transition-all " + (type === o.id ? "border-accent bg-accent-soft" : "card-hover")}>
                <Icon name={o.icon} size={18} className="mx-auto mb-1" style={{ color: type === o.id ? "var(--accent)" : "var(--ink-light)" }} />
                <div className="text-sm font-medium">{o.label}</div>
              </button>
            ))}
          </div>
        </div>
        <Field label="Hospital" error={errors.hospitalId || (hospitalsQ.error ? hospitalsQ.error : undefined)}>
          <select value={hospitalId ?? ""} onChange={(e) => setHospitalChoice(e.target.value ? Number(e.target.value) : null)} className="input" disabled={hospitalsQ.loading}>
            {hospitalsQ.loading && <option value="">Loading hospitals…</option>}
            {!hospitalsQ.loading && hospitals.length === 0 && <option value="">No hospitals configured — uses organization name</option>}
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}{h.city || h.state ? " — " + cityLine(h.city, h.state) : ""}</option>)}
          </select>
        </Field>
        <Field label="Appointment Effective Date" error={errors.effectiveDate}>
          <input type="date" value={effectiveDate} onChange={(e) => { setEffectiveDate(e.target.value); setErrors({ ...errors, effectiveDate: "" }); }} className="input" />
        </Field>

        <div className="card card-pad" style={{ background: "var(--bg-soft)", fontSize: 12 }}>
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Preview</div>
          <div className="font-display font-bold">{letterTitle}</div>
          <p className="text-xs mt-2 text-ink-light">
            This letter confirms that <strong>{name}</strong> has been {type === "initial" ? "granted initial appointment" : type === "recred" ? "re-appointed" : "granted clinical privileges"} to the medical staff of <strong>{hospital?.name ?? user.orgName ?? "your organization"}</strong>...
          </p>
        </div>

        <div className="flex justify-end items-center gap-2 pt-3 border-t border-line">
          {!canWrite && <span className="text-xs text-ink-faint mr-auto">Read-only access</span>}
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={generatePDF} className="btn btn-primary" disabled={!canWrite || busy || hospitalsQ.loading}>
            {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Download" size={13} />} Generate & Download
          </button>
        </div>
      </div>
    </Modal>
  );
}
