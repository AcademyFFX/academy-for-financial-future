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
  const parts = signatureHeader.split(",").map(part => part.trim());
  const timestamps = parts.filter(part => part.startsWith("t="));
  if (timestamps.length !== 1) return false;
  const timestamp = timestamps[0].slice(2);
  if (!/^\d+$/.test(timestamp)) return false;
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > 300) return false;
  const actual = createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest();
  return parts.filter(part => part.startsWith("v1=")).some(part => {
    const signature = part.slice(3);
    if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
    return timingSafeEqual(Buffer.from(signature, "hex"), actual);
  });
}
