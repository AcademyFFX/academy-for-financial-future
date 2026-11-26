import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { stripeRequest } from "@/lib/stripe-rest";
import { retrieveRenewalRecords } from "@/lib/renewal-provider";
import { normalizeRenewalEvidence } from "@/lib/renewal-normalizer";

// Not routed from webhook until API compatibility and SQL tests pass.
// Caller must verify raw Stripe signature before invoking.
export async function recordVerifiedRenewal(event: {
  id: string; type: string; livemode: boolean; created: number;
  data: { object: Record<string, unknown> };
}) {
  const invoice = event.data.object;
  if (event.type !== "invoice.paid" || event.livemode !== true ||
      !Number.isSafeInteger(event.created) || event.created <= 0 ||
      event.created > 253402300799 ||
      typeof invoice.id !== "string" || typeof invoice.subscription !== "string" ||
      typeof invoice.payment_intent !== "string") throw new Error("Unsupported renewal event");
  const records = await retrieveRenewalRecords({invoiceId:invoice.id,
    subscriptionId:invoice.subscription,paymentId:invoice.payment_intent});
  const db = createSupabaseAdminClient();
  const {data:m,error} = await db.from("student_memberships")
    .select("id,stripe_subscription_id,stripe_customer_id,active_membership_plan")
    .eq("stripe_subscription_id",invoice.subscription).single();
  if (error || !m?.id || !m.stripe_customer_id) throw new Error("Membership reconciliation required");
  const env = m.active_membership_plan === "Monthly Membership" ? "STRIPE_MONTHLY_MEMBERSHIP_PRICE_ID" :
    m.active_membership_plan === "Annual Membership" ? "STRIPE_ANNUAL_MEMBERSHIP_PRICE_ID" :
    m.active_membership_plan === "Premium Mentorship" ? "STRIPE_PREMIUM_MENTORSHIP_PRICE_ID" : null;
  const priceId = env ? process.env[env] : undefined;
  if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) throw new Error("Missing authorized price");
  const price = await stripeRequest<Record<string,unknown>>("/prices/"+encodeURIComponent(priceId),new URLSearchParams(),"GET");
  if (price.id !== priceId || price.object !== "price" || price.livemode !== true ||
      price.type !== "recurring" || typeof price.unit_amount !== "number" ||
      !Number.isSafeInteger(price.unit_amount) || price.unit_amount <= 0 ||
      typeof price.currency !== "string") throw new Error("Unsupported renewal price");
  const evidence = normalizeRenewalEvidence(event.id,records,{
    subscriptionId:m.stripe_subscription_id,customerId:m.stripe_customer_id,
    priceId,currency:price.currency,amountMinor:price.unit_amount});
  const result = await db.rpc("aff_record_verified_renewal",{
    p_event:event.id,p_invoice:evidence.invoiceId,p_payment:evidence.paymentId,
    p_membership:m.id,p_subscription:evidence.subscriptionId,p_amount:evidence.amountMinor,
    p_currency:evidence.currency,p_end:evidence.periodEnd,p_occurred:new Date(event.created*1000).toISOString()
  });
  if (result.error || !["extended","already_recorded"].includes(result.data))
    throw new Error("Renewal transaction failed");
  return result.data;
}
