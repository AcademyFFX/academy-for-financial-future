import { NextResponse } from "next/server";
import { getBillingPlan } from "@/lib/billing";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { verifyStripeSignature } from "@/lib/stripe-rest";

export const runtime = "nodejs";

type StripeObject = Record<string, unknown> & {
  id?: string;
  customer?: string;
  subscription?: string;
  client_reference_id?: string;
  metadata?: Record<string, string>;
  amount_total?: number;
  amount_paid?: number;
  currency?: string;
  payment_status?: string;
  status?: string;
  mode?: string;
  current_period_end?: number;
  lines?: {
    data?: Array<{
      period?: { end?: number };
      price?: { id?: string };
    }>;
  };
};

type StripeEvent = {
  type: string;
  data: {
    object: StripeObject;
  };
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function centsToDollars(cents: unknown) {
  const amount = typeof cents === "number" ? cents : 0;
  return amount / 100;
}

async function recordBillingHistory(eventType: string, object: StripeObject) {
  const supabase = createSupabaseAdminClient();
  const studentId = object.metadata?.student_id ?? asString(object.client_reference_id);
  if (!studentId) return;

  await supabase.from("billing_history").insert({
    student_id: studentId,
    stripe_event_id: asString(object.id),
    event_type: eventType,
    amount: centsToDollars(object.amount_paid ?? object.amount_total),
    currency: asString(object.currency || "usd").toUpperCase(),
    status: asString(object.payment_status || object.status || "recorded"),
    description: object.metadata?.membership_plan ?? "Academy for Financial Future billing event",
    created_at: new Date().toISOString()
  });
}

async function updateMembershipFromCheckout(object: StripeObject) {
  const supabase = createSupabaseAdminClient();
  const studentId = object.metadata?.student_id ?? asString(object.client_reference_id);
  const planId = object.metadata?.plan_id;
  const plan = planId ? getBillingPlan(planId) : undefined;

  if (!studentId || !plan) return;

  const periodEnd = object.lines?.data?.[0]?.period?.end;
  await supabase.from("student_memberships").upsert({
    student_id: studentId,
    student_email: object.metadata?.student_email ?? "",
    membership_plan: plan.name,
    membership_status: object.payment_status === "paid" ? plan.membershipStatus : "Payment Pending",
    account_status: object.payment_status === "paid" ? plan.accountStatus : "Pending",
    stripe_customer_id: asString(object.customer),
    stripe_subscription_id: asString(object.subscription),
    stripe_checkout_session_id: asString(object.id),
    current_period_end: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "student_id" });
}

async function updateMembershipFromSubscription(object: StripeObject) {
  const supabase = createSupabaseAdminClient();
  const studentId = object.metadata?.student_id;
  if (!studentId) return;

  const planId = object.metadata?.plan_id;
  const plan = planId ? getBillingPlan(planId) : undefined;
  const isActive = ["active", "trialing"].includes(asString(object.status));

  await supabase.from("student_memberships").upsert({
    student_id: studentId,
    student_email: object.metadata?.student_email ?? "",
    membership_plan: plan?.name ?? object.metadata?.membership_plan ?? "Academy Membership",
    membership_status: isActive ? plan?.membershipStatus ?? "Active Membership" : asString(object.status || "Inactive"),
    account_status: isActive ? "Active" : "Restricted",
    stripe_customer_id: asString(object.customer),
    stripe_subscription_id: asString(object.id),
    current_period_end: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "student_id" });
}

export async function POST(request: Request) {
  const payload = await request.text();

  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(payload) as StripeEvent;
    const object = event.data.object;

    if (event.type === "checkout.session.completed") {
      await updateMembershipFromCheckout(object);
      await recordBillingHistory(event.type, object);
    }

    if (event.type.startsWith("invoice.")) {
      await recordBillingHistory(event.type, object);
    }

    if (event.type.startsWith("customer.subscription.")) {
      await updateMembershipFromSubscription(object);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process Stripe webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
