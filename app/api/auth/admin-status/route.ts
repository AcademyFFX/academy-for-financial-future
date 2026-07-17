import { NextResponse } from "next/server";
import { getAffAdminStatus } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getAffAdminStatus();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseHost = (() => {
    try {
      return supabaseUrl ? new URL(supabaseUrl).host : "";
    } catch {
      return "Invalid NEXT_PUBLIC_SUPABASE_URL";
    }
  })();

  return NextResponse.json({
    isAdmin: status.authorized,
    authorized: status.authorized,
    email: status.email,
    userId: status.userId,
    role: status.role,
    reason: status.reason,
    error: status.error,
    matchedBy: status.matchedBy,
    adminRow: status.adminRow,
    matchedEmail: status.matchedEmail,
    matchedUserId: status.matchedUserId,
    matchedRole: status.matchedRole,
    matchedIsActive: status.matchedIsActive,
    lookupDiagnostics: status.lookupDiagnostics,
    environment: {
      supabaseHost,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  }, { status: status.userId ? 200 : 401 });
}
