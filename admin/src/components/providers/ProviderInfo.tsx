"use client";

import { fmtDate } from "@/lib/utils";
import { ValField } from "./shared";
import type { ProviderDetail } from "@/types/providers";

/** Prototype ProviderInfo (L2202) — read-only profile. */
export function ProviderInfo({ provider }: { provider: ProviderDetail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-4">Personal Information</h3>
        <div className="space-y-3 text-sm">
          <ValField label="First Name" val={provider.firstName} />
          <ValField label="Last Name" val={provider.lastName} />
          <ValField label="Suffix" val={provider.suffix} />
          <ValField label="Specialty" val={provider.specialty} />
          <ValField label="Email" val={provider.email} />
          <ValField label="Phone" val={provider.phone} />
        </div>
      </div>
      <div className="card card-pad">
        <h3 className="font-display font-semibold text-ink mb-4">Credentials</h3>
        <div className="space-y-3 text-sm">
          <ValField label="NPI" val={provider.npi} />
          <ValField label="License Number" val={provider.licenseNumber} />
          <ValField label="License State" val={provider.licenseState} />
          <ValField label="License Expires" val={provider.licenseExpires ? fmtDate(provider.licenseExpires) : null} />
          <ValField label="DEA Number" val={provider.deaNumber} />
          <ValField label="DEA Expires" val={provider.deaExpires ? fmtDate(provider.deaExpires) : null} />
          <ValField label="Board Certification" val={provider.boardCert} />
          <ValField label="Malpractice Carrier" val={provider.malpracticeCarrier} />
        </div>
      </div>
    </div>
  );
}
