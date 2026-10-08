"use client";

import { useParams } from "next/navigation";
import { InvoiceDetailPage } from "@/components/billing/InvoiceDetail";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  return <InvoiceDetailPage id={id} />;
}
