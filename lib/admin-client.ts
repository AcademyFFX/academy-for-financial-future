export type ClientAdminSession = {
  isAdmin: boolean;
  authorized: boolean;
  email: string;
  userId: string;
  role: string;
  reason: string;
  error: string;
  matchedBy: string;
  adminRow: Record<string, unknown> | null;
  matchedEmail: string;
  matchedUserId: string;
  matchedRole: string;
  matchedIsActive: string;
  lookupDiagnostics: {
    userIdLookup: string;
    emailLookup: string;
  };
};

export async function getClientAdminSession(): Promise<ClientAdminSession> {
  try {
    const response = await fetch("/api/auth/admin-status", { cache: "no-store" });
    const payload = await response.json().catch(() => ({ isAdmin: false }));
    return {
      isAdmin: Boolean(response.ok && payload?.isAdmin),
      authorized: Boolean(response.ok && payload?.authorized),
      email: typeof payload?.email === "string" ? payload.email : "",
      userId: typeof payload?.userId === "string" ? payload.userId : "",
      role: typeof payload?.role === "string" ? payload.role : "",
      reason: typeof payload?.reason === "string" ? payload.reason : "",
      error: typeof payload?.error === "string" ? payload.error : "",
      matchedBy: typeof payload?.matchedBy === "string" ? payload.matchedBy : "",
      adminRow: payload?.adminRow && typeof payload.adminRow === "object" ? payload.adminRow : null,
      matchedEmail: typeof payload?.matchedEmail === "string" ? payload.matchedEmail : "",
      matchedUserId: typeof payload?.matchedUserId === "string" ? payload.matchedUserId : "",
      matchedRole: typeof payload?.matchedRole === "string" ? payload.matchedRole : "",
      matchedIsActive: typeof payload?.matchedIsActive === "string" ? payload.matchedIsActive : "",
      lookupDiagnostics: {
        userIdLookup: typeof payload?.lookupDiagnostics?.userIdLookup === "string" ? payload.lookupDiagnostics.userIdLookup : "",
        emailLookup: typeof payload?.lookupDiagnostics?.emailLookup === "string" ? payload.lookupDiagnostics.emailLookup : ""
      }
    };
  } catch {
    return {
      isAdmin: false,
      authorized: false,
      email: "",
      userId: "",
      role: "",
      reason: "Admin status request failed.",
      error: "",
      matchedBy: "none",
      adminRow: null,
      matchedEmail: "",
      matchedUserId: "",
      matchedRole: "",
      matchedIsActive: "",
      lookupDiagnostics: {
        userIdLookup: "Admin status request failed.",
        emailLookup: "Admin status request failed."
      }
    };
  }
}

export async function getClientAdminStatus() {
  return (await getClientAdminSession()).isAdmin;
}
