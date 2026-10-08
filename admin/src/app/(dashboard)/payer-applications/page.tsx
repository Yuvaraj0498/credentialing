"use client";

import { AccessDenied } from "@/components/AlertBox";
import { isOrgAdmin, useAuth, useUser } from "@/stores/auth";
import { PayerApplicationsView } from "@/components/payers/PayerApplicationsView";

export default function PayerApplicationsPage() {
  const user = useUser();
  const { can } = useAuth();
  if (!isOrgAdmin(user) && !can("create", "enrollment")) return <AccessDenied action="create" entity="payer applications" role={user.role} />;
  return <PayerApplicationsView />;
}
