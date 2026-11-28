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
    const { data, error } = await admin.from("marketplace_purchases")
      .select("id,product_title,product_category,amount,currency,purchase_status,created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
    if (error) throw error;
    const purchases = (data ?? []).map(row => ({
      id: row.id, product_title: row.product_title, product_category: row.product_category,
      amount: row.amount, currency: row.currency, purchase_status: row.purchase_status,
      created_at: row.created_at,
      // Purchase records are not settlement evidence. Entitlements remain disabled.
      payment_verified: false, access_authorized: false, access_url: null
    }));
    return NextResponse.json({ purchases }, { headers });
  } catch {
    return NextResponse.json({ error: "Marketplace history is temporarily unavailable." }, { status: 503, headers });
  }
}
