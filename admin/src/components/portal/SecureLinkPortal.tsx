"use client";

import { Fragment, useRef, useState } from "react";
import { SPECIALTIES } from "@/lib/constants";
import { PasswordInput } from "@/components/PasswordInput";
import { Loading } from "@/components/AsyncState";
import { Field } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { ApiError, api, errorMessage } from "@/lib/api";
import { US_STATES } from "@/lib/constants";
import { fmtDate, fmtTs, todayISO } from "@/lib/utils";
import { ALLOWED_EXT, fileExt, MAX_FILE_BYTES, NPI_RE } from "@/components/providers/shared";
import { useAsync } from "@/lib/hooks";
import { digitsOnly, PHONE_RE, phoneDigits } from "@/lib/validation";
import type { PublicInviteInfo, PublicLinkStatus, PublicMissingDoc, PublicUploadResult } from "@/types/providers";

type Step = "profile" | "docs" | "review" | "done";
const STEPS: Step[] = ["profile", "docs", "review", "done"];
const CREDENTIALS = ["MD", "DO", "NP", "PA", "DDS", "DMD", "LCSW", "LPC", "LMFT", "BCBA", "RN", "PhD"];

interface Profile {
  npi: string;
  caqhId: string;
  suffix: string;
  specialty: string;
  phone: string;
  dateOfBirth: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpires: string;
  deaNumber: string;
  deaExpires: string;
  caqhUsername: string;
  caqhPassword: string;
  pecosAccess: string;
  pecosUsername: string;
}

interface Uploaded {
  fileName: string;
  size: number;
}

/**
 * Prototype v2 SecureLinkPortal — the provider-facing page behind a secure link (/admin/upload/{token}):
 * PIN → profile → documents → review & submit.
 */
export function SecureLinkPortal({ token }: { token: string }) {
  const base = "/public/invites/" + encodeURIComponent(token);
  const statusQuery = useAsync<PublicLinkStatus>(() => api.get<PublicLinkStatus>(base), [base]);
  const status = statusQuery.data;
  const invalid = statusQuery.error;
  const [info, setInfo] = useState<PublicInviteInfo | null>(null);
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<PublicMissingDoc[]>([]);
  const [uploaded, setUploaded] = useState<Record<string, Uploaded>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const authenticate = async () => {
    if (pin.length !== 6) {
      setAuthError("Enter the 6-digit PIN from your email");
      return;
    }
    setBusy(true);
    setAuthError("");
    try {
      const res = await api.post<PublicInviteInfo>(base + "/verify", { pin });
      const p = res.profile;
      setInfo(res);
      setDocs(res.missingDocuments);
      setProfile({
        npi: p.npi || "",
        caqhId: p.caqhId || "",
        suffix: p.suffix || "",
        specialty: p.specialty || "",
        phone: phoneDigits(p.phone),
        dateOfBirth: p.dateOfBirth || "",
        licenseNumber: p.licenseNumber || "",
        licenseState: p.licenseState || "",
        licenseExpires: p.licenseExpires || "",
        deaNumber: p.deaNumber || "",
        deaExpires: p.deaExpires || "",
        caqhUsername: "",
        caqhPassword: "",
        pecosAccess: "",
        pecosUsername: "",
      });
      setStep("profile");
    } catch (err) {
      setAuthError(errorMessage(err));
      setPin("");
      statusQuery.reload();
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = async () => {
    if (!profile) return;
    setBusy(true);
    setSubmitError(null);
    const orNull = (v: string) => (v.trim() ? v.trim() : null);
    try {
      const res = await api.post<PublicLinkStatus>(base + "/profile", {
        pin,
        npi: profile.npi,
        caqhId: orNull(profile.caqhId),
        suffix: orNull(profile.suffix),
        specialty: orNull(profile.specialty),
        phone: orNull(profile.phone),
        dateOfBirth: orNull(profile.dateOfBirth),
        licenseNumber: profile.licenseNumber.trim(),
        licenseState: orNull(profile.licenseState),
        licenseExpires: orNull(profile.licenseExpires),
        deaNumber: orNull(profile.deaNumber),
        deaExpires: orNull(profile.deaExpires),
        caqhUsername: profile.caqhUsername.trim(),
        caqhPassword: profile.caqhPassword,
        pecosAccessGranted: profile.pecosAccess === "yes",
        pecosUsername: profile.pecosAccess === "yes" ? profile.pecosUsername.trim() : undefined,
      });
      statusQuery.setData(res);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setProfileErrors(err.fieldErrors);
        setStep("profile");
      }
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const firstName = info?.firstName || status?.firstName || "";
  const requiredDocs = docs.filter((d) => d.critical);
  const uploadedRequired = requiredDocs.filter((d) => uploaded[d.docType]).length;
  // Same requirements as adding a provider in the admin app (staff already gave the name, email, practice and location).
  const profileValid =
    !!profile &&
    NPI_RE.test(profile.npi) &&
    /^[0-9]{6,10}$/.test(profile.caqhId) &&
    !!profile.suffix &&
    !!profile.specialty.trim() &&
    PHONE_RE.test(profile.phone) &&
    !!profile.licenseNumber.trim() &&
    !!profile.licenseState &&
    !!profile.licenseExpires &&
    !!profile.caqhUsername.trim() &&
    !!profile.caqhPassword &&
    !!profile.pecosAccess &&
    (profile.pecosAccess !== "yes" || !!profile.pecosUsername.trim());
  const authenticated = !!info;
  const blocked = status && !authenticated && status.state !== "active";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-display font-bold text-lg text-accent">
            <span style={{ fontSize: 20 }}>▲</span> ZmartCredential
          </div>
          <h1 className="font-display text-3xl font-bold text-ink mt-3">Provider Onboarding</h1>
          {firstName && <p className="text-sm text-ink-light mt-1">Hello {firstName}, please complete your credentialing profile.</p>}
          {status?.organizationName && <p className="text-xs text-ink-faint mt-1">Requested by {status.organizationName}</p>}
        </div>

        {authenticated && (
          <div className="flex items-center gap-2 mb-6 justify-center flex-wrap">
            {STEPS.map((s, i) => {
              const idx = STEPS.indexOf(step);
              const isActive = s === step;
              const isPast = i < idx;
              return (
                <Fragment key={s}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: isActive || isPast ? "var(--accent)" : "var(--bg-soft-2)", color: isActive || isPast ? "white" : "var(--ink-light)" }}
                    >
                      {isPast ? <Icon name="Check" size={14} /> : i + 1}
                    </div>
                    <span className={"text-xs capitalize " + (isActive ? "font-semibold text-accent" : "text-ink-light")}>{s === "done" ? "Submitted" : s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ height: 1, width: 20, background: isPast ? "var(--accent)" : "var(--border)" }} />}
                </Fragment>
              );
            })}
          </div>
        )}

        {invalid && (
          <div className="card card-pad text-center">
            <Icon name="AlertCircle" size={32} className="mx-auto mb-3" style={{ color: "var(--danger)" }} />
            <h2 className="font-display text-xl font-bold text-ink">Invalid or expired link</h2>
            <p className="text-sm text-ink-light mt-2">This secure link does not exist or has been removed. Contact the organization that sent you this link.</p>
          </div>
        )}

        {!invalid && !status && <Loading />}

        {blocked && status.state === "submitted" && (
          <div className="card card-pad text-center">
            <Icon name="CheckCircle2" size={40} className="mx-auto mb-3" style={{ color: "var(--success)" }} />
            <h2 className="font-display text-xl font-bold text-ink">Profile already submitted</h2>
            <p className="text-sm text-ink-light mt-2">
              Thank you! Your profile was submitted{status.submittedAt ? " on " + fmtTs(status.submittedAt) : ""}. The credentialing team will reach out if any additional
              information is needed.
            </p>
          </div>
        )}

        {blocked && status.state !== "submitted" && (
          <div className="card card-pad text-center">
            <Icon name={status.state === "locked" ? "Lock" : "Clock"} size={32} className="mx-auto mb-3" style={{ color: "var(--danger)" }} />
            <h2 className="font-display text-xl font-bold text-ink">
              {status.state === "locked" ? "Link locked due to too many attempts" : status.state === "replaced" ? "This link has been replaced" : "This link has expired"}
            </h2>
            <p className="text-sm text-ink-light mt-2">
              {status.state === "locked"
                ? "For security, this link has been locked after too many failed PIN attempts. Contact the organization to request a new link."
                : status.state === "replaced"
                  ? "A newer link was sent to you. Please use the most recent email from your credentialing team."
                  : "Links expire 7 days after being sent. Please contact your credentialing team to request a new one."}
            </p>
          </div>
        )}

        {status?.state === "active" && !authenticated && (
          <div className="card card-pad">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                <Icon name="Shield" size={22} className="text-accent" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Enter your PIN</h2>
                <p className="text-sm text-ink-light">Check your email for the 6-digit PIN</p>
              </div>
            </div>
            <div className="mb-3">
              <label className="label" htmlFor="pin">6-digit PIN</label>
              <input
                id="pin"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setAuthError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") authenticate();
                }}
                className="input font-mono text-center tracking-widest"
                style={{ fontSize: 22, letterSpacing: 8 }}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
              {authError && (
                <div className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--danger)" }}>
                  <Icon name="AlertCircle" size={11} /> {authError}
                </div>
              )}
            </div>
            <button onClick={authenticate} disabled={pin.length !== 6 || busy} className="btn btn-primary w-full">
              {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="LogIn" size={13} />} Continue
            </button>
            <div className="text-xs text-ink-faint mt-4 text-center">Attempts remaining: {status.attemptsRemaining}</div>
          </div>
        )}

        {authenticated && profile && step === "profile" && (
          <div className="card card-pad">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Your Information</h2>
            <p className="text-sm text-ink-light mb-4">Confirm or update your professional details below.</p>
            <ProfileForm profile={profile} errors={profileErrors} onChange={(p) => { setProfile(p); setProfileErrors({}); }} />
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-line">
              <button onClick={() => setStep("docs")} disabled={!profileValid} className="btn btn-primary">
                Continue to Documents <Icon name="ArrowRight" size={13} />
              </button>
            </div>
          </div>
        )}

        {authenticated && step === "docs" && (
          <div className="card card-pad">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Upload Documents</h2>
            <p className="text-sm text-ink-light mb-4">
              {docs.length === 0
                ? "Your credentialing team already has every required document on file."
                : "Upload each required document. " + uploadedRequired + " of " + requiredDocs.length + " required documents uploaded."}
            </p>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocUploadRow
                  key={doc.docType}
                  doc={doc}
                  uploaded={uploaded[doc.docType]}
                  base={base}
                  pin={pin}
                  onUploaded={(u) => setUploaded((m) => ({ ...m, [doc.docType]: u }))}
                />
              ))}
            </div>
            <div className="flex justify-between gap-2 pt-4 border-t border-line mt-4">
              <button onClick={() => setStep("profile")} className="btn btn-secondary">
                <Icon name="ArrowLeft" size={13} /> Back
              </button>
              <button onClick={() => setStep("review")} disabled={uploadedRequired < requiredDocs.length} className="btn btn-primary">
                Review Submission <Icon name="ArrowRight" size={13} />
              </button>
            </div>
          </div>
        )}

        {authenticated && profile && info && step === "review" && (
          <div className="card card-pad">
            <h2 className="font-display text-xl font-bold text-ink mb-1">Review &amp; Submit</h2>
            <p className="text-sm text-ink-light mb-4">Please verify your information before submitting.</p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-soft)" }}>
                <div className="text-xs font-semibold text-ink mb-2">Personal Information</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-ink-faint">Name:</span> {info.firstName} {info.lastName}{profile.suffix ? ", " + profile.suffix : ""}</div>
                  <div><span className="text-ink-faint">NPI:</span> <span className="font-mono">{profile.npi}</span></div>
                  <div><span className="text-ink-faint">Specialty:</span> {profile.specialty || "—"}</div>
                  <div><span className="text-ink-faint">Phone:</span> {profile.phone || "—"}</div>
                  <div><span className="text-ink-faint">License:</span> <span className="font-mono">{profile.licenseNumber}{profile.licenseState ? " (" + profile.licenseState + ")" : ""}</span></div>
                  <div><span className="text-ink-faint">DEA:</span> <span className="font-mono">{profile.deaNumber || "—"}</span></div>
                </div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "var(--bg-soft)" }}>
                <div className="text-xs font-semibold text-ink mb-2">Documents ({Object.keys(uploaded).length} uploaded)</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(uploaded).map(([docType, u]) => (
                    <div key={docType} className="flex items-center gap-2">
                      <Icon name="CheckCircle2" size={11} style={{ color: "var(--success)" }} />
                      <span className="font-medium">{docs.find((d) => d.docType === docType)?.label || docType}:</span>
                      <span className="text-ink-light font-mono truncate">{u.fileName}</span>
                    </div>
                  ))}
                  {Object.keys(uploaded).length === 0 && <div className="text-ink-faint">No new documents uploaded.</div>}
                </div>
              </div>
              <div className="p-3 rounded text-xs" style={{ background: "var(--info-soft)", color: "#1e40af" }}>
                <Icon name="Info" size={11} className="inline mr-1" />
                By submitting, you certify that the information provided is true and accurate. The credentialing team will review within 2-3 business days.
              </div>
              {submitError && (
                <div className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm" style={{ background: "var(--danger-soft)", color: "#991b1b" }}>
                  <Icon name="AlertCircle" size={14} /> {submitError}
                </div>
              )}
              <div className="flex justify-between gap-2 pt-4 border-t border-line">
                <button onClick={() => setStep("docs")} className="btn btn-secondary" disabled={busy}>
                  <Icon name="ArrowLeft" size={13} /> Back
                </button>
                <button onClick={submitProfile} className="btn btn-primary" disabled={busy}>
                  {busy ? <span className="loader" style={{ borderTopColor: "white" }} /> : <Icon name="Send" size={13} />} Submit Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {authenticated && step === "done" && (
          <div className="card card-pad text-center">
            <Icon name="CheckCircle2" size={48} className="mx-auto mb-3" style={{ color: "var(--success)" }} />
            <h2 className="font-display text-2xl font-bold text-ink">Thank you!</h2>
            <p className="text-sm text-ink-light mt-2">
              Your profile has been submitted successfully. The credentialing team at {status?.organizationName || "this organization"} will contact you if any additional
              information is needed.
            </p>
          </div>
        )}

        {status && (
          <div className="mt-8 text-center text-[10px] text-ink-faint">Secure portal · Expires: {fmtDate(status.expiresAt)}</div>
        )}
      </div>
    </div>
  );
}

function ProfileForm({ profile, errors, onChange }: { profile: Profile; errors: Record<string, string>; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...profile, [k]: v });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="NPI Number" required error={errors.npi}>
          <input value={profile.npi} onChange={(e) => set("npi", e.target.value.replace(/\D/g, "").slice(0, 10))} className="input font-mono" placeholder="10 digits" inputMode="numeric" />
        </Field>
        <Field label="CAQH ID" required error={errors.caqhId}>
          <input value={profile.caqhId} onChange={(e) => set("caqhId", e.target.value.replace(/\D/g, "").slice(0, 10))} className="input font-mono" placeholder="8 digits" inputMode="numeric" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Credential" required error={errors.suffix}>
          <select value={profile.suffix} onChange={(e) => set("suffix", e.target.value)} className="input">
            <option value="">— Select —</option>
            {CREDENTIALS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Specialty" required error={errors.specialty}>
          <select value={profile.specialty} onChange={(e) => set("specialty", e.target.value)} className="input">
            <option value="">— Select —</option>
            {(profile.specialty && !SPECIALTIES.includes(profile.specialty) ? [profile.specialty, ...SPECIALTIES] : SPECIALTIES).map((sp) => (
              <option key={sp}>{sp}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phone" required error={errors.phone || (profile.phone && !PHONE_RE.test(profile.phone) ? "Phone must be 10 digits" : undefined)}>
          <input value={profile.phone} onChange={(e) => set("phone", digitsOnly(e.target.value, 10))} className="input font-mono" inputMode="numeric" placeholder="10 digits" />
        </Field>
        <Field label="Date of Birth" error={errors.dateOfBirth}>
          <input type="date" value={profile.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="input" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="License Number" required error={errors.licenseNumber} className="sm:col-span-2">
          <input value={profile.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} className="input font-mono" />
        </Field>
        <Field label="State" required error={errors.licenseState}>
          <select value={profile.licenseState} onChange={(e) => set("licenseState", e.target.value)} className="input">
            <option value="">—</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="License Expiration" required error={errors.licenseExpires}>
          <input type="date" value={profile.licenseExpires} onChange={(e) => set("licenseExpires", e.target.value)} className="input" />
        </Field>
        <Field label="DEA Number" error={errors.deaNumber}>
          <input value={profile.deaNumber} onChange={(e) => set("deaNumber", e.target.value.toUpperCase())} className="input font-mono" placeholder="(optional for mid-levels)" />
        </Field>
        <Field label="DEA Expiration" error={errors.deaExpires}>
          <input type="date" value={profile.deaExpires} onChange={(e) => set("deaExpires", e.target.value)} className="input" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="CAQH Username" required error={errors.caqhUsername}>
          <input value={profile.caqhUsername} onChange={(e) => set("caqhUsername", e.target.value.replace(/\s/g, ""))} className="input font-mono" maxLength={100} autoComplete="off" />
        </Field>
        <Field label="CAQH Password" required error={errors.caqhPassword}>
          <PasswordInput value={profile.caqhPassword} onChange={(e) => set("caqhPassword", e.target.value)} className="input font-mono" maxLength={200} autoComplete="new-password" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="PECOS Access Granted" required error={errors.pecosAccessGranted}>
          <select value={profile.pecosAccess} onChange={(e) => set("pecosAccess", e.target.value)} className="input">
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="PECOS User Name" required={profile.pecosAccess === "yes"} error={errors.pecosUsername}>
          <input value={profile.pecosUsername} onChange={(e) => set("pecosUsername", e.target.value.replace(/\s/g, ""))} className="input font-mono" maxLength={100} disabled={profile.pecosAccess !== "yes"} autoComplete="off" />
        </Field>
      </div>
    </div>
  );
}

/** One requested document: pick a file (+ expiration for expiring documents) and it is uploaded right away. */
function DocUploadRow({ doc, uploaded, base, pin, onUploaded }: { doc: PublicMissingDoc; uploaded?: Uploaded; base: string; pin: string; onUploaded: (u: Uploaded) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!ALLOWED_EXT.includes(fileExt(file.name))) return setError("This file type is not allowed");
    if (file.size > MAX_FILE_BYTES) return setError("File exceeds 25 MB");
    if (file.size === 0) return setError("File is empty");
    const form = new FormData();
    form.append("pin", pin);
    form.append("files", file, file.name);
    form.append("docType", doc.docType);
    form.append("expiresAt", expiresAt);
    setBusy(true);
    try {
      await api.upload<PublicUploadResult>(base + "/upload", form);
      onUploaded({ fileName: file.name, size: file.size });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ padding: 12 }}>
      <div className="flex items-center gap-3 flex-wrap">
        <Icon
          name={uploaded ? "CheckCircle2" : doc.critical ? "FileText" : "File"}
          size={20}
          style={{ color: uploaded ? "var(--success)" : doc.critical ? "var(--warn)" : "var(--ink-faint)" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink">{doc.label}</span>
            {doc.critical && <span className="text-[10px] font-semibold" style={{ color: "var(--danger)" }}>REQUIRED</span>}
            {doc.status === "expired" && !uploaded && <Pill type="danger">Expired</Pill>}
          </div>
          {uploaded ? (
            <div className="text-xs font-mono mt-0.5" style={{ color: "var(--success)" }}>
              {uploaded.fileName} ({Math.max(1, Math.round(uploaded.size / 1024))} KB)
            </div>
          ) : (
            <div className="text-xs text-ink-faint mt-0.5">No file uploaded</div>
          )}
        </div>
        {doc.expires && !uploaded && (
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-ink-light" htmlFor={"exp-" + doc.docType}>Expires</label>
            <input id={"exp-" + doc.docType} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="input input-sm" style={{ width: 150 }} disabled={busy} />
          </div>
        )}
        <button className="btn btn-secondary flex-shrink-0" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <span className="loader" /> : <Icon name="Upload" size={11} />} {uploaded ? "Replace" : "Upload"}
        </button>
        <input
          ref={ref}
          type="file"
          hidden
          accept={ALLOWED_EXT.map((e) => "." + e).join(",")}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {expiresAt && expiresAt < todayISO() && !uploaded && <div className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>This date is in the past</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
