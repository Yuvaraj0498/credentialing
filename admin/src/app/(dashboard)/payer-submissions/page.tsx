"use client";

import { AccessDenied } from "@/components/AlertBox";
import { useAuth, useUser } from "@/stores/auth";
import { PayerSubmissionCenter } from "@/components/submissions/PayerSubmissionCenter";

export default function PayerSubmissionsPage() {
  const user = useUser();
  const { can } = useAuth();
  if (!can("create", "payer_submission") && !can("list", "payer_submission")) return <AccessDenied action="view" entity="payer submissions" role={user.role} />;
  return <PayerSubmissionCenter />;
}
