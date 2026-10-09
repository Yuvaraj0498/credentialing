"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { OrganizationsView } from "@/components/superadmin/OrganizationsView";

export default function OrganizationsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OrganizationsView />
    </Suspense>
  );
}
