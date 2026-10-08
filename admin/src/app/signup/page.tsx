import { redirect } from "next/navigation";

// Public sign-up is closed: the super admin creates admins (Create Admin) and admins add providers.
export default function SignupPage() {
  redirect("/signin");
}
