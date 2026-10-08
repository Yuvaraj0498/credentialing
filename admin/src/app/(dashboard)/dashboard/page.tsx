"use client";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { SuperAdminDashboard } from "@/components/superadmin/SuperAdminDashboard";
import { useUser } from "@/stores/auth";

export default function DashboardPage() {
  const user = useUser();
  // The super admin has a platform dashboard; everyone else sees their organization's dashboard.
  return user.role === "platform_admin" ? <SuperAdminDashboard /> : <DashboardView />;
}
