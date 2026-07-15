export const AFF_ADMIN_EMAIL = "acafffx@gmail.com";

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}
