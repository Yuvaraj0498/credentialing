"use client";

import { useState } from "react";
import { AlertBox } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { api, errorMessage } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/stores/toast";
import { esc, printHtml } from "@/components/providers/shared";
import type { Hospital, Letter, LetterType, ProviderDetail } from "@/types/providers";

const TYPES: { id: LetterType; label: string; icon: string }[] = [
  { id: "initial", label: "Initial", icon: "FilePlus" },
  { id: "recred", label: "Re-appointment", icon: "RefreshCw" },
  { id: "privileging", label: "Privileging", icon: "Award" },
];

const titleFor = (t: LetterType) => (t === "initial" ? "Letter of Appointment" : t === "recred" ? "Re-appointment Letter" : "Privileging Confirmation Letter");

/** Letter body in the prototype's layout (L6572-6587), built from the API's Letter. */
function letterHtml(l: Letter) {
  const p = l.provider;
  const place = l.hospital?.name || l.organization?.name || "";
  const city = l.hospital ? [l.hospital.city, l.hospital.state].filter(Boolean).join(", ") : [l.organization?.city, l.organization?.state].filter(Boolean).join(", ");
  let html = "<h1>" + esc(l.title) + "</h1>";
  html += "<p style='text-align: right; color: #666;'>" + esc(fmtDate(l.letterDate)) + "</p>";
  html += "<p>To Whom It May Concern,</p>";
  html += "<p>" + esc(l.confirmationText) + "</p>";
  html += "<p><strong>Specialty:</strong> " + esc(p.specialty || "—") + "<br>";
  html += "<strong>License:</strong> " + esc(p.licenseNumber || "—") + " (" + esc(p.licenseState || "—") + ")<br>";
  html += "<strong>Appointment Effective Date:</strong> " + esc(fmtDate(l.effectiveDate)) + "<br>";
  html += "<strong>Next Re-credentialing Due:</strong> " + esc(fmtDate(l.nextRecredDue)) + "</p>";
  html += "<p>This appointment is subject to all bylaws, rules, regulations, and policies of " + esc(place) + " and is contingent upon continued compliance with all credentialing requirements.</p>";
  html += "<p>Sincerely,</p>";
  html += "<p><strong>Medical Staff Office</strong><br>" + esc(place) + (city ? "<br>" + esc(city) : "") + "</p>";
  return html;
}

function LetterView({ letter: l }: { letter: Letter }) {
  const p = l.provider;
  const place = l.hospital?.name || l.organization?.name || "";
  const city = l.hospital ? [l.hospital.city, l.hospital.state].filter(Boolean).join(", ") : [l.organization?.city, l.organization?.state].filter(Boolean).join(", ");
  return (
    <div className="card card-pad text-sm text-ink space-y-3" style={{ lineHeight: 1.6 }}>
      <h1 className="font-display text-2xl font-bold">{l.title}</h1>
      <p className="text-right" style={{ color: "#666" }}>{fmtDate(l.letterDate)}</p>
      <p>To Whom It May Concern,</p>
      <p>{l.confirmationText}</p>
      <p>
        <strong>Specialty:</strong> {p.specialty || "—"}
        <br />
        <strong>License:</strong> {p.licenseNumber || "—"} ({p.licenseState || "—"})
        <br />
        <strong>Appointment Effective Date:</strong> {fmtDate(l.effectiveDate)}
        <br />
        <strong>Next Re-credentialing Due:</strong> {fmtDate(l.nextRecredDue)}
      </p>
      <p>This appointment is subject to all bylaws, rules, regulations, and policies of {place} and is contingent upon continued compliance with all credentialing requirements.</p>
      <p>Sincerely,</p>
      <p>
        <strong>Medical Staff Office</strong>
        <br />
        {place}
        {city && (
          <>
            <br />
            {city}
          </>
        )}
      </p>
    </div>
  );
}

/** Prototype AppointmentLetterModal (L6564) → POST /providers/{id}/letters, then print. */
export function AppointmentLetterModal({ provider, onClose }: { provider: ProviderDetail; onClose: () => void }) {
  const toast = useToast();
  const hospitals = useAsync(() => api.get<Hospital[]>("/hospitals"), []);
  const [type, setType] = useState<LetterType>("initial");
  const [hospitalId, setHospitalId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState<Letter | null>(null);

  const activeHospitals = (hospitals.data || []).filter((h) => h.active);
  const selectedHospitalId = hospitalId || (activeHospitals[0] ? String(activeHospitals[0].id) : "");
  const hospital = activeHospitals.find((h) => String(h.id) === selectedHospitalId);
  const letterTitle = titleFor(type);
  const suffix = provider.suffix || "MD";

  const generate = async () => {
    setBusy(true);
    try {
      const l = await api.post<Letter>("/providers/" + provider.id + "/letters", { letterType: type, hospitalId: hospital ? hospital.id : undefined });
      setLetter(l);
      toast(l.title + " generated");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (!letter) return;
    if (!printHtml(letter.title + " — " + letter.provider.lastName, letterHtml(letter))) toast("Allow pop-ups to print the letter", "warn");
  };

  if (letter) {
    return (
      <Modal title={letter.title} subtitle={"For " + provider.firstName + " " + provider.lastName} onClose={onClose} maxWidth={680}>
        <div className="space-y-3">
          <LetterView letter={letter} />
          <div className="text-[11px] text-ink-faint">
            Generated {fmtDate(letter.generatedAt)}
            {letter.generatedByName ? " by " + letter.generatedByName : ""}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button onClick={onClose} className="btn btn-secondary">Done</button>
            <button onClick={print} className="btn btn-primary"><Icon name="Printer" size={13} /> Print / Save PDF</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Generate Appointment Letter" subtitle={"For " + provider.firstName + " " + provider.lastName} onClose={onClose} maxWidth={520}>
      <div className="space-y-3">
        <div>
          <label className="label">Letter Type</label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((o) => (
              <button key={o.id} onClick={() => setType(o.id)} className={"card p-3 text-center transition-all " + (type === o.id ? "border-accent bg-accent-soft" : "card-hover")}>
                <Icon name={o.icon} size={18} className="mx-auto mb-1" style={{ color: type === o.id ? "var(--accent)" : "var(--ink-light)" }} />
                <div className="text-sm font-medium">{o.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Hospital</label>
          {hospitals.error ? (
            <AlertBox type="danger">
              {hospitals.error}{" "}
              <button className="underline" onClick={hospitals.reload}>Retry</button>
            </AlertBox>
          ) : (
            <select value={selectedHospitalId} onChange={(e) => setHospitalId(e.target.value)} className="input" disabled={hospitals.loading}>
              {hospitals.loading && <option value="">Loading hospitals…</option>}
              {!hospitals.loading && activeHospitals.length === 0 && <option value="">— No hospitals configured (organization name is used) —</option>}
              {activeHospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.city || "—"}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="card card-pad" style={{ background: "var(--bg-soft)", fontSize: 12 }}>
          <div className="text-xs font-semibold text-ink-faint uppercase tracking-wider mb-2">Preview</div>
          <div className="font-display font-bold">{letterTitle}</div>
          <p className="text-xs mt-2 text-ink-light">
            This letter confirms that{" "}
            <strong>
              {provider.firstName} {provider.lastName}, {suffix}
            </strong>{" "}
            has been {type === "initial" ? "granted initial appointment" : type === "recred" ? "re-appointed" : "granted clinical privileges"} to the medical staff of{" "}
            <strong>{hospital?.name || "your organization"}</strong>...
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={busy}>Cancel</button>
          <button onClick={generate} className="btn btn-primary" disabled={busy || hospitals.loading}>
            {busy ? <span className="loader" /> : <Icon name="Download" size={13} />} Generate &amp; Download
          </button>
        </div>
      </div>
    </Modal>
  );
}
