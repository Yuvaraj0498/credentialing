"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ErrorState, Loading } from "@/components/AsyncState";
import { ProviderReadView } from "@/components/superadmin/ProviderReadView";

export default function AllProvidersDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Route />
    </Suspense>
  );
}

function Route() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = Number(params.id);
  const org = Number(search.get("org"));
  if (!Number.isInteger(id) || id <= 0) return <ErrorState message="Invalid provider." />;
  return <ProviderReadView key={id} providerId={id} orgId={Number.isInteger(org) && org > 0 ? org : null} />;
}
