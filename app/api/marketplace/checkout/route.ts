import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const client = createSupabaseServerClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.productId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(body.productId))
      return NextResponse.json({ error: "Invalid marketplace product." }, { status: 400, headers });
    const admin = createSupabaseAdminClient();
    const { data: product, error } = await admin.from("marketplace_products")
      .select("product_id").eq("product_id", body.productId).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!product) return NextResponse.json({ error: "Product unavailable." }, { status: 404, headers });
    // No financial operations until settlement and provider validation are ready.
    return NextResponse.json({ error: "Marketplace checkout is temporarily unavailable." }, { status: 503, headers });
  } catch {
    return NextResponse.json({ error: "Marketplace checkout is temporarily unavailable." }, { status: 503, headers });
  }
}
