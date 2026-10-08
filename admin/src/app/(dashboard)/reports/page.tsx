"use client";

import { Suspense } from "react";
import { Loading } from "@/components/AsyncState";
import { ReportsView } from "@/components/reports/ReportsView";

export default function ReportsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReportsView />
    </Suspense>
  );
}
