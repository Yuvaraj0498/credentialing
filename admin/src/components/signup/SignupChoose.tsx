"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";

const ORG_BULLETS = ["Manage unlimited providers", "All 8 payer enrollments", "AI-powered credentialing", "CAQH integration", "Choose your subscription plan"];
const PROVIDER_BULLETS = ["Free for individual providers", "Upload credentialing documents", "Track enrollment status", "Get notified about expirations", "Link to your organization"];

export function SignupChoose() {
  return (
    <div className="min-h-screen flex items-center justify-center py-8" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)" }}>
      <div className="w-full max-w-3xl px-4">
        <div className="text-center mb-8">
          <div className="atano-logo text-3xl mb-3"><span className="a-mark">▲</span>ZmartCredential</div>
          <h1 className="font-display text-4xl font-bold text-ink">Create your account</h1>
          <p className="text-ink-light mt-2">Choose how you&apos;ll use ZmartCredential</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/signup/org" className="card card-hover text-left p-6 block">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Icon name="Building2" size={26} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">I&apos;m an Organization</h2>
            <p className="text-sm text-ink-light mb-4">Hospital, clinic, group practice, or credentialing service. Manage multiple providers, payer enrollments, and credentialing operations.</p>
            <ul className="space-y-1.5 text-xs text-ink mb-4">
              {ORG_BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-2"><Icon name="Check" size={12} style={{ color: "var(--success)" }} /> {b}</li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-accent font-medium text-sm">
              Get Started <Icon name="ArrowRight" size={14} />
            </div>
          </Link>

          <Link href="/signup/provider" className="card card-hover text-left p-6 block">
            <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-4" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
              <Icon name="UserCheck" size={26} />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink mb-2">I&apos;m a Provider</h2>
            <p className="text-sm text-ink-light mb-4">Physician, NP, PA, therapist, or other healthcare provider. Check your credentialing status and upload documents.</p>
            <ul className="space-y-1.5 text-xs text-ink mb-4">
              {PROVIDER_BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-2"><Icon name="Check" size={12} style={{ color: "var(--success)" }} /> {b}</li>
              ))}
            </ul>
            <div className="flex items-center gap-2 font-medium text-sm" style={{ color: "#1d4ed8" }}>
              Get Started <Icon name="ArrowRight" size={14} />
            </div>
          </Link>
        </div>

        <div className="text-center mt-6">
          <Link href="/signin" className="text-xs text-ink-light hover:text-ink">
            <Icon name="ChevronLeft" size={11} className="inline" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
