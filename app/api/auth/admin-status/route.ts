import { NextResponse } from "next/server";
import { getAffAdminStatus } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getAffAdminStatus();
  const production = process.env.NODE_ENV === "production";
  const reason = status.authorized ? "Admin dashboard ready." : "Administrator authorization required.";

  const payload: Record<string, unknown> = {
    isAdmin: status.authorized,
    authorized: status.authorized,
    email: status.email,
    userId: status.userId,
    role: status.role,
    reason,
    error: status.authorized ? "" : status.error
  };

  if (!production) {
    payload.matchedBy = status.matchedBy;
    payload.adminRow = status.adminRow;
    payload.matchedEmail = status.matchedEmail;
    payload.matchedUserId = status.matchedUserId;
    payload.matchedRole = status.matchedRole;
    payload.matchedIsActive = status.matchedIsActive;
    payload.lookupDiagnostics = status.lookupDiagnostics;
  }

  return NextResponse.json(payload, { status: status.userId ? 200 : 401 });
}
