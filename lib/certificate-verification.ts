export const AFF_CANONICAL_PUBLIC_URL = "https://academy-for-financial-future.vercel.app";

function isAllowedCanonicalOrigin(url: URL) {
  if (url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  if (hostname.endsWith(".vercel.app") && url.origin !== AFF_CANONICAL_PUBLIC_URL) return false;
  return true;
}

export function getAffCanonicalPublicUrl(configuredUrl = process.env.NEXT_PUBLIC_SITE_URL) {
  try {
    const configured = new URL(String(configuredUrl ?? "").trim());
    return isAllowedCanonicalOrigin(configured) ? configured.origin : AFF_CANONICAL_PUBLIC_URL;
  } catch {
    return AFF_CANONICAL_PUBLIC_URL;
  }
}

export function buildAffCertificateVerificationUrl(certificateNumber: string, configuredUrl?: string) {
  const verificationUrl = new URL("/verify-certificate", getAffCanonicalPublicUrl(configuredUrl));
  verificationUrl.searchParams.set("certificate", certificateNumber.trim());
  return verificationUrl.toString();
}

