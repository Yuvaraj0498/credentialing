"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { CredentialingHubView } from "@/components/credentialing/CredentialingHubView";

export default function CredentialingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CredentialingHubView />
    </Suspense>
  );
}
