import { NextResponse } from "next/server";
import { getBillingPlan } from "@/lib/billing";
import { buildFreeTrialState, buildPendingPaymentState, membershipStateToDbPayload, normalizeMembershipState } from "@/lib/membership-state";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { appendMetadata, stripeRequest } from "@/lib/stripe-rest";

type CheckoutSessionResponse = {
  id: string;
  url: string;
  customer?: string;
};

export async function GET() {
  return NextResponse.json({
    plans: Object.fromEntries(
      ["free-trial", "monthly-membership", "annual-membership", "premium-mentorship", "certification-fee"].map((planId) => {
        const plan = getBillingPlan(planId);
        return [planId, {
          configured: !plan?.priceEnv || Boolean(process.env[plan.priceEnv]),
          missingEnv: plan?.priceEnv && !process.env[plan.priceEnv] ? plan.priceEnv : null
        }];
      })
    ),
    requiredEnvironmentVariables: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_MONTHLY_MEMBERSHIP_PRICE_ID",
      "STRIPE_ANNUAL_MEMBERSHIP_PRICE_ID",
      "STRIPE_PREMIUM_MENTORSHIP_PRICE_ID",
      "STRIPE_CERTIFICATION_FEE_PRICE_ID",
      "NEXT_PUBLIC_SITE_URL"
    ]
  });
}

export async function POST(request: Request) {
  try {
    const { planId, couponCode } = await request.json();
    const plan = getBillingPlan(String(planId ?? ""));

    if (!plan) {
      return NextResponse.json({ error: "Invalid membership plan." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (plan.mode === "trial") {
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const adminSupabase = createSupabaseAdminClient();
      const trialState = buildFreeTrialState();
      const { error } = await adminSupabase.from("student_memberships").upsert({
        student_id: user.id,
        student_email: user.email ?? "",
        ...membershipStateToDbPayload(trialState),
        trial_ends_at: trialEndsAt,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_id" });

      if (error) throw error;
      return NextResponse.json({ url: "/billing?trial=started" });
    }

    if (!plan.priceEnv) {
      return NextResponse.json({ error: "This plan is not configured for Stripe Checkout." }, { status: 400 });
    }

    const priceId = process.env[plan.priceEnv];
    if (!priceId) {
      return NextResponse.json({ error: `Missing ${plan.priceEnv}.` }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const params = new URLSearchParams();
    params.append("mode", plan.mode);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/billing?checkout=success&plan=${plan.id}`);
    params.append("cancel_url", `${origin}/billing?checkout=cancelled`);
    params.append("allow_promotion_codes", "true");
    params.append("customer_email", user.email ?? "");
    params.append("client_reference_id", user.id);
    appendMetadata(params, {
      student_id: user.id,
      student_email: user.email ?? "",
      plan_id: plan.id,
      membership_plan: plan.name
    });

    if (plan.mode === "subscription") {
      params.append("subscription_data[metadata][student_id]", user.id);
      params.append("subscription_data[metadata][student_email]", user.email ?? "");
      params.append("subscription_data[metadata][plan_id]", plan.id);
      params.append("subscription_data[metadata][membership_plan]", plan.name);
    }

    if (typeof couponCode === "string" && couponCode.trim()) {
      const { data: coupon } = await supabase
        .from("billing_coupons")
        .select("stripe_promotion_code_id")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (coupon?.stripe_promotion_code_id) {
        params.delete("allow_promotion_codes");
        params.append("discounts[0][promotion_code]", coupon.stripe_promotion_code_id);
      }
    }

    const session = await stripeRequest<CheckoutSessionResponse>("/checkout/sessions", params);

    const adminSupabase = createSupabaseAdminClient();
    const { data: existingMembership } = await adminSupabase
      .from("student_memberships")
      .select("active_membership_plan, membership_plan, payment_status, membership_status")
      .eq("student_id", user.id)
      .maybeSingle();
    const existingState = normalizeMembershipState(existingMembership);
    const preserveActivePlan = existingState.paymentStatus === "Paid" && existingState.membershipStatus === "Active Membership";
    const pendingState = buildPendingPaymentState(plan.name);
    const checkoutState = preserveActivePlan ? existingState : pendingState;
    const { error } = await adminSupabase.from("student_memberships").upsert({
      student_id: user.id,
      student_email: user.email ?? "",
      ...membershipStateToDbPayload(checkoutState),
      stripe_checkout_session_id: session.id,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      updated_at: new Date().toISOString()
    }, { onConflict: "student_id" });

    if (error) throw error;
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
