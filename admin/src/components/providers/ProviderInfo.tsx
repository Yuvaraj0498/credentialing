"use client";

import type { ReactNode } from "react";
import { fmtDate } from "@/lib/utils";
import { ValField } from "./shared";
import type { ProviderDetail } from "@/types/providers";

const address = (street?: string | null, city?: string | null, state?: string | null, zip?: string | null) =>
  [street, [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join(", ") || null;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card card-pad">
      <h3 className="font-display font-semibold text-ink mb-4">{title}</h3>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
  );
}

/** Prototype ProviderInfo (L2202) — read-only profile, with the practice and billing details. */
export function ProviderInfo({ provider }: { provider: ProviderDetail }) {
  const x = provider.extra;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Personal Information">
        <ValField label="First Name" val={provider.firstName} />
        <ValField label="Last Name" val={provider.lastName} />
        <ValField label="Suffix" val={provider.suffix} />
        <ValField label="Specialty" val={provider.specialty} />
        <ValField label="Email" val={provider.email} />
        <ValField label="Ph.No" val={provider.phone} />
        <ValField label="Date of Birth" val={provider.dateOfBirth ? fmtDate(provider.dateOfBirth) : null} />
        <ValField label="SSN" val={x?.hasSsn ? "•••-••-" + (x.ssnLast4 || "••••") : null} />
        <ValField label="Home Address" val={address(x?.homeAddress, x?.homeCity, x?.homeState, x?.homeZip)} />
        <ValField label="Ph.No Listed in Medicare" val={x?.medicarePhone} />
      </Card>
      <Card title="Credentials">
        <ValField label="NPI" val={provider.npi} />
        <ValField label="Group Name" val={x?.groupName} />
        <ValField label="Group NPI" val={x?.groupNpi} />
        <ValField label="Tax ID" val={x?.taxId} />
        <ValField label="Taxonomy Code" val={x?.taxonomyCode ?? provider.taxonomyCode} />
        <ValField label="License Number" val={provider.licenseNumber} />
        <ValField label="License State" val={provider.licenseState} />
        <ValField label="License Expires" val={provider.licenseExpires ? fmtDate(provider.licenseExpires) : null} />
        <ValField label="DEA Number" val={provider.deaNumber} />
        <ValField label="DEA Expires" val={provider.deaExpires ? fmtDate(provider.deaExpires) : null} />
        <ValField label="Driving License" val={x?.drivingLicense} />
        <ValField label="Medicaid Number" val={x?.medicaidNumber} />
        <ValField label="Medicare PTAN" val={x?.medicarePtan} />
        <ValField label="PECOS Password" val={x?.hasPecosPassword ? "••••••••" : null} />
        <ValField label="Board Certification" val={provider.boardCert} />
        <ValField label="Malpractice Carrier" val={provider.malpracticeCarrier} />
      </Card>
      <Card title="Practice Information">
        <ValField label="Practice Legal Name" val={x?.practiceLegalName} />
        <ValField label="Practice DBA Name" val={x?.practiceDbaName} />
        <ValField label="Practice Owner Name" val={x?.practiceOwnerName} />
        <ValField label="Practice Manager / Administrator" val={[x?.practiceManagerName, x?.practiceManagerContact].filter(Boolean).join(" · ") || null} />
        <ValField label="Practice Address" val={address(x?.practiceAddress, x?.practiceCity, x?.practiceState, x?.practiceZip)} />
        <ValField label="Practice Ph.No" val={x?.practicePhone} />
        <ValField label="Practice Fax Number" val={x?.practiceFax} />
        <ValField label="Practice Email" val={x?.practiceEmail} />
        <ValField label="Date Started at This Address" val={x?.practiceStartDate ? fmtDate(x.practiceStartDate) : null} />
        <ValField label="Office Hours" val={x?.officeHours} />
      </Card>
      <Card title="Billing Information">
        <ValField label="Billing Address" val={address(x?.billingAddress, x?.billingCity, x?.billingState, x?.billingZip)} />
        <ValField label="Billing Ph.No" val={x?.billingPhone} />
        <ValField label="Billing Fax Number" val={x?.billingFax} />
        <ValField label="Billing Email" val={x?.billingEmail} />
        <ValField label="Billing Contact Person" val={x?.billingContactPerson} />
      </Card>
    </div>
  );
}
