import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Not wired into the live webhook until checkout registration and SQL are tested.
export async function recordVerifiedCheckout(event: {
  id: string;
  type: string;
  livemode: boolean;
  created: number;
  data: { object: Record<string, unknown> };
}) {
  const session = event.data.object;
  if (event.type !== "checkout.session.completed" ||
      event.livemode !== true || session.livemode !== true ||
      session.payment_status !== "paid" || session.mode !== "payment" ||
      typeof event.id !== "string" || !event.id.startsWith("evt_") ||
      typeof session.id !== "string" || !session.id.startsWith("cs_live_") ||
      typeof session.payment_intent !== "string" || !session.payment_intent.startsWith("pi_") ||
      typeof session.amount_total !== "number" || !Number.isSafeInteger(session.amount_total) ||
      session.amount_total <= 0 ||
      typeof session.currency !== "string" || !/^[a-z]{3}$/.test(session.currency) ||
      !Number.isSafeInteger(event.created) || event.created <= 0) {
    throw new Error("Unsupported or invalid paid checkout");
  }
  // Caller must authenticate the raw Stripe event and verify provider identity.
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("aff_record_verified_checkout", {
    p_event: event.id,
    p_session: session.id,
    p_payment: session.payment_intent,
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_live: event.livemode,
    p_occurred: new Date(event.created * 1000).toISOString()
  });
  if (error || data !== "recorded_only") {
    throw new Error("Financial recording failed");
  }
  return data;
}
