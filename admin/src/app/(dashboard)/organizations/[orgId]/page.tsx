"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@/components/AsyncState";
import { OrganizationTreeView } from "@/components/superadmin/OrganizationTreeView";

export default function OrganizationTreePage() {
  const params = useParams<{ orgId: string }>();
  const orgId = Number(params.orgId);
  if (!Number.isInteger(orgId) || orgId <= 0) return <ErrorState message="Invalid organization." />;
  return <OrganizationTreeView key={orgId} orgId={orgId} />;
}
