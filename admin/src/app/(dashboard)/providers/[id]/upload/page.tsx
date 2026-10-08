"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AccessDenied } from "@/components/AlertBox";
import { ErrorState, Loading } from "@/components/AsyncState";
import { DocumentUploadView } from "@/components/providers/DocumentUploadView";
import { useAuth } from "@/stores/auth";
import { ROLE_LABEL } from "@/lib/constants";

export default function ProviderUploadPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProviderUploadRoute />
    </Suspense>
  );
}

function ProviderUploadRoute() {
  const params = useParams<{ id: string }>();
  const { user, can } = useAuth();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState message="Invalid provider id." />;
  if (!can("create", "document")) return <AccessDenied action="upload" entity="documents" role={user ? ROLE_LABEL[user.role] : undefined} />;
  return <DocumentUploadView key={id} providerId={id} />;
}
