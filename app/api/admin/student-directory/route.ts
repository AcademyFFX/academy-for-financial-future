import { NextResponse } from "next/server";
import { getAffAdminStatus } from "@/lib/admin-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;
const photoColumnCandidates = ["profile_photo_url", "photo_url", "avatar_url", "profile_image_url", "image_url"];

function value(row: DbRow, key: string, fallback = "") {
  const current = row[key];
  return current === null || current === undefined ? fallback : String(current);
}

function nullableValue(row: DbRow, keys: string[]) {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return null;
}

export async function GET() {
  const serverSupabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const adminStatus = await getAffAdminStatus();
  if (!adminStatus.authorized) {
    return NextResponse.json({
      error: "AFF administrator access required.",
      reason: adminStatus.reason,
      code: adminStatus.error
    }, { status: 403 });
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data: students, error: studentsError } = await adminSupabase
    .from("students")
    .select("*")
    .ilike("status", "Active")
    .order("full_name", { ascending: true });

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message, code: studentsError.code }, { status: 500 });
  }

  const studentColumns = Array.from(new Set(((students ?? []) as DbRow[]).flatMap((student) => Object.keys(student))));
  const detectedPhotoColumn = photoColumnCandidates.find((column) => studentColumns.includes(column)) ?? null;

  const authIds = ((students ?? []) as DbRow[])
    .map((student) => value(student, "auth_user_id"))
    .filter(Boolean);

  const { data: memberships, error: membershipsError } = authIds.length
    ? await adminSupabase
        .from("student_memberships")
        .select("student_id, active_membership_plan, membership_status, payment_status, account_status")
        .in("student_id", authIds)
    : { data: [], error: null };

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message, code: membershipsError.code }, { status: 500 });
  }

  const { data: profiles, error: profilesError } = authIds.length
    ? await adminSupabase
        .from("student_profiles")
        .select("auth_user_id, profile_photo_url")
        .in("auth_user_id", authIds)
    : { data: [], error: null };

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message, code: profilesError.code }, { status: 500 });
  }

  const membershipByAuthId = new Map(((memberships ?? []) as DbRow[]).map((membership) => [value(membership, "student_id"), membership]));
  const profileByAuthId = new Map(((profiles ?? []) as DbRow[]).map((profile) => [value(profile, "auth_user_id"), profile]));
  const directory = ((students ?? []) as DbRow[]).map((student) => {
    const authUserId = value(student, "auth_user_id");
    const membership = membershipByAuthId.get(authUserId) ?? {};
    const studentProfile = profileByAuthId.get(authUserId) ?? {};
    const profilePhotoUrl = nullableValue(studentProfile, ["profile_photo_url"]) ?? (detectedPhotoColumn ? nullableValue(student, [detectedPhotoColumn]) : null);

    return {
      id: value(student, "id"),
      student_id: value(student, "student_id", "Pending"),
      full_name: value(student, "full_name", "AFF Student"),
      email: value(student, "email"),
      enrollment_date: value(student, "enrollment_date", "Not recorded"),
      certification_level: value(student, "certification_level", "Academy for Financial Future"),
      enrollment_status: value(student, "status", "Active"),
      active_membership_plan: value(membership, "active_membership_plan", value(student, "membership_plan", "Free Trial")),
      membership_status: value(membership, "membership_status", "Pending Payment"),
      payment_status: value(membership, "payment_status"),
      account_status: value(membership, "account_status"),
      profile_photo_url: profilePhotoUrl
    };
  });

  return NextResponse.json({
    students: directory,
    schema: {
      studentsColumnsInspected: studentColumns,
      detectedPhotoColumn,
      photoColumnCandidates
    }
  });
}
