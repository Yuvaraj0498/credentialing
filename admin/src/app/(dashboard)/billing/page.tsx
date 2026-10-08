"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { BillingView } from "@/components/billing/BillingView";

export default function BillingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BillingView />
    </Suspense>
  );
}
