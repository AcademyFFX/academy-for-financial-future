import { stripeRequest } from "@/lib/stripe-rest";

// Read-only retrieval; no entitlement changes. A version-specific normalizer
// must verify invoice/payment relationships before renewal evidence is accepted.
export async function retrieveRenewalRecords(ids: {
  invoiceId: string; subscriptionId: string; paymentId: string;
}) {
  if (!/^in_[A-Za-z0-9]+$/.test(ids.invoiceId) ||
      !/^sub_[A-Za-z0-9]+$/.test(ids.subscriptionId) ||
      !/^pi_[A-Za-z0-9]+$/.test(ids.paymentId)) {
    throw new Error("Invalid renewal record identifiers");
  }
  const get = (path: string) => stripeRequest<Record<string, unknown>>(path, new URLSearchParams(), "GET");
  const [invoice, subscription, payment] = await Promise.all([
    get("/invoices/" + encodeURIComponent(ids.invoiceId)),
    get("/subscriptions/" + encodeURIComponent(ids.subscriptionId)),
    get("/payment_intents/" + encodeURIComponent(ids.paymentId))
  ]);
  if (invoice.id !== ids.invoiceId || invoice.object !== "invoice" ||
      subscription.id !== ids.subscriptionId || subscription.object !== "subscription" ||
      payment.id !== ids.paymentId || payment.object !== "payment_intent" ||
      invoice.livemode !== true || subscription.livemode !== true || payment.livemode !== true ||
      invoice.status !== "paid" || payment.status !== "succeeded" ||
      typeof invoice.customer !== "string" || invoice.customer !== subscription.customer ||
      invoice.customer !== payment.customer) {
    throw new Error("Renewal records require reconciliation");
  }
  return { invoice, subscription, payment };
}
