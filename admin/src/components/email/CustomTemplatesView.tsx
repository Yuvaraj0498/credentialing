"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BorderTabs } from "@/components/BorderTabs";
import { PageHeader } from "@/components/PageHeader";
import { MailTemplatesView, type MailTemplateType } from "./MailTemplatesView";

/** Admin → Custom Templates: Link, Enrollment and Document Request Templates as tabs (each with its own search). */
export function CustomTemplatesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("tab");
  const tab: MailTemplateType = q === "enrollment" ? "enrollment_approved" : q === "documents" ? "document_request" : "provider_link";
  const setTab = (t: MailTemplateType) =>
    router.replace(pathname + (t === "enrollment_approved" ? "?tab=enrollment" : t === "document_request" ? "?tab=documents" : ""), { scroll: false });
  return (
    <div>
      <PageHeader title="Custom Templates" subtitle="The emails sent to providers: the secure link and the enrollment approval." />
      <BorderTabs
        tabs={[
          { id: "provider_link", label: "Link Templates", icon: "MailPlus" },
          { id: "enrollment_approved", label: "Enrollment Templates", icon: "MailCheck" },
          { id: "document_request", label: "Document Request Templates", icon: "FileQuestion" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {/* keyed by tab: each tab has its own search and list */}
      <MailTemplatesView key={tab} type={tab} embedded />
    </div>
  );
}
