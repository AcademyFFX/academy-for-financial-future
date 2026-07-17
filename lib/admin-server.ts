import { getAffAdminStatusFromSupabase } from "@/lib/admin-status";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getAffAdminStatus() {
  return getAffAdminStatusFromSupabase(createSupabaseServerClient());
}

export async function getAffAdminRole() {
  const status = await getAffAdminStatus();
  return status.authorized ? status.adminRow : null;
}

export async function resolveAffUserRole() {
  const status = await getAffAdminStatus();
  return status.authorized ? "administrator" : status.userId ? "student" : "anonymous";
}

export async function isAffAdminUser() {
  return (await getAffAdminStatus()).authorized;
}
