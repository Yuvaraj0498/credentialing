"use client";

import { useState } from "react";
import { AlertBox } from "@/components/AlertBox";
import { Loading } from "@/components/AsyncState";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { api, errorMessage } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { fmtDate } from "@/lib/utils";
import type { Payer, RevealResponse } from "@/types/payers";
import type { ProviderDetail } from "@/types/providers";
import type { PayerSubmission, PortalLoginOutcome, PortalLoginResult } from "@/types/submissions";

const OUTCOME: Record<PortalLoginOutcome, { title: string; icon: string; bg: string; color: string }> = {
  logged_in: { title: "Signed in to the portal", icon: "CheckCircle2", bg: "var(--success-soft)", color: "#065f46" },
  mfa_required: { title: "Verification code required", icon: "ShieldAlert", bg: "var(--warn-soft)", color: "#92400e" },
  captcha: { title: "CAPTCHA required", icon: "ShieldAlert", bg: "var(--warn-soft)", color: "#92400e" },
  login_failed: { title: "Sign-in failed", icon: "XCircle", bg: "var(--danger-soft)", color: "#991b1b" },
  no_login_form: { title: "No sign-in form found", icon: "AlertTriangle", bg: "var(--danger-soft)", color: "#991b1b" },
  error: { title: "Portal could not be reached", icon: "AlertTriangle", bg: "var(--danger-soft)", color: "#991b1b" },
};

/**
 * "Submit for {provider}": the server signs in to the payer's portal with the stored login (headless browser) and this
 * panel shows what the portal returned — outcome, page title/address and a screenshot. Staff then record the outcome.
 */
export function PortalSubmissionModal({
  payer,
  providerId,
  username,
  credentialId,
  submission,
  result,
  running,
  error,
  onRetry,
  onRecordOutcome,
  onClose,
}: {
  payer: Payer;
  providerId: number;
  username: string;
  credentialId: number;
  submission: PayerSubmission | null;
  result: PortalLoginResult | null;
  running: boolean;
  error: string | null;
  onRetry: () => void;
  onRecordOutcome: () => void;
  onClose: () => void;
}) {
  const provider = useAsync<ProviderDetail>(() => api.get<ProviderDetail>("/providers/" + providerId), [providerId]);
  const [login, setLogin] = useState<RevealResponse | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [bigShot, setBigShot] = useState(false);

  const copy = (key: string, value: string | null | undefined) => {
    if (!value) return;
    const done = () => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    };
    // Fallback for browsers that block the async clipboard API.
    const legacyCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) done();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, legacyCopy);
    else legacyCopy();
  };

  const revealLogin = async () => {
    setLoginError(null);
    try {
      setLogin(await api.post<RevealResponse>("/payer-credentials/" + credentialId + "/reveal"));
    } catch (e) {
      setLoginError(errorMessage(e));
    }
  };

  const row = (k: string, label: string, value: string | null | undefined, opts: { mono?: boolean; secret?: boolean } = {}) => (
    <CopyRow key={k} label={label} value={value} mono={opts.mono} secret={opts.secret} shown={showPw} copied={copied === k} onToggle={() => setShowPw((v) => !v)} onCopy={() => copy(k, value)} />
  );

  const p = provider.data;
  const o = result ? OUTCOME[result.outcome] : null;
  const portalUrl = result?.portalUrl || login?.portalUrl || payer.portalUrl;

  return (
    <Modal title={"Submit to " + payer.name} subtitle={"Application for " + (p ? p.firstName + " " + p.lastName : "the provider")} onClose={onClose} maxWidth={760}>
      <div className="space-y-4">
        {/* 1. automatic sign-in */}
        {running ? (
          <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: "var(--info-soft)" }}>
            <span className="loader" />
            <div className="text-sm text-ink">
              <div className="font-semibold">
                {submission ? "Signing in to the " + payer.name + " portal as " + username + "…" : "Starting the submission…"}
              </div>
              <div className="text-xs text-ink-light mt-0.5">The server opens the portal in a browser and signs in. This can take up to a minute.</div>
            </div>
          </div>
        ) : error ? (
          <AlertBox type="danger">{error}</AlertBox>
        ) : result && o ? (
          <div className="rounded-lg overflow-hidden border border-line">
            <div className="p-3 flex items-start gap-2" style={{ background: o.bg, color: o.color }}>
              <Icon name={o.icon} size={18} style={{ marginTop: 1 }} />
              <div className="flex-1 text-sm">
                <div className="font-semibold">{o.title}</div>
                <div className="text-xs mt-0.5">{result.message}</div>
              </div>
              <span className="text-[10px] font-mono">{(result.durationMs / 1000).toFixed(1)}s</span>
            </div>
            <div className="p-3 space-y-2 bg-paper">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="min-w-0">
                  <span className="text-ink-faint">Signed in as: </span>
                  <span className="font-mono">{result.username}</span> <span className="text-ink-faint">({result.loginLevel} login)</span>
                </div>
                <div className="min-w-0 truncate">
                  <span className="text-ink-faint">Page title: </span>
                  {result.pageTitle || "—"}
                </div>
                <div className="sm:col-span-2 min-w-0 truncate">
                  <span className="text-ink-faint">Page address: </span>
                  <span className="font-mono">{result.finalUrl || "—"}</span>
                </div>
              </div>
              {result.screenshot && (
                <button type="button" onClick={() => setBigShot((v) => !v)} className="block w-full text-left" title={bigShot ? "Shrink" : "Enlarge"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={"data:image/png;base64," + result.screenshot}
                    alt={"What the " + payer.name + " portal showed after signing in"}
                    className="w-full rounded border border-line"
                    style={{ maxHeight: bigShot ? "none" : 260, objectFit: "cover", objectPosition: "top" }}
                  />
                  <span className="text-[10px] text-ink-faint">Screenshot of the portal after the sign-in — click to {bigShot ? "shrink" : "enlarge"}</span>
                </button>
              )}
              {result.pageText && (
                <details className="text-[11px] text-ink-light">
                  <summary className="cursor-pointer">Page text</summary>
                  <div className="mt-1 p-2 rounded" style={{ background: "var(--bg-soft)" }}>{result.pageText}</div>
                </details>
              )}
            </div>
          </div>
        ) : null}

        {/* 2. login + provider details for finishing the application */}
        <div>
          <div className="text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
            <Icon name="KeyRound" size={13} className="text-accent" /> Portal login
            {portalUrl && (
              <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-accent font-normal hover:underline">
                <Icon name="ExternalLink" size={11} /> Open portal yourself
              </a>
            )}
          </div>
          {login ? (
            <div className="card px-3">
              {row("user", "Username", login.username, { mono: true })}
              {row("pw", "Password", login.password, { mono: true, secret: true })}
              {login.payerProviderId && row("ppid", "Payer provider ID", login.payerProviderId, { mono: true })}
              {login.groupTin && row("tin", "Group TIN", login.groupTin, { mono: true })}
            </div>
          ) : (
            <div className="card px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <span>
                <span className="font-mono">{username}</span> <span className="text-ink-faint">· password stored encrypted</span>
              </span>
              <button className="btn btn-secondary" style={{ fontSize: 11, padding: "3px 8px" }} onClick={revealLogin}>
                <Icon name="Eye" size={11} /> Show login
              </button>
            </div>
          )}
          {loginError && <div className="text-xs mt-1" style={{ color: "var(--danger)" }}>{loginError}</div>}
        </div>

        <div>
          <div className="text-xs font-semibold text-ink mb-1 flex items-center gap-1.5">
            <Icon name="User" size={13} className="text-accent" /> Provider details for the application
          </div>
          {provider.error ? (
            <AlertBox type="danger">{provider.error}</AlertBox>
          ) : !p ? (
            <Loading />
          ) : (
            <div className="card px-3">
              {row("name", "Name", [p.firstName, p.lastName].join(" ") + (p.suffix ? ", " + p.suffix : ""))}
              {row("npi", "NPI", p.npi, { mono: true })}
              {row("caqh", "CAQH ID", p.caqhId, { mono: true })}
              {row("spec", "Specialty", p.specialty)}
              {row("tax", "Taxonomy", p.taxonomyCode, { mono: true })}
              {row("lic", "License", p.licenseNumber ? p.licenseNumber + (p.licenseState ? " (" + p.licenseState + ")" : "") : null, { mono: true })}
              {row("licexp", "License expires", p.licenseExpires ? fmtDate(p.licenseExpires) : null)}
              {row("dea", "DEA", p.deaNumber, { mono: true })}
              {row("email", "Email", p.email)}
              {row("phone", "Phone", p.phone, { mono: true })}
              {row("prac", "Practice / Location", [p.practiceName, p.locationName].filter(Boolean).join(" · ") || null)}
            </div>
          )}
        </div>

        {submission && (
          <div className="p-3 rounded text-[11px] text-ink-light" style={{ background: "var(--bg-soft)" }}>
            <Icon name="Info" size={11} className="inline mr-1" />
            Submission #{submission.id}. Signing in does not fill in the payer&apos;s application — finish it in the portal, then record the payer&apos;s confirmation number. A
            submitted outcome also moves the provider&apos;s enrollment with {payer.name} to Submitted. Sign-ins and password reveals are recorded in the audit log.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary" disabled={running}>Close</button>
          {submission && (
            <button onClick={onRetry} className="btn btn-secondary" disabled={running}>
              <Icon name="RefreshCw" size={13} /> Retry sign-in
            </button>
          )}
          {submission && (
            <button onClick={onRecordOutcome} className="btn btn-primary" disabled={running}>
              <Icon name="ClipboardCheck" size={13} /> Record outcome
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CopyRow({
  label,
  value,
  mono,
  secret,
  shown,
  copied,
  onToggle,
  onCopy,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  secret?: boolean;
  shown: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-line last:border-0">
      <div className="text-[11px] text-ink-faint w-32 flex-shrink-0">{label}</div>
      <div className={"flex-1 min-w-0 text-sm text-ink truncate " + (mono ? "font-mono" : "")}>
        {value ? (secret && !shown ? "••••••••••" : value) : <span className="text-ink-faint">—</span>}
      </div>
      {secret && value && (
        <button className="btn-ghost p-1" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"}>
          <Icon name={shown ? "EyeOff" : "Eye"} size={12} />
        </button>
      )}
      {value && (
        <button className="btn-ghost p-1" onClick={onCopy} aria-label={"Copy " + label} title={"Copy " + label}>
          <Icon name={copied ? "Check" : "Copy"} size={12} style={copied ? { color: "var(--success)" } : undefined} />
        </button>
      )}
    </div>
  );
}
