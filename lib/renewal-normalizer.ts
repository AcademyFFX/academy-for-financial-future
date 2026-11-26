import { validateRenewalEvidence } from "@/lib/renewal-evidence";

type RecordData = Record<string, unknown>;
function record(x: unknown): RecordData {
  if (!x || typeof x !== "object" || Array.isArray(x)) throw new Error("Unsupported Stripe record");
  return x as RecordData;
}
function str(x: unknown): string {
  if (typeof x !== "string") throw new Error("Missing Stripe identifier");
  return x;
}
function num(x: unknown): number {
  if (typeof x !== "number" || !Number.isSafeInteger(x)) throw new Error("Invalid Stripe amount or period");
  return x;
}
// Supports only legacy invoice shapes with explicit reciprocal payment linkage.
// Newer Stripe invoice-payment schemas require a separate version-aware adapter.
export function normalizeRenewalEvidence(eventId: string, records: {
  invoice: RecordData; subscription: RecordData; payment: RecordData;
}, expected: { subscriptionId: string; customerId: string; priceId: string; currency: string; amountMinor: number }) {
  const {invoice:i, subscription:s, payment:p} = records;
  const lines = record(i.lines);
  if (lines.has_more !== false || !Array.isArray(lines.data) || lines.data.length !== 1)
    throw new Error("Unsupported invoice line configuration");
  const line = record(lines.data[0]);
  const price = record(line.price);
  const period = record(line.period);
  if (i.payment_intent !== p.id || i.subscription !== s.id ||
      line.proration !== false || line.quantity !== 1 ||
      line.type !== "subscription" || price.type !== "recurring" ||
      line.amount !== expected.amountMinor || i.total !== expected.amountMinor ||
      i.amount_remaining !== 0 || p.currency !== i.currency || line.currency !== i.currency ||
      i.customer !== s.customer || i.customer !== p.customer ||
      s.status !== "active" || s.cancel_at_period_end !== false ||
      i.object !== "invoice" || s.object !== "subscription" || p.object !== "payment_intent")
    throw new Error("Invoice requires manual reconciliation");
  return validateRenewalEvidence({
    eventId, invoiceId:str(i.id), paymentId:str(p.id), subscriptionId:str(s.id),
    expectedSubscriptionId:expected.subscriptionId, customerId:str(i.customer),
    expectedCustomerId:expected.customerId, priceId:str(price.id), expectedPriceId:expected.priceId,
    currency:str(i.currency), expectedCurrency:expected.currency,
    amountPaid:num(i.amount_paid), paymentAmount:num(p.amount_received), expectedAmount:expected.amountMinor,
    invoicePaid:i.status==="paid", paymentSucceeded:p.status==="succeeded",
    liveMode:i.livemode===true && s.livemode===true && p.livemode===true,
    billingReason:str(i.billing_reason), periodStart:num(period.start), periodEnd:num(period.end),
    paymentInvoiceId:str(p.invoice), lineSubscriptionId:str(line.subscription)
  });
}
