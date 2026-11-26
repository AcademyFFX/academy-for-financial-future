import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// Isolated adapter: invoke only after authenticated server-side checkout creation.
// Discounted and recurring purchases require separate reconciliation.
export async function registerFixedPriceCheckout(input: {
  studentId: string;
  configuredPriceId: string;
  price: { id: string; active: boolean; livemode: boolean; type: string; unit_amount: number | null; currency: string };
  session: { id: string; livemode: boolean; mode: string; status: string; client_reference_id: string; amount_total: number | null; currency: string; expires_at: number };
}) {
  const { studentId, configuredPriceId, price, session } = input;
  if (!studentId || !configuredPriceId || price.id !== configuredPriceId ||
      price.active !== true || price.livemode !== true || price.type !== "one_time" ||
      typeof price.unit_amount !== "number" || !Number.isSafeInteger(price.unit_amount) ||
      price.unit_amount <= 0 || !/^[a-z]{3}$/.test(price.currency) ||
      session.livemode !== true || !session.id.startsWith("cs_live_") ||
      session.mode !== "payment" || session.status !== "open" ||
      session.client_reference_id !== studentId ||
      session.amount_total !== price.unit_amount || session.currency !== price.currency ||
      !Number.isSafeInteger(session.expires_at) || session.expires_at <= Date.now() / 1000) {
    throw new Error("Checkout does not match authorized fixed price");
  }
  const db = createSupabaseAdminClient();
  const { data: membership, error: lookupError } = await db.from("student_memberships")
    .select("id").eq("student_id", studentId).single();
  if (lookupError || !membership?.id) throw new Error("Membership record required");
  const { error } = await db.from("aff_payment_intents").insert({
    checkout_session_id: session.id,
    membership_id: membership.id,
    plan: "Certification Fee",
    amount_minor: price.unit_amount,
    currency: price.currency,
    livemode: true,
    expires_at: new Date(session.expires_at * 1000).toISOString()
  });
  if (error) throw new Error("Checkout registration failed");
}
