import { NextResponse } from "next/server";
import { getAffAdminRole } from "@/lib/admin-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const adminRole = await getAffAdminRole(user.id);

  return NextResponse.json({
    isAdmin: Boolean(adminRole),
    email: user.email ?? adminRole?.email ?? "",
    role: adminRole?.role ?? ""
  });
}
