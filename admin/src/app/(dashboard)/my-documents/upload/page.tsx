"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/AsyncState";
import { MyDocumentsUploadView } from "@/components/portal/ProviderPortalView";

/** ?docType=… : the row's Upload / Replace on My Documents (the document type is fixed). */
function UploadInner() {
  const sp = useSearchParams();
  return <MyDocumentsUploadView docType={sp.get("docType")} />;
}

export default function MyDocumentsUploadPage() {
  return (
    <Suspense fallback={<Loading />}>
      <UploadInner />
    </Suspense>
  );
}
