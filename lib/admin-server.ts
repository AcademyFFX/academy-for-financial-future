import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function isAffAdminUser(userId?: string | null) {
  if (!userId) return false;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("aff_admin_users")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    return !error && Boolean(data);
  } catch {
    return false;
  }
}
