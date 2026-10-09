"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { ProvidersListView } from "@/components/superadmin/ProvidersListView";

export default function AllProvidersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProvidersListView />
    </Suspense>
  );
}
