export async function getClientAdminStatus() {
  try {
    const response = await fetch("/api/auth/admin-status", { cache: "no-store" });
    const payload = await response.json().catch(() => ({ isAdmin: false }));
    return Boolean(response.ok && payload?.isAdmin);
  } catch {
    return false;
  }
}
