import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe-rest";
import { recordVerifiedCheckout } from "@/lib/verified-checkout";

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
    const object = event.data.object;
    // Fail closed for all financial event families until their transactional
    // handlers are ready. A retryable response avoids acknowledging lost payments.
    if (event.type.startsWith("checkout.session.") ||
        event.type.startsWith("invoice.") ||
        event.type.startsWith("customer.subscription.") ||
        event.type.startsWith("charge.") ||
        event.type.startsWith("refund.") ||
        event.type.startsWith("payment_intent.")) {
      if (process.env.AFF_VERIFIED_CHECKOUT_ENABLED !== "true" ||
          event.type !== "checkout.session.completed" ||
          object.metadata?.plan_id !== "certification-fee" ||
          object.metadata?.marketplace_product_id ||
          object.payment_status !== "paid") {
        return NextResponse.json({ error: "Financial event requires reconciliation." }, { status: 503 });
      }
      await recordVerifiedCheckout(event);
      return NextResponse.json({ received: true, recorded: true });
    }
    return NextResponse.json({ received: true, ignored: true });
  } catch {
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
