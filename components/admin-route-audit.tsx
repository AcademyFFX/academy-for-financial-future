"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getClientAdminSession } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type AuditState = {
  email: string;
  role: string;
  authorized: boolean;
  loading: boolean;
};

export function AdminRouteAudit({ routeName }: { routeName: string }) {
  const [audit, setAudit] = useState<AuditState>({
    email: "Checking session...",
    role: "Checking role...",
    authorized: false,
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
      setAudit({
        email,
        role,
        authorized: adminSession.isAdmin,
        loading: false
      });

      console.info("AFF admin route authorization", {
        routeName,
        authenticatedUser: email,
        detectedRole: role,
        authorizationResult: adminSession.isAdmin ? "authorized" : "denied"
      });
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
          <p className="text-xs uppercase tracking-[.18em] text-gold-300">Admin Route Audit</p>
          <p className="mt-1 font-semibold text-white">{routeName}</p>
        </div>
      </div>
      <div className="grid gap-1 text-ink/72 sm:text-right">
        <p>Authenticated user: <span className="text-white">{audit.email}</span></p>
        <p>Detected role: <span className="text-white">{audit.role}</span></p>
        <p>Authorization result: <span className={audit.authorized ? "text-emerald-300" : "text-red-300"}>{audit.loading ? "Checking..." : audit.authorized ? "Authorized" : "Denied"}</span></p>
      </div>
    </div>
  );
}
