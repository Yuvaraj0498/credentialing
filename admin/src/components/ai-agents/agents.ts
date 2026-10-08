// Agent catalog from the prototype (static product copy). Agent execution is a later phase.
export interface AgentDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: "single" | "agentic";
  steps?: number;
  skills: string[];
}

export const AGENTS: AgentDef[] = [
  { id: "doc_classifier", name: "Document Classifier", description: "Classifies uploaded credentialing documents (DEA, malpractice, license, diploma) and extracts key fields.", icon: "FileSearch", color: "#3b82f6", type: "single", skills: ["Vision OCR", "Field extraction", "Confidence scoring"] },
  { id: "email_drafter", name: "Email Drafting Assistant", description: "Drafts contextual emails to providers and payer relations — status updates, missing docs, escalations.", icon: "Mail", color: "#10b981", type: "single", skills: ["Tone calibration", "Context-aware", "Provider personalization"] },
  { id: "next_action", name: "Next Action Advisor", description: "Reviews an enrollment and recommends the next concrete action — call, email, escalate, follow up.", icon: "Lightbulb", color: "#f59e0b", type: "single", skills: ["Risk assessment", "Workflow knowledge", "Timeline analysis"] },
  { id: "roster_recon", name: "Roster Reconciliation", description: "Compares our active roster against payer-reported roster, flags discrepancies, drafts resolution plans.", icon: "GitCompare", color: "#8b5cf6", type: "single", skills: ["Diff analysis", "Pattern matching", "Resolution planning"] },
  { id: "onboarding", name: "Provider Onboarding Agent", description: "Multi-step workflow: NPI verification → CAQH check → exclusion checks → document request → task assignment.", icon: "UserPlus", color: "#f97316", type: "agentic", steps: 7, skills: ["NPI Registry", "CAQH ProView", "OIG/SAM checks", "Task delegation", "Email automation"] },
  { id: "recred_agent", name: "Recredentialing Agent", description: "Multi-step workflow: identify due recreds → draft packets → email providers → schedule follow-ups → submit to payers.", icon: "RefreshCw", color: "#0ea5e9", type: "agentic", steps: 6, skills: ["Schedule scanning", "Document gathering", "Multi-payer coordination", "Reminder cadence"] },
  { id: "daily_standup", name: "Daily Standup Agent", description: "Runs every morning, summarizes overnight changes, flags risks, generates prioritized task list.", icon: "Sunrise", color: "#ec4899", type: "agentic", steps: 5, skills: ["Activity summarization", "Risk detection", "Priority ranking", "Calendar awareness"] },
  { id: "payer_response", name: "Payer Response Analyzer", description: "Paste a payer's letter or email. Extracts reasoning, classifies the response type, and suggests next steps.", icon: "MessageCircleQuestion", color: "#6366f1", type: "single", skills: ["NLP classification", "Denial reason extraction", "Response routing"] },
  { id: "appeal_drafter", name: "Denial Appeal Drafter", description: "Drafts a formal appeal letter for a denied enrollment, including regulatory citations and supporting documentation.", icon: "Scale", color: "#dc2626", type: "single", skills: ["Legal writing", "Regulatory citations", "Evidence assembly"] },
  { id: "fraud_detect", name: "Fraud Detection Agent", description: "Scans provider records for suspicious patterns — NPI mismatches, license inconsistencies, OIG flags, address anomalies.", icon: "ShieldAlert", color: "#b91c1c", type: "single", skills: ["Pattern matching", "Cross-reference checks", "Risk scoring"] },
  { id: "contract_analyze", name: "Contract Term Analyzer", description: "Reviews a payer contract and flags auto-renewal clauses, unilateral termination rights, rate-cut triggers, and other red flags.", icon: "FileSearch2", color: "#7c3aed", type: "single", skills: ["Contract parsing", "Risk identification", "Clause comparison"] },
  { id: "negotiation_agent", name: "Contract Negotiation Assistant", description: "Multi-step workflow: analyze current contract, benchmark rates, identify levers, and draft a counter-proposal.", icon: "Handshake", color: "#0891b2", type: "agentic", steps: 6, skills: ["Rate benchmarking", "Lever identification", "Counter-proposal drafting", "Walk-away analysis"] },
  { id: "payer_audit", name: "Payer Performance Auditor", description: "Multi-step workflow: audits every payer relationship for TAT, denial rate, and follow-up burden. Ranks payers and recommends strategy.", icon: "BarChart4", color: "#059669", type: "agentic", steps: 5, skills: ["Performance metrics", "Comparative analysis", "Strategic recommendations", "Workload modeling"] },
];
