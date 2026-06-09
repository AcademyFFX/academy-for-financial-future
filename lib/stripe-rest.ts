import { createHmac, timingSafeEqual } from "crypto";

const stripeApiBase = "https://api.stripe.com/v1";

export async function stripeRequest<T>(path: string, params: URLSearchParams) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY.");

  const response = await fetch(`${stripeApiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message ?? "Stripe request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function appendMetadata(params: URLSearchParams, metadata: Record<string, string>) {
  for (const [key, value] of Object.entries(metadata)) {
    params.append(`metadata[${key}]`, value);
  }
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return false;

  const timestamp = signatureHeader
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  const expectedSignature = signatureHeader
    .split(",")
    .find((part) => part.startsWith("v1="))
    ?.slice(3);

  if (!timestamp || !expectedSignature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const digest = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const expected = Buffer.from(expectedSignature, "hex");
  const actual = Buffer.from(digest, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
