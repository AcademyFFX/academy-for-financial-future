import { NextResponse } from "next/server";
import { getBillingPlan } from "@/lib/billing";
import { buildFreeTrialState, membershipStateToDbPayload } from "@/lib/membership-state";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { appendMetadata, stripeRequest } from "@/lib/stripe-rest";

import { registerFixedPriceCheckout } from "@/lib/checkout-registration";

type CheckoutSessionResponse = {
  id: string;
  url: string;
  customer?: string;
  livemode: boolean;
  mode: string;
  status: string;
  client_reference_id: string;
  amount_total: number | null;
  currency: string;
  expires_at: number;
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
      const { error } = await adminSupabase.from("student_memberships").insert({
        student_id: user.id,
        student_email: user.email ?? "",
        ...membershipStateToDbPayload(trialState),
        trial_ends_at: trialEndsAt,
        updated_at: new Date().toISOString()
      });

      if (error?.code === "23505") return NextResponse.json({ error: "A membership record already exists. Contact AFF administration for trial eligibility." }, { status: 409 });
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

    // Recurring and discounted checkout remain disabled until reconciled.
    if (plan.id !== "certification-fee" || plan.mode !== "payment" || (typeof couponCode === "string" && couponCode.trim())) {
      return NextResponse.json({ error: "This paid checkout is not yet available." }, { status: 503 });
    }
    if (process.env.AFF_VERIFIED_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json({ error: "Paid checkout is not yet available." }, { status: 503 });
    }
    const price = await stripeRequest<{ id: string; active: boolean; livemode: boolean; type: string; unit_amount: number | null; currency: string }>("/prices/" + encodeURIComponent(priceId), new URLSearchParams(), "GET");
    if (price.id !== priceId || !price.active || !price.livemode || price.type !== "one_time" || !Number.isSafeInteger(price.unit_amount) || (price.unit_amount ?? 0) <= 0) {
      return NextResponse.json({ error: "Price configuration unavailable." }, { status: 503 });
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const params = new URLSearchParams();
    params.append("mode", plan.mode);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}/billing?checkout=success&plan=${plan.id}`);
    params.append("cancel_url", `${origin}/billing?checkout=cancelled`);

    params.append("customer_email", user.email ?? "");
    params.append("client_reference_id", user.id);
    appendMetadata(params, {
      student_id: user.id,
      student_email: user.email ?? "",
      plan_id: plan.id,
      membership_plan: plan.name
    });

    const session = await stripeRequest<CheckoutSessionResponse>("/checkout/sessions", params);

    // Checkout initiation is not proof of payment. Do not change existing
    // membership entitlements or Stripe subscription identifiers here.
    try {
      await registerFixedPriceCheckout({ studentId: user.id, configuredPriceId: priceId, price, session });
    } catch {
      try { await stripeRequest("/checkout/sessions/" + encodeURIComponent(session.id) + "/expire", new URLSearchParams()); } catch { /* URL remains undisclosed; operational reconciliation required. */ }
      return NextResponse.json({ error: "Unable to authorize checkout." }, { status: 503 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: "Unable to start checkout." }, { status: 500 });
  }
}
