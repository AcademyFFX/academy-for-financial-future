import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { buildPendingPaymentState, membershipStateToDbPayload } from "@/lib/membership-state";

// Initialize only the authenticated caller's missing record. Never overwrite.
export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createSupabaseAdminClient();
    const { data: application, error: applicationError } = await admin
      .from("student_applications").select("membership_plan")
      .eq("auth_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (applicationError) throw applicationError;
    const { error: insertError } = await admin.from("student_memberships").upsert({
      student_id: user.id,
      student_email: user.email ?? "",
      ...membershipStateToDbPayload(buildPendingPaymentState(application?.membership_plan)),
      updated_at: new Date().toISOString()
    }, { onConflict: "student_id", ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data, error } = await supabase.from("student_memberships").select("*").eq("student_id", user.id).single();
    if (error) throw error;
    return NextResponse.json({ membership: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to initialize membership." }, { status: 500 });
  }
}
