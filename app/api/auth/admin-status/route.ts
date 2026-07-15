import { NextResponse } from "next/server";
import { isAffAdminUser } from "@/lib/admin-server";
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

  return NextResponse.json({ isAdmin: await isAffAdminUser(user.id) });
}
