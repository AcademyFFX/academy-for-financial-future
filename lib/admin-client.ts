export type ClientAdminSession = {
  isAdmin: boolean;
  email: string;
  role: string;
};

export async function getClientAdminSession(): Promise<ClientAdminSession> {
  try {
    const response = await fetch("/api/auth/admin-status", { cache: "no-store" });
    const payload = await response.json().catch(() => ({ isAdmin: false }));
    return {
      isAdmin: Boolean(response.ok && payload?.isAdmin),
      email: typeof payload?.email === "string" ? payload.email : "",
      role: typeof payload?.role === "string" ? payload.role : ""
    };
  } catch {
    return { isAdmin: false, email: "", role: "" };
  }
}

export async function getClientAdminStatus() {
  return (await getClientAdminSession()).isAdmin;
}
