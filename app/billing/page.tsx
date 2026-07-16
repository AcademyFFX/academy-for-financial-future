"use client";

import { useRouter } from "next/navigation";
import { BadgeDollarSign, CheckCircle2, CreditCard, Crown, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { getClientAdminStatus } from "@/lib/admin-client";
import { billingPlans } from "@/lib/billing";
import { buildPendingPaymentState, membershipStateToDbPayload, normalizeMembershipState } from "@/lib/membership-state";
import { createClient } from "@/lib/supabase";

type Membership = {
  selected_membership_plan: string | null;
  active_membership_plan: string | null;
  membership_plan: string | null;
  payment_status: string | null;
  membership_status: string | null;
  account_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type BillingHistoryRow = {
  id: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
};

type PlanConfig = Record<string, { configured: boolean; missingEnv: string | null }>;

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [history, setHistory] = useState<BillingHistoryRow[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [planConfig, setPlanConfig] = useState<PlanConfig>({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState("");
  const [message, setMessage] = useState("Choose an academy membership or manage your billing profile.");

  const activeUntil = useMemo(() => {
    const raw = membership?.current_period_end ?? membership?.trial_ends_at;
    if (!raw) return "";
    return new Date(raw).toLocaleDateString();
  }, [membership]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
        const supabase = createClient();
        const {
          data: { user: currentUser }
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
        if (await getClientAdminStatus()) {
          router.replace("/admin");
          return;
        }

        const [membershipResult, historyResult, configResponse] = await Promise.all([
          supabase.from("student_memberships").select("*").eq("student_id", currentUser.id).maybeSingle(),
          supabase.from("billing_history").select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false }).limit(20),
          fetch("/api/billing/checkout")
        ]);

        if (membershipResult.error) throw membershipResult.error;
        if (historyResult.error) throw historyResult.error;
        if (configResponse.ok) {
          const config = await configResponse.json();
          setPlanConfig(config.plans ?? {});
        }

        let resolvedMembership = membershipResult.data as Membership | null;

        if (!resolvedMembership) {
          const { data: application } = await supabase
            .from("student_applications")
            .select("membership_plan,email")
            .or(`auth_user_id.eq.${currentUser.id},email.eq.${currentUser.email ?? ""}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const selectedPlan = typeof application?.membership_plan === "string" && application.membership_plan.trim()
            ? application.membership_plan
            : "Free Trial";
          const fallbackState = buildPendingPaymentState(selectedPlan);
          const fallback = {
            student_id: currentUser.id,
            student_email: currentUser.email ?? application?.email ?? "",
            ...membershipStateToDbPayload(fallbackState),
            updated_at: new Date().toISOString()
          };
          const fallbackResult = await supabase.from("student_memberships").upsert(fallback, { onConflict: "student_id" }).select("*").single();
          if (fallbackResult.error) throw fallbackResult.error;
          resolvedMembership = fallbackResult.data as Membership;
          setMessage("No membership record was found. A controlled membership record was created for your authenticated account.");
        } else {
          setMessage("Billing center ready.");
        }

        const normalizedState = normalizeMembershipState(resolvedMembership);
        setMembership({
          ...resolvedMembership,
          selected_membership_plan: normalizedState.selectedPlan,
          active_membership_plan: normalizedState.currentPlan,
          membership_plan: normalizedState.currentPlan,
          payment_status: normalizedState.paymentStatus,
          membership_status: normalizedState.membershipStatus,
          account_status: normalizedState.accountStatus
        });
        setHistory((historyResult.data ?? []) as BillingHistoryRow[]);
      } catch (error) {
        const errorMessage = getErrorMessage(error, "Run the billing migration to enable memberships and billing history.");
        setLoadError(errorMessage);
        setMessage(`Billing load failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  async function startCheckout(planId: string) {
    const missingEnv = planConfig[planId]?.missingEnv;
    if (missingEnv) {
      setMessage(`Administrator configuration needed before checkout can start: ${missingEnv}.`);
      return;
    }

    setProcessingPlan(planId);
    setMessage("Preparing secure Stripe checkout...");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, couponCode: couponCode.trim() || null })
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Unable to start checkout.");
      if (payload.url.startsWith("/")) {
        window.location.href = payload.url;
      } else {
        window.location.assign(payload.url);
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to start checkout."));
    } finally {
      setProcessingPlan("");
    }
  }

  async function openBillingPortal() {
    setProcessingPlan("portal");
    setMessage("Opening Stripe billing portal...");

    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "Unable to open billing portal.");
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to open billing portal."));
    } finally {
      setProcessingPlan("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Membership and Billing"
        title="Control academy access, payments, and certification fees."
        text="Manage Free Trial, Monthly Membership, Annual Membership, Premium Mentorship, and Certification Fee payments through Stripe."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <p className="text-sm text-ink/72">{message}</p>
          {loadError ? (
            <button className="w-fit border border-gold-500/35 px-5 py-3 text-sm font-semibold text-gold-300" type="button" onClick={loadBilling}>
              Retry Billing Sync
            </button>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <aside className="terminal-panel h-fit p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-gold-300" size={24} />
                <h2 className="text-xl font-semibold text-white">Student Account Status</h2>
              </div>
              {loading ? (
                <p className="mt-5 text-ink/70">Loading billing profile...</p>
              ) : (
                <div className="mt-5 grid gap-4">
                  <StatusLine label="Student" value={user?.email ?? "Student"} />
                  <StatusLine label="Selected Plan" value={membership?.selected_membership_plan ?? "Membership record unavailable"} />
                  <StatusLine label="Current Plan" value={membership?.active_membership_plan ?? membership?.membership_plan ?? "Membership record unavailable"} />
                  <StatusLine label="Payment Status" value={membership?.payment_status ?? "Membership record unavailable"} />
                  <StatusLine label="Membership Status" value={membership?.membership_status ?? "Membership record unavailable"} />
                  <StatusLine label="Account Status" value={membership?.account_status ?? "Membership record unavailable"} />
                  {activeUntil ? <StatusLine label="Access Through" value={activeUntil} /> : null}
                  <button
                    className="mt-2 inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300 disabled:opacity-60"
                    type="button"
                    onClick={openBillingPortal}
                    disabled={!membership?.stripe_customer_id || processingPlan === "portal"}
                  >
                    <CreditCard size={18} /> Manage Billing
                  </button>
                </div>
              )}
            </aside>

            <section className="terminal-panel p-6">
              <div className="flex items-center gap-3">
                <BadgeDollarSign className="text-gold-300" size={24} />
                <h2 className="text-xl font-semibold text-white">Coupon Codes</h2>
              </div>
              <p className="mt-3 leading-7 text-ink/70">
                Enter a code here for your records. Stripe-hosted Checkout will also allow eligible promotion codes before payment is completed.
              </p>
              <input
                className="mt-5 w-full border border-gold-500/24 bg-navy-950 px-4 py-3 uppercase text-white outline-none focus:border-gold-400"
                placeholder="AFF coupon code"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              />
            </section>
          </section>

          <section className="grid gap-5 xl:grid-cols-5">
            {billingPlans.map((plan) => {
              const config = planConfig[plan.id];
              const missingEnv = config?.missingEnv;
              const disabled = processingPlan === plan.id || Boolean(missingEnv);
              return (
              <article key={plan.id} className={`terminal-panel flex flex-col p-5 ${plan.highlighted ? "shadow-gold" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <Crown className="text-gold-300" size={22} />
                  <span className="border border-gold-500/25 px-3 py-1 text-xs uppercase tracking-[.18em] text-gold-300">{plan.cadence}</span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-xl font-semibold text-gold-300">{plan.priceLabel}</p>
                <p className="mt-3 min-h-20 leading-7 text-ink/70">{plan.description}</p>
                <ul className="mt-4 grid gap-2 text-sm text-ink/72">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-gold-300" size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-6 inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60"
                  type="button"
                  disabled={disabled}
                  onClick={() => startCheckout(plan.id)}
                >
                  <Sparkles size={16} /> {processingPlan === plan.id ? "Preparing..." : plan.mode === "trial" ? "Start Trial" : "Select Plan"}
                </button>
                {missingEnv ? <p className="mt-3 text-xs leading-5 text-amber-200">Administrator configuration needed: {missingEnv}</p> : null}
              </article>
            );})}
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <FileText className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Billing History</h2>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="p-5 text-ink/68">No billing history has been recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-navy-800">
                      {["Date", "Description", "Event", "Amount", "Status"].map((header) => (
                        <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id} className="bg-navy-950">
                        <td className="p-4 text-ink/76">{new Date(row.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-ink/76">{row.description ?? "Academy billing event"}</td>
                        <td className="p-4 text-ink/76">{row.event_type}</td>
                        <td className="p-4 text-ink/76">{row.amount === null ? "-" : `${row.currency ?? "USD"} ${Number(row.amount).toFixed(2)}`}</td>
                        <td className="p-4 text-ink/76">{row.status ?? "Recorded"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}
