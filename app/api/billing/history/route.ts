import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const client = createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
    const admin = createSupabaseAdminClient();
    const { data: memberships, error: membershipError } = await admin
      .from("student_memberships").select("id").eq("student_id", user.id);
    if (membershipError) throw membershipError;
    const ids = (memberships ?? []).map(m => m.id);
    if (!ids.length) return NextResponse.json({ history: [] }, { headers });
    const { data, error } = await admin.from("aff_billing_history")
      .select("id,entry_type,amount_minor,currency,occurred_at")
      .in("membership_id", ids).eq("livemode", true)
      .order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(20);
    if (error) throw error;
    const history = (data ?? []).map(row => {
      if (!Number.isSafeInteger(row.amount_minor) || row.amount_minor <= 0 ||
          !/^[a-z]{3}$/.test(row.currency) || !["payment", "refund"].includes(row.entry_type))
        throw new Error("Unsupported ledger record");
      return { id: row.id, event_type: row.entry_type, amount_minor: row.amount_minor,
        currency: row.currency.toUpperCase(), created_at: row.occurred_at,
        description: row.entry_type === "refund" ? "Recorded refund" : "Recorded payment",
        status: "Recorded" };
    });
    return NextResponse.json({ history }, { headers });
  } catch {
    return NextResponse.json({ error: "Billing history is temporarily unavailable." }, { status: 503, headers });
  }
}
