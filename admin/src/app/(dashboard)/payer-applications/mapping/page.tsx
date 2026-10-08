"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/AsyncState";
import { FormMappingView } from "@/components/payers/FormMappingView";

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

function MappingInner() {
  const sp = useSearchParams();
  return <FormMappingView payerId={num(sp.get("payerId"))} formId={num(sp.get("formId"))} providerId={num(sp.get("providerId"))} enrollmentId={num(sp.get("enrollmentId"))} />;
}

export default function FormMappingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MappingInner />
    </Suspense>
  );
}
