"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { Loading } from "@/components/AsyncState";
import { SecureLinkPortal } from "@/components/portal/SecureLinkPortal";

/** Public provider portal opened from a secure link (/admin/upload/{token}). */
export default function PublicUploadPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PublicUploadRoute />
    </Suspense>
  );
}

function PublicUploadRoute() {
  const params = useParams<{ token: string }>();
  return <SecureLinkPortal token={params.token} />;
}
