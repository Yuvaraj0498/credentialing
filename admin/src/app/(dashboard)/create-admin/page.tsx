"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { CreateAdminView } from "@/components/superadmin/CreateAdminView";

export default function CreateAdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CreateAdminView />
    </Suspense>
  );
}
