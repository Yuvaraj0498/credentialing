// Status maps and option lists from the prototype.

export const STATUS: Record<string, { label: string; pill: string; icon: string }> = {
  draft: { label: "Pending", pill: "warn", icon: "Circle" },
  in_progress: { label: "In Progress", pill: "info", icon: "Loader" },
  submitted: { label: "Submitted", pill: "info", icon: "Send" },
  approved: { label: "Approved", pill: "success", icon: "CheckCircle2" },
  needs_attention: { label: "Needs Attention", pill: "danger", icon: "AlertCircle" },
  on_hold: { label: "On Hold", pill: "warn", icon: "PauseCircle" },
  terminated: { label: "Terminated", pill: "danger", icon: "XCircle" },
};

export const PROVIDER_STATUS: Record<string, { label: string; pill: string }> = {
  active: { label: "Active", pill: "success" },
  draft: { label: "Pending", pill: "warn" },
  in_progress: { label: "In Progress", pill: "info" },
  pending: { label: "Pending", pill: "warn" },
  on_hold: { label: "On Hold", pill: "warn" },
  inactive: { label: "Inactive", pill: "neutral" },
  terminated: { label: "Terminated", pill: "danger" },
};

export const DOC_STATUS: Record<string, { label: string; pill: string }> = {
  approved: { label: "Approved", pill: "success" },
  missing: { label: "Missing", pill: "neutral" },
  expired: { label: "Expired", pill: "danger" },
  pending_review: { label: "Pending Review", pill: "warn" },
  na: { label: "N/A", pill: "neutral" },
};

export const ROLE_PILL: Record<string, string> = {
  platform_admin: "danger",
  org_admin: "accent",
  admin: "accent",
  clerk: "info",
  provider: "success",
  auditor: "neutral",
};

export const ROLE_LABEL: Record<string, string> = {
  platform_admin: "Platform Admin",
  org_admin: "Org Admin",
  clerk: "Credentialing Clerk",
  provider: "Provider",
  auditor: "Auditor",
};

export const SUFFIXES = ["MD", "DO", "NP", "PA", "DDS", "PhD", "LCSW", "LPC", "BCBA", "RN"];

export const SPECIALTIES = [
  "Family Medicine", "Internal Medicine", "Pediatrics", "Cardiology", "Interventional Cardiology", "Psychiatry",
  "OB/GYN", "Orthopedic Surgery", "Emergency Medicine", "Anesthesiology", "Radiology", "Dermatology",
  "Electrophysiology", "Cardiologist", "Applied Behavior Analysis", "Other",
];

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];

/** Payer submission method categories (prototype v2 SUBMISSION_METHOD_INFO, Payer API Reference page). */
export const SUBMISSION_METHOD_INFO: Record<string, { label: string; icon: string; color: string; description: string; workflow: string }> = {
  caqh_roster: {
    label: "CAQH Roster Download",
    icon: "DownloadCloud",
    color: "var(--info)",
    description:
      "Payer pulls provider data from CAQH ProView periodically. Submit by ensuring provider CAQH profile is complete and attested, then the payer syncs via roster download. No direct API from your system to payer.",
    workflow:
      "1. Ensure provider's CAQH ProView profile is complete and attested within 120 days. 2. Submit roster request to {payer} via their portal or email. 3. Payer pulls from CAQH on their roster cycle (weekly or monthly).",
  },
  availity: {
    label: "Availity Essentials",
    icon: "Globe",
    color: "#f97316",
    description:
      "Clearinghouse used by many commercial payers (Anthem BCBS, Humana, Centene/Superior, others). Has REST API program for eligibility, claims, and some enrollment workflows. Register at availity.com for vendor API access.",
    workflow:
      "1. Register as an organization on availity.com if not already. 2. Submit enrollment via Availity Essentials portal. 3. For bulk/automated submissions, apply for Availity API access (requires vendor agreement).",
  },
  pecos: {
    label: "CMS PECOS",
    icon: "Shield",
    color: "#1e40af",
    description:
      "Medicare's Provider Enrollment, Chain and Ownership System. Web portal only — no public enrollment API. CMS-855I/B/O forms submitted electronically through pecos.cms.hhs.gov. Approval 60-90 days.",
    workflow:
      "1. Create or log into PECOS account. 2. Complete CMS-855I (individual) or CMS-855B (group) form online. 3. Submit supporting documents. 4. Pay application fee (~$688 as of 2026). 5. Expect 60-90 day approval.",
  },
  state_portal: {
    label: "State Medicaid Portal",
    icon: "Building2",
    color: "#0f766e",
    description:
      "Each state operates its own Medicaid enrollment system. ~50 different interfaces. Texas = TMHP, Illinois = IMPACT, California = PAVE, etc. Mostly web portal; few state APIs.",
    workflow:
      "1. Register at the state Medicaid portal. 2. Complete state-specific enrollment application. 3. Submit required documents (varies by state). 4. Allow 60-120 days for approval.",
  },
  direct_api: {
    label: "Direct Payer API",
    icon: "Zap",
    color: "var(--success)",
    description:
      "Payer offers a direct REST/FHIR API for enrollment submission. Rare for US commercial payers — only a few offer this (UHC/Optum developer, Humana developer). Usually requires signed vendor agreement + authentication.",
    workflow: "Enrollment via direct REST/FHIR API — requires signed vendor agreement with payer. Contact your payer representative for API credentials.",
  },
  portal_only: {
    label: "Payer Portal Only",
    icon: "Monitor",
    color: "var(--ink-light)",
    description:
      "Submit via the payer's web portal, often with CAQH as the source of truth. Common for smaller plans and MCOs. Manual data entry or roster upload.",
    workflow: "Manual data entry in the payer's web portal. Use CAQH data as source of truth and copy fields over.",
  },
};

/**
 * Prototype v3 PRIVATE_PAYERS: payers whose portal logins / CAQH access are managed per provider (commercial plans, MCOs,
 * Medicare Advantage, behavioral health). Excludes Medicare (PECOS), state Medicaid and TRICARE / VA.
 * Same rule as the backend (EnrollmentSupport.isPrivatePayer).
 */
export const PRIVATE_PAYER_CATEGORIES = ["Commercial", "Commercial (HMO)", "Medicaid MCO", "Medicare Advantage", "Behavioral Health"];
export const isPrivatePayer = (p: { category: string | null }) => !!p.category && PRIVATE_PAYER_CATEGORIES.includes(p.category);
