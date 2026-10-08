"use client";

import { AccessDenied } from "@/components/AlertBox";
import { useAuth, useUser } from "@/stores/auth";
import { PayerCredentialVault } from "@/components/vault/PayerCredentialVault";
import { ProviderOwnLoginsView } from "@/components/vault/ProviderOwnLoginsView";

export default function CredentialVaultPage() {
  const user = useUser();
  const { can } = useAuth();
  // Like the prototype, provider users see their own payer logins instead of the staff vault.
  if (user.role === "provider") return <ProviderOwnLoginsView />;
  if (!can("read", "credential_vault")) return <AccessDenied action="read" entity="credential vault" role={user.role} />;
  return <PayerCredentialVault />;
}
