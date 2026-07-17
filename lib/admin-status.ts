type DbRow = Record<string, unknown>;

type SupabaseLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error?: { message?: string } | null;
    }>;
  };
  from: (table: string) => any;
};

export type AffAdminStatus = {
  authorized: boolean;
  role: string;
  userId: string;
  email: string;
  reason: string;
  error: string;
  matchedBy: "user_id" | "email" | "none";
  adminRow: DbRow | null;
};

const adminColumns = "id, user_id, email, role, is_active, created_at, updated_at";
const allowedAdminRoles = new Set(["administrator", "admin"]);

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function normalizeRole(role: unknown) {
  return String(role ?? "").trim().toLowerCase();
}

function safeAdminRow(row: DbRow | null) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    user_id: row.user_id ?? null,
    email: row.email ?? null,
    role: row.role ?? null,
    is_active: row.is_active ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

function statusFromRow(params: {
  row: DbRow | null;
  matchedBy: "user_id" | "email" | "none";
  userId: string;
  email: string;
  fallbackReason: string;
}): AffAdminStatus {
  const role = normalizeRole(params.row?.role);
  const isActive = params.row?.is_active === true;
  const emailMatches = !params.email || normalizeEmail(String(params.row?.email ?? "")) === params.email;
  const authorized = Boolean(params.row && isActive && allowedAdminRoles.has(role) && emailMatches);

  let reason = params.fallbackReason;
  if (params.row && !isActive) reason = "Matched admin row is not active.";
  else if (params.row && !allowedAdminRoles.has(role)) reason = `Matched admin row role is '${role || "blank"}', not administrator/admin.`;
  else if (params.row && !emailMatches) reason = "Matched admin row email does not match authenticated email.";
  else if (authorized) reason = `Authorized by aff_admin_users.${params.matchedBy}.`;

  return {
    authorized,
    role: role || "not authorized",
    userId: params.userId,
    email: params.email,
    reason,
    error: "",
    matchedBy: params.row ? params.matchedBy : "none",
    adminRow: safeAdminRow(params.row)
  };
}

export async function getAffAdminStatusFromSupabase(supabase: SupabaseLike): Promise<AffAdminStatus> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "";
  const email = normalizeEmail(user?.email);

  if (userError) {
    return {
      authorized: false,
      role: "not authorized",
      userId,
      email,
      reason: "Unable to read authenticated Supabase user.",
      error: userError.message ?? "Supabase auth.getUser failed.",
      matchedBy: "none",
      adminRow: null
    };
  }

  if (!userId) {
    return {
      authorized: false,
      role: "anonymous",
      userId: "",
      email,
      reason: "No authenticated Supabase user session.",
      error: "",
      matchedBy: "none",
      adminRow: null
    };
  }

  const byUserId = await supabase
    .from("aff_admin_users")
    .select(adminColumns)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (byUserId.error) {
    return {
      authorized: false,
      role: "not authorized",
      userId,
      email,
      reason: "Admin lookup by user_id failed.",
      error: `${byUserId.error.code ? `${byUserId.error.code}: ` : ""}${byUserId.error.message ?? "Unknown Supabase error."}`,
      matchedBy: "none",
      adminRow: null
    };
  }

  if (byUserId.data) {
    return statusFromRow({
      row: byUserId.data,
      matchedBy: "user_id",
      userId,
      email,
      fallbackReason: "Matched admin row by authenticated user_id."
    });
  }

  if (email) {
    const byEmail = await supabase
      .from("aff_admin_users")
      .select(adminColumns)
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (byEmail.error) {
      return {
        authorized: false,
        role: "not authorized",
        userId,
        email,
        reason: "Admin lookup by normalized email failed.",
        error: `${byEmail.error.code ? `${byEmail.error.code}: ` : ""}${byEmail.error.message ?? "Unknown Supabase error."}`,
        matchedBy: "none",
        adminRow: null
      };
    }

    if (byEmail.data) {
      return statusFromRow({
        row: byEmail.data,
        matchedBy: "email",
        userId,
        email,
        fallbackReason: "Matched admin row by normalized authenticated email."
      });
    }
  }

  return {
    authorized: false,
    role: "not authorized",
    userId,
    email,
    reason: "No matching row found in public.aff_admin_users by user_id or email.",
    error: "",
    matchedBy: "none",
    adminRow: null
  };
}
