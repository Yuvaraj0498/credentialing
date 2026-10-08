"use client";

import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { SUBMISSION_METHOD_INFO } from "@/lib/constants";
import type { Payer } from "@/types/payers";

/** Prototype v2 PayerDetailModal — full submission guide for one payer. */
export function PayerDetailModal({ payer, onClose }: { payer: Payer; onClose: () => void }) {
  const info = SUBMISSION_METHOD_INFO[payer.submissionMethod];
  const color = info?.color || "#cbd5e1";
  return (
    <Modal title={payer.fullName || payer.name} subtitle={payer.category} onClose={onClose} maxWidth={620}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
          <Icon name={info?.icon || "HelpCircle"} size={24} style={{ color }} />
          <div className="flex-1">
            <div className="font-semibold text-sm text-ink">{info?.label || payer.submissionMethod}</div>
            <div className="text-xs text-ink-light mt-1">{info?.description}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card card-pad">
            <div className="text-[10px] text-ink-faint uppercase font-semibold tracking-wider">Direct API Available</div>
            <div className="font-display font-bold text-lg mt-1">{payer.apiAvailable ? "✓ Yes" : "✗ No"}</div>
            <div className="text-xs text-ink-light mt-1">{payer.apiAvailable ? "Developer API program exists" : "No public enrollment API"}</div>
          </div>
          <div className="card card-pad">
            <div className="text-[10px] text-ink-faint uppercase font-semibold tracking-wider">Average TAT</div>
            <div className="font-display font-bold text-lg mt-1">{payer.avgTatDays != null ? payer.avgTatDays + " days" : "—"}</div>
            <div className="text-xs text-ink-light mt-1">Enrollment approval time</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-ink-faint uppercase font-semibold tracking-wider mb-1">Application Form</div>
          <div className="text-sm text-ink">{payer.appForm || "—"}</div>
        </div>

        {payer.apiVendor && (
          <div>
            <div className="text-[10px] text-ink-faint uppercase font-semibold tracking-wider mb-1">Integration Vendor</div>
            <div className="text-sm text-ink">{payer.apiVendor}</div>
          </div>
        )}

        <div className="space-y-2">
          {payer.portalUrl && <UrlRow icon="Globe" label="Provider Portal" url={payer.portalUrl} />}
          {payer.apiDocsUrl && <UrlRow icon="Code" label="API Documentation" url={payer.apiDocsUrl} iconColor="var(--success)" />}
        </div>

        {payer.submissionNotes && (
          <div className="p-3 rounded-lg text-xs" style={{ background: "var(--bg-soft)" }}>
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <Icon name="BookOpen" size={11} style={{ color: "var(--info)" }} />
              Submission Notes
            </div>
            <div className="text-ink-light leading-relaxed">{payer.submissionNotes}</div>
          </div>
        )}

        {info && (
          <div className="p-3 rounded-lg text-xs" style={{ background: "var(--warn-soft)", color: "#92400e" }}>
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <Icon name="Send" size={11} />
              Recommended workflow
            </div>
            <div className="leading-relaxed">{info.workflow.replace("{payer}", payer.name)}</div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  );
}

function UrlRow({ icon, label, url, iconColor }: { icon: string; label: string; url: string; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded border border-line">
      <Icon name={icon} size={13} style={{ color: iconColor || "var(--ink-light)" }} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold text-ink-faint uppercase">{label}</div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline font-mono truncate block">
          {url}
        </a>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-xs" aria-label={"Open " + label}>
        <Icon name="ExternalLink" size={11} />
      </a>
    </div>
  );
}
