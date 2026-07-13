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
  const paid = object.payment_status === "paid";
  await supabase.from("student_memberships").upsert({
    student_id: studentId,
    student_email: object.metadata?.student_email ?? "",
    selected_membership_plan: plan.name,
    active_membership_plan: paid ? plan.name : "Free Trial",
    membership_plan: paid ? plan.name : "Free Trial",
    payment_status: paid ? "Paid" : "Pending",
    membership_status: paid ? "Active" : "Pending Payment",
    account_status: "Active",
    stripe_customer_id: asString(object.customer),
    stripe_subscription_id: asString(object.subscription),
    stripe_checkout_session_id: asString(object.id),
    current_period_end: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
    paid_at: paid ? new Date().toISOString() : null,
    activated_at: paid ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "student_id" });

  if (paid) {
    await supabase
      .from("students")
      .update({ membership_plan: plan.name })
      .eq("auth_user_id", studentId);
  }
}

async function updateMarketplacePurchaseFromCheckout(object: StripeObject) {
  const productId = object.metadata?.marketplace_product_id;
  const purchaseId = object.metadata?.purchase_id;
  const studentId = object.metadata?.student_id ?? asString(object.client_reference_id);

  if (!productId || !purchaseId || !studentId) return;

  const supabase = createSupabaseAdminClient();
  const amount = centsToDollars(object.amount_paid ?? object.amount_total);
  const status = object.payment_status === "paid" ? "Paid" : "Payment Pending";

  await supabase
    .from("marketplace_purchases")
    .update({
      purchase_status: status,
      amount,
      currency: asString(object.currency || "usd").toUpperCase(),
      stripe_checkout_session_id: asString(object.id),
      stripe_customer_id: asString(object.customer),
      paid_at: object.payment_status === "paid" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", purchaseId)
    .eq("student_id", studentId);

  const affiliateCode = object.metadata?.affiliate_code;
  if (object.payment_status === "paid" && affiliateCode) {
    const { data: affiliate } = await supabase
      .from("marketplace_affiliates")
      .select("id, commission_rate")
      .eq("code", affiliateCode)
      .eq("active", true)
      .maybeSingle();

    if (affiliate) {
      const commissionRate = Number(affiliate.commission_rate ?? 0);
      await supabase.from("marketplace_affiliate_commissions").insert({
        affiliate_id: affiliate.id,
        purchase_id: purchaseId,
        product_id: productId,
        student_id: studentId,
        gross_amount: amount,
        commission_rate: commissionRate,
        commission_amount: Math.round(amount * commissionRate) / 100,
        commission_status: "Pending"
      });
    }
  }
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
    selected_membership_plan: plan?.name ?? object.metadata?.membership_plan ?? "Academy Membership",
    active_membership_plan: isActive ? plan?.name ?? object.metadata?.membership_plan ?? "Academy Membership" : "Free Trial",
    membership_plan: isActive ? plan?.name ?? object.metadata?.membership_plan ?? "Academy Membership" : "Free Trial",
    payment_status: isActive ? "Paid" : "Pending",
    membership_status: isActive ? "Active" : asString(object.status || "Inactive"),
    account_status: isActive ? "Active" : "Restricted",
    stripe_customer_id: asString(object.customer),
    stripe_subscription_id: asString(object.id),
    current_period_end: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "student_id" });

  await supabase
    .from("students")
    .update({ membership_plan: isActive ? plan?.name ?? object.metadata?.membership_plan ?? "Academy Membership" : "Free Trial" })
    .eq("auth_user_id", studentId);
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
      if (object.metadata?.marketplace_product_id) {
        await updateMarketplacePurchaseFromCheckout(object);
      } else {
        await updateMembershipFromCheckout(object);
      }
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
