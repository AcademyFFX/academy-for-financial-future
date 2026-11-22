import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const unauthorized = () => NextResponse.json({ error: "Not authorized to access this asset." }, { status: 403, headers: noStore });

/**
 * Opt-in, non-integrated secure media prototype.
 * This endpoint does NOT secure files while aff-course-assets is public.
 * Requires an Authorization: Bearer <Supabase access token> header.
 * Never accepts arbitrary storage paths from callers.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: noStore });

  let assetId: unknown;
  try {
    const body = await request.json();
    assetId = body?.assetId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: noStore });
  }
  if (typeof assetId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
    return NextResponse.json({ error: "Invalid asset ID." }, { status: 400, headers: noStore });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Service configuration unavailable." }, { status: 503, headers: noStore });

  // Use the caller's JWT for every database and Storage operation; no service-role bypass.
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData, error: authError } = await supabase.auth.getUser(match[1]);
  if (authError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: noStore });

  const { data: asset, error: assetError } = await supabase
    .from("course_assets")
    .select("id,course_id,storage_path,asset_status")
    .eq("id", assetId)
    .maybeSingle();
  if (assetError || !asset?.storage_path || !asset.course_id) return unauthorized();

  const { data: admin, error: adminError } = await supabase
    .from("aff_admin_users")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .in("role", ["administrator", "admin"])
    .maybeSingle();
  if (adminError) return unauthorized();

  if (!admin) {
    if (asset.asset_status !== "Published") return unauthorized();
    const { data: student, error: studentError } = await supabase
      .from("students").select("id").eq("auth_user_id", userData.user.id).maybeSingle();
    if (studentError || !student) return unauthorized();
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments").select("id,enrollment_status")
      .eq("student_id", student.id).eq("course_id", asset.course_id).maybeSingle();
    if (enrollmentError || !enrollment || !["active", "enrolled", "completed"].includes(String(enrollment.enrollment_status ?? "").toLowerCase())) return unauthorized();
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("aff-course-assets").createSignedUrl(asset.storage_path, 300);
  if (signError || !signed?.signedUrl) return NextResponse.json({ error: "File access unavailable." }, { status: 503, headers: noStore });
  return NextResponse.json({ url: signed.signedUrl, expiresIn: 300 }, { headers: noStore });
}
