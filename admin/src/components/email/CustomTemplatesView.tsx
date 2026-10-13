"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BorderTabs } from "@/components/BorderTabs";
import { PageHeader } from "@/components/PageHeader";
import { MailTemplatesView, type MailTemplateType } from "./MailTemplatesView";

/** Admin → Custom Templates: Link Templates and Enrollment Templates as tabs (each with its own search). */
export function CustomTemplatesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: MailTemplateType = params.get("tab") === "enrollment" ? "enrollment_approved" : "provider_link";
  const setTab = (t: MailTemplateType) => router.replace(pathname + (t === "enrollment_approved" ? "?tab=enrollment" : ""), { scroll: false });
  return (
    <div>
      <PageHeader title="Custom Templates" subtitle="The emails sent to providers: the secure link and the enrollment approval." />
      <BorderTabs
        tabs={[
          { id: "provider_link", label: "Link Templates", icon: "MailPlus" },
          { id: "enrollment_approved", label: "Enrollment Templates", icon: "MailCheck" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {/* keyed by tab: each tab has its own search and list */}
      <MailTemplatesView key={tab} type={tab} embedded />
    </div>
  );
}
