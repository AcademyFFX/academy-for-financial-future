import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { resolveAffRole } from "@/lib/auth-role";

export async function getAffAdminRole(userId?: string | null) {
  if (!userId) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("aff_admin_users")
      .select("id, user_id, email, role, is_active, created_at, updated_at")
      .eq("user_id", userId)
      .eq("role", "administrator")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return error ? null : data;
  } catch {
    return null;
  }
}

export async function resolveAffUserRole(userId?: string | null) {
  const adminRow = await getAffAdminRole(userId);
  return resolveAffRole(userId, adminRow);
}

export async function isAffAdminUser(userId?: string | null) {
  return (await resolveAffUserRole(userId)) === "administrator";
}
