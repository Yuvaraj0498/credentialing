import { redirect } from "next/navigation";

export default function EnrollmentMailTemplatesPage() {
  redirect("/custom-templates?tab=enrollment");
}
