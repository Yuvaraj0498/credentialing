// CAQH CSV parsers — ported 1:1 from the prototype (parseCaqhCsv L9036, mapField L9063, parseBulkCsv L9654).
import type { ImportProviderRow } from "@/types/caqh";

export { SAMPLE_CSV, SAMPLE_BULK_CSV } from "./csvSamples";

/** Fields extracted from a single-provider CAQH ProView export. */
export interface CaqhParsed {
  caqhId?: string;
  npi?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  specialty?: string;
  taxonomy?: string;
  dob?: string;
  gender?: string;
  email?: string;
  phone?: string;
  practiceAddress?: string;
  practiceCity?: string;
  practiceState?: string;
  practiceZip?: string;
  practicePhone?: string;
  medSchoolGrad?: string;
  medicalSchool?: string;
  residency?: string;
  residencyCompletion?: string;
  boardCertExpiration?: string;
  boardCertDate?: string;
  boardCert?: string;
  license?: string;
  licenseState?: string;
  licenseIssued?: string;
  licenseExpiration?: string;
  licenseStatus?: string;
  deaSchedules?: string;
  deaIssued?: string;
  deaExpiration?: string;
  dea?: string;
  malpracticeCarrier?: string;
  malpracticePolicy?: string;
  malpracticeLimit?: string;
  malpracticeAggregate?: string;
  malpracticeEffective?: string;
  malpracticeExpiration?: string;
  lastAttestation?: string;
  attestationStatus?: string;
  profileStatus?: string;
}

// CAQH CSV parser — handles both Field,Value and column-row formats
export function parseCaqhCsv(text: string): CaqhParsed {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const data: CaqhParsed = {};
  if (lines.length === 0) throw new Error("File is empty");

  // Detect format: Field,Value vertical or columnar
  const headerLine = lines[0].toLowerCase();
  const isVertical = headerLine.startsWith("field,value") || headerLine.startsWith("field;value");

  if (isVertical) {
    lines.slice(1).forEach((line) => {
      // Handle quoted commas
      const match = line.match(/^("([^"]*)"|([^,]*)),(.*)$/);
      if (!match) return;
      const key = (match[2] || match[3] || "").trim();
      const value = match[4].trim().replace(/^"|"$/g, "");
      mapField(data, key, value);
    });
  } else {
    // Columnar: header row + 1 data row
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const values = lines[1] ? lines[1].split(",").map((v) => v.trim().replace(/^"|"$/g, "")) : [];
    headers.forEach((h, i) => mapField(data, h, values[i] || ""));
  }

  return data;
}

export function mapField(data: CaqhParsed, key: string, value: string): void {
  if (!value) return;
  const k = key.toLowerCase().trim();
  // Map common CAQH field names → our schema
  if (k.includes("caqh provider id") || k === "caqh id") data.caqhId = value;
  else if (k === "npi") data.npi = value;
  else if (k === "first name") data.firstName = value;
  else if (k === "middle name") data.middleName = value;
  else if (k === "last name") data.lastName = value;
  else if (k === "suffix" || k === "credential") data.suffix = value;
  else if (k.includes("primary specialty") || k === "specialty") data.specialty = value;
  else if (k.includes("taxonomy")) data.taxonomy = value;
  else if (k.includes("date of birth") || k === "dob") data.dob = value;
  else if (k === "gender") data.gender = value;
  else if (k === "email") data.email = value;
  else if (k === "phone") data.phone = value;
  else if (k.includes("practice address")) data.practiceAddress = value;
  else if (k.includes("practice city")) data.practiceCity = value;
  else if (k.includes("practice state")) data.practiceState = value;
  else if (k.includes("practice zip")) data.practiceZip = value;
  else if (k.includes("practice phone")) data.practicePhone = value;
  else if (k.includes("medical school graduation")) data.medSchoolGrad = value;
  else if (k.includes("medical school")) data.medicalSchool = value;
  else if (k.includes("residency program")) data.residency = value;
  else if (k.includes("residency completion")) data.residencyCompletion = value;
  else if (k.includes("board certification 1") && k.includes("expiration")) data.boardCertExpiration = value;
  else if (k.includes("board certification 1") && k.includes("date")) data.boardCertDate = value;
  else if (k.includes("board certification 1")) data.boardCert = value;
  else if (k.includes("primary license number") || k.includes("license number")) data.license = value;
  else if (k.includes("primary license state") || k.includes("license state")) data.licenseState = value;
  else if (k.includes("primary license issued") || k.includes("license issued")) data.licenseIssued = value;
  else if (k.includes("primary license expiration") || k.includes("license expiration")) data.licenseExpiration = value;
  else if (k.includes("primary license status") || k.includes("license status")) data.licenseStatus = value;
  else if (k.includes("dea schedules")) data.deaSchedules = value;
  else if (k.includes("dea issued")) data.deaIssued = value;
  else if (k.includes("dea expiration")) data.deaExpiration = value;
  else if (k === "dea number" || k === "dea") data.dea = value;
  else if (k.includes("malpractice carrier")) data.malpracticeCarrier = value;
  else if (k.includes("malpractice policy")) data.malpracticePolicy = value;
  else if (k.includes("malpractice limit per occurrence")) data.malpracticeLimit = value;
  else if (k.includes("malpractice limit aggregate")) data.malpracticeAggregate = value;
  else if (k.includes("malpractice effective")) data.malpracticeEffective = value;
  else if (k.includes("malpractice expiration")) data.malpracticeExpiration = value;
  else if (k.includes("last attestation")) data.lastAttestation = value;
  else if (k.includes("attestation status")) data.attestationStatus = value;
  else if (k.includes("profile status")) data.profileStatus = value;
}

/** One parsed row of a bulk roster CSV. */
export interface BulkRow {
  rowIndex: number;
  errors: string[];
  valid: boolean;
  caqhId?: string;
  npi?: string;
  firstName?: string;
  lastName?: string;
  suffix?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  license?: string;
  licenseState?: string;
  licenseExpiration?: string;
  dea?: string;
  deaExpiration?: string;
  malpracticeCarrier?: string;
  malpracticeExpiration?: string;
  profileStatus?: string;
  lastAttestation?: string;
  authStatus?: string;
}

// Parse multi-row CSV with header row
export function parseBulkCsv(text: string): BulkRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("File must have a header row and at least one data row");

  // Split CSV respecting quoted fields
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else current += c;
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());

  return lines.slice(1).map((line, idx) => {
    const values = splitLine(line);
    const row: BulkRow = { rowIndex: idx + 2, errors: [], valid: false }; // row 1 is header
    headers.forEach((h, i) => {
      const v = (values[i] || "").trim();
      if (h.includes("caqh provider id") || h === "caqh id") row.caqhId = v;
      else if (h === "npi") row.npi = v;
      else if (h === "first name") row.firstName = v;
      else if (h === "last name") row.lastName = v;
      else if (h === "suffix") row.suffix = v;
      else if (h === "specialty" || h.includes("primary specialty")) row.specialty = v;
      else if (h === "email") row.email = v;
      else if (h === "phone") row.phone = v;
      else if (h.includes("license number")) row.license = v;
      else if (h.includes("license state")) row.licenseState = v;
      else if (h.includes("license expiration")) row.licenseExpiration = v;
      else if (h === "dea number" || h === "dea") row.dea = v;
      else if (h.includes("dea expiration")) row.deaExpiration = v;
      else if (h.includes("malpractice carrier")) row.malpracticeCarrier = v;
      else if (h.includes("malpractice expiration")) row.malpracticeExpiration = v;
      else if (h.includes("profile status")) row.profileStatus = v;
      else if (h.includes("last attestation") || h.includes("attestation date")) row.lastAttestation = v;
      else if (h.includes("authorization status")) row.authStatus = v;
    });

    // Validate
    if (!row.firstName || !row.lastName) row.errors.push("Missing name");
    if (!row.npi || row.npi.length !== 10) row.errors.push("Invalid NPI");
    if (row.email && !/.+@.+\..+/.test(row.email)) row.errors.push("Invalid email");
    row.valid = row.errors.length === 0;

    return row;
  });
}

const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

/** Single-export parse result → POST /providers/import row. */
export function parsedToImportRow(p: CaqhParsed): ImportProviderRow {
  return {
    rowIndex: 1,
    caqhId: clean(p.caqhId),
    npi: clean(p.npi),
    firstName: clean(p.firstName),
    middleName: clean(p.middleName),
    lastName: clean(p.lastName),
    suffix: clean(p.suffix),
    specialty: clean(p.specialty),
    taxonomy: clean(p.taxonomy),
    dob: clean(p.dob),
    gender: clean(p.gender),
    email: clean(p.email),
    phone: clean(p.phone),
    license: clean(p.license),
    licenseState: clean(p.licenseState),
    licenseExpiration: clean(p.licenseExpiration),
    licenseIssued: clean(p.licenseIssued),
    licenseStatus: clean(p.licenseStatus),
    dea: clean(p.dea),
    deaExpiration: clean(p.deaExpiration),
    malpracticeCarrier: clean(p.malpracticeCarrier),
    malpracticeExpiration: clean(p.malpracticeExpiration),
    boardCert: clean(p.boardCert),
    boardCertExpiration: clean(p.boardCertExpiration),
    lastAttestation: clean(p.lastAttestation),
    attestationStatus: clean(p.attestationStatus),
    profileStatus: clean(p.profileStatus),
  };
}

/** Bulk row → POST /providers/import row. */
export function bulkRowToImportRow(r: BulkRow): ImportProviderRow {
  return {
    rowIndex: r.rowIndex,
    caqhId: clean(r.caqhId),
    npi: clean(r.npi),
    firstName: clean(r.firstName),
    lastName: clean(r.lastName),
    suffix: clean(r.suffix),
    specialty: clean(r.specialty),
    email: clean(r.email),
    phone: clean(r.phone),
    license: clean(r.license),
    licenseState: clean(r.licenseState),
    licenseExpiration: clean(r.licenseExpiration),
    dea: clean(r.dea),
    deaExpiration: clean(r.deaExpiration),
    malpracticeCarrier: clean(r.malpracticeCarrier),
    malpracticeExpiration: clean(r.malpracticeExpiration),
    profileStatus: clean(r.profileStatus),
    lastAttestation: clean(r.lastAttestation),
    authStatus: clean(r.authStatus),
  };
}

/** Browser download of a text file (prototype handleDownloadSample). */
export function downloadText(content: string, filename: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
