"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getClientAdminSession } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type AuditState = {
  userId: string;
  email: string;
  role: string;
  authorized: boolean;
  reason: string;
  error: string;
  matchedRow: string;
  matchedEmail: string;
  matchedUserId: string;
  matchedRole: string;
  matchedIsActive: string;
  userIdLookup: string;
  emailLookup: string;
  loading: boolean;
};

export function AdminRouteAudit({ routeName }: { routeName: string }) {
  const production = process.env.NODE_ENV === "production";
  const [audit, setAudit] = useState<AuditState>({
    userId: "Checking user...",
    email: "Checking session...",
    role: "Checking role...",
    authorized: false,
    reason: "Checking authorization...",
    error: "",
    matchedRow: "Checking row...",
    matchedEmail: "Checking row...",
    matchedUserId: "Checking row...",
    matchedRole: "Checking row...",
    matchedIsActive: "Checking row...",
    userIdLookup: "Checking user_id lookup...",
    emailLookup: "Checking email lookup...",
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    async function loadAudit() {
      const supabase = createClient();
      const [{ data }, adminSession] = await Promise.all([
        supabase.auth.getUser(),
        getClientAdminSession()
      ]);

      if (!mounted) return;
      const email = data.user?.email ?? adminSession.email ?? "No authenticated user";
      const role = adminSession.role || (adminSession.isAdmin ? "administrator" : "not authorized");
      const matchedRow = adminSession.adminRow ? JSON.stringify(adminSession.adminRow) : "No aff_admin_users row found";
      setAudit({
        userId: data.user?.id ?? adminSession.userId ?? "No authenticated user",
        email,
        role,
        authorized: adminSession.isAdmin,
        reason: adminSession.reason,
        error: adminSession.error,
        matchedRow,
        matchedEmail: adminSession.matchedEmail || "No aff_admin_users row found",
        matchedUserId: adminSession.matchedUserId || "No aff_admin_users row found",
        matchedRole: adminSession.matchedRole || "No aff_admin_users row found",
        matchedIsActive: adminSession.matchedIsActive || "No aff_admin_users row found",
        userIdLookup: adminSession.lookupDiagnostics.userIdLookup || "No user_id lookup diagnostic returned.",
        emailLookup: adminSession.lookupDiagnostics.emailLookup || "No email lookup diagnostic returned.",
        loading: false
      });

      if (process.env.NODE_ENV !== "production") {
        console.info("AFF admin route authorization", {
          routeName,
          authenticatedUser: email,
          authenticatedUserId: data.user?.id ?? adminSession.userId,
          detectedRole: role,
          authorizationResult: adminSession.isAdmin ? "authorized" : "denied",
          matchedAdminRow: adminSession.adminRow,
          matchedEmail: adminSession.matchedEmail,
          matchedUserId: adminSession.matchedUserId,
          matchedRole: adminSession.matchedRole,
          matchedIsActive: adminSession.matchedIsActive,
          authorizationReason: adminSession.reason,
          authorizationError: adminSession.error,
          lookupDiagnostics: adminSession.lookupDiagnostics
        });
      }
    }

    loadAudit();
    return () => {
      mounted = false;
    };
  }, [routeName]);

  return (
    <div className="terminal-panel flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <ShieldCheck className={audit.authorized ? "text-gold-300" : "text-red-300"} size={20} />
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-gold-300">{production ? "Administrator Status" : "Admin Route Audit"}</p>
          <p className="mt-1 font-semibold text-white">{routeName}</p>
        </div>
      </div>
      <div className="grid gap-1 text-ink/72 sm:text-right">
        {production ? (
          <p className={audit.authorized ? "text-emerald-300" : "text-red-300"}>
            {audit.loading ? "Checking administrator access..." : audit.authorized ? "Admin dashboard ready." : "Administrator authorization required."}
          </p>
        ) : (
          <>
            <p>Authenticated user id: <span className="text-white">{audit.userId}</span></p>
            <p>Authenticated email: <span className="text-white">{audit.email}</span></p>
            <p>Matched email value: <span className="text-white">{audit.matchedEmail}</span></p>
            <p>Matched user_id value: <span className="text-white">{audit.matchedUserId}</span></p>
            <p>Role value: <span className="text-white">{audit.matchedRole}</span></p>
            <p>is_active value: <span className="text-white">{audit.matchedIsActive}</span></p>
            <p>Detected role: <span className="text-white">{audit.role}</span></p>
            <p>Authorization result: <span className={audit.authorized ? "text-emerald-300" : "text-red-300"}>{audit.loading ? "Checking..." : audit.authorized ? "Authorized" : "Denied"}</span></p>
            <p>Exact authorization failure reason: <span className="text-white">{audit.reason}</span></p>
            {audit.error ? <p>Error: <span className="text-red-200">{audit.error}</span></p> : null}
            <p className="max-w-xl break-words">user_id lookup: <span className="text-white">{audit.userIdLookup}</span></p>
            <p className="max-w-xl break-words">email lookup: <span className="text-white">{audit.emailLookup}</span></p>
            <p className="max-w-xl break-words">Matched admin row: <span className="text-white">{audit.matchedRow}</span></p>
          </>
        )}
      </div>
    </div>
  );
}
