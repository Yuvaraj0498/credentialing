"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { OrganizationView } from "@/components/organization/OrganizationView";

export default function OrganizationPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrganizationView />
    </Suspense>
  );
}
