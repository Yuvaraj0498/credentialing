"use client";

import { Suspense } from "react";
import { CustomTemplatesView } from "@/components/email/CustomTemplatesView";

export default function CustomTemplatesPage() {
  return (
    <Suspense>
      <CustomTemplatesView />
    </Suspense>
  );
}
