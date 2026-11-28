import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe-rest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }
  try {
    const event = JSON.parse(payload);
    if (!event || typeof event.type !== "string" || typeof event.id !== "string" ||
        !event.data?.object || typeof event.data.object !== "object") {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }
    // Fail closed for all financial event families until their transactional
    // handlers are ready. A retryable response avoids acknowledging lost payments.
    if (event.type.startsWith("checkout.session.") ||
        event.type.startsWith("invoice.") ||
        event.type.startsWith("customer.subscription.") ||
        event.type.startsWith("charge.") ||
        event.type.startsWith("refund.") ||
        event.type.startsWith("payment_intent.") ||
        event.type.startsWith("credit_note.") ||
        event.type.startsWith("subscription_schedule.")) {
      return NextResponse.json({ error: "Financial event requires reconciliation." }, { status: 503 });
    }
    return NextResponse.json({ received: true, ignored: true });
  } catch {
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
