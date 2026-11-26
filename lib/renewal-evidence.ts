// Review-only boundary. Inputs must be normalized from independently retrieved
// Stripe records by a version-aware server adapter, never from client metadata.
export function validateRenewalEvidence(input: {
  eventId: string; invoiceId: string; paymentId: string; subscriptionId: string;
  expectedSubscriptionId: string; customerId: string; expectedCustomerId: string;
  priceId: string; expectedPriceId: string; currency: string; expectedCurrency: string;
  amountPaid: number; paymentAmount: number; expectedAmount: number;
  invoicePaid: boolean; paymentSucceeded: boolean; liveMode: boolean;
  billingReason: string; periodStart: number; periodEnd: number;
  paymentInvoiceId: string; lineSubscriptionId: string;
}) {
  const x = input;
  if (!/^evt_\w+$/.test(x.eventId) || !/^in_\w+$/.test(x.invoiceId) ||
      !/^pi_\w+$/.test(x.paymentId) || !/^sub_\w+$/.test(x.subscriptionId) ||
      x.subscriptionId !== x.expectedSubscriptionId ||
      !/^cus_\w+$/.test(x.customerId) || x.customerId !== x.expectedCustomerId ||
      !/^price_\w+$/.test(x.priceId) || x.priceId !== x.expectedPriceId ||
      !/^[a-z]{3}$/.test(x.currency) || x.currency !== x.expectedCurrency ||
      !Number.isSafeInteger(x.amountPaid) || x.amountPaid <= 0 ||
      x.amountPaid !== x.paymentAmount || x.amountPaid !== x.expectedAmount ||
      x.invoicePaid !== true || x.paymentSucceeded !== true || x.liveMode !== true ||
      x.billingReason !== "subscription_cycle" ||
      x.paymentInvoiceId !== x.invoiceId || x.lineSubscriptionId !== x.subscriptionId ||
      !Number.isSafeInteger(x.periodStart) || !Number.isSafeInteger(x.periodEnd) ||
      x.periodStart <= 0 || x.periodEnd <= x.periodStart ||
      x.periodEnd > 253402300799) throw new Error("Renewal evidence requires reconciliation");
  return {invoiceId:x.invoiceId,paymentId:x.paymentId,subscriptionId:x.subscriptionId,
    amountMinor:x.amountPaid,currency:x.currency,periodEnd:new Date(x.periodEnd*1000).toISOString()};
}
