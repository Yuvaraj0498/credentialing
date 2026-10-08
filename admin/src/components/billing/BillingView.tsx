"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccessDenied } from "@/components/AlertBox";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { BillingOverview } from "./BillingOverview";
import { SubscriptionView } from "./SubscriptionView";
import { InvoicesView } from "./InvoicesView";
import { PricingMatrixView } from "./PricingMatrixView";
import { PaymentMethodsView } from "./PaymentMethodsView";
import { useBillingAccess } from "./shared";

export type BillingTab = "overview" | "subscription" | "invoices" | "pricing" | "payment";
const TABS: BillingTab[] = ["overview", "subscription", "invoices", "pricing", "payment"];

/** Page header + tab strip shared by /billing and /billing/invoices/[id]. */
export function BillingHeader({ tab, onTab }: { tab: BillingTab; onTab: (t: BillingTab) => void }) {
  return (
    <>
      <PageHeader title="Billing & Subscription" subtitle="Manage your subscription, invoices, pricing, and payment methods" />

      <div className="tabs mb-6">
        <div className={"tab " + (tab === "overview" ? "active" : "")} onClick={() => onTab("overview")}>
          <Icon name="LayoutDashboard" size={13} className="inline mr-1" /> Overview
        </div>
        <div className={"tab " + (tab === "subscription" ? "active" : "")} onClick={() => onTab("subscription")}>
          <Icon name="Package" size={13} className="inline mr-1" /> Subscription
        </div>
        <div className={"tab " + (tab === "invoices" ? "active" : "")} onClick={() => onTab("invoices")}>
          <Icon name="FileText" size={13} className="inline mr-1" /> Invoices
        </div>
        <div className={"tab " + (tab === "pricing" ? "active" : "")} onClick={() => onTab("pricing")}>
          <Icon name="DollarSign" size={13} className="inline mr-1" /> Pricing Matrix
        </div>
        <div className={"tab " + (tab === "payment" ? "active" : "")} onClick={() => onTab("payment")}>
          <Icon name="CreditCard" size={13} className="inline mr-1" /> Payment Methods
        </div>
      </div>
    </>
  );
}

export const billingTabHref = (t: BillingTab) => "/billing" + (t === "overview" ? "" : "?tab=" + t);

export function BillingView() {
  const router = useRouter();
  const params = useSearchParams();
  const { canRead, role } = useBillingAccess();
  const raw = params.get("tab") === "payment-methods" ? "payment" : (params.get("tab") as BillingTab | null);
  const tab: BillingTab = raw && TABS.includes(raw) ? raw : "overview";

  if (!canRead) {
    return (
      <div>
        <PageHeader title="Billing & Subscription" subtitle="Manage your subscription, invoices, pricing, and payment methods" />
        <AccessDenied action="view" entity="billing" role={role} />
      </div>
    );
  }

  return (
    <div>
      <BillingHeader tab={tab} onTab={(t) => router.replace(billingTabHref(t), { scroll: false })} />

      {tab === "overview" && <BillingOverview />}
      {tab === "subscription" && <SubscriptionView />}
      {tab === "invoices" && <InvoicesView />}
      {tab === "pricing" && <PricingMatrixView />}
      {tab === "payment" && <PaymentMethodsView />}
    </div>
  );
}
