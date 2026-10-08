"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ErrorState, Loading } from "@/components/AsyncState";
import { ProviderDetailView } from "@/components/providers/ProviderDetailView";

export default function ProviderDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProviderDetailRoute />
    </Suspense>
  );
}

function ProviderDetailRoute() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState message="Invalid provider id." />;
  return <ProviderDetailView key={id} providerId={id} />;
}
