"use client";

import { Suspense } from "react";
import { MasterDataView } from "@/components/master-data/MasterDataView";

export default function MasterDataPage() {
  return (
    <Suspense>
      <MasterDataView />
    </Suspense>
  );
}
