import { redirect } from "next/navigation";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { getAffAdminRole } from "@/lib/admin-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type DbRow = Record<string, unknown>;

function value(row: DbRow | null | undefined, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row?.[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/profile");
  }

  const adminRole = await getAffAdminRole(user.id);
  if (!adminRole) {
    redirect("/access-denied?from=admin-profile");
  }

  let profile: DbRow | null = null;
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data } = await adminSupabase
      .from("admin_profiles")
      .select("*")
      .eq("admin_user_id", user.id)
      .maybeSingle();
    profile = data as DbRow | null;
  } catch {
    profile = null;
  }

  const email = user.email ?? value(adminRole, ["email"], "Administrator");
  const displayName = value(profile, ["full_name", "display_name"], user.user_metadata?.full_name as string | undefined ?? "Academy Administrator");
  const title = value(profile, ["title"], "Administrator");
  const phone = value(profile, ["phone"], "Not listed");
  const lastLogin = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Not recorded";
  const permissions = [
    "Student enrollment review",
    "Student directory management",
    "Course management",
    "Upload center administration",
    "Membership and billing administration",
    "Instructor grading center"
  ];

  return (
    <>
      <PageHeader
        eyebrow="Administrator Profile"
        title="Academy administrator identity and permissions."
        text="This profile is separate from student enrollment, membership, billing, and course progress records."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="lg:col-span-2">
            <AdminRouteAudit routeName="/admin/profile" />
          </div>
          <article className="terminal-panel p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-gold-500/35 bg-navy-950">
                {value(profile, ["photo_url"]) ? (
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${value(profile, ["photo_url"])})` }} />
                ) : (
                  <UserRound className="text-gold-300" size={34} />
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">AFF Administrator</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{displayName}</h2>
                <p className="mt-1 text-sm text-ink/68">{title}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <AdminLine icon={<Mail size={17} />} label="Email" value={email} />
              <AdminLine icon={<ShieldCheck size={17} />} label="Role" value="Administrator" />
              <AdminLine icon={<ShieldCheck size={17} />} label="Active Status" value={adminRole.is_active ? "Active" : "Inactive"} />
              <AdminLine icon={<ShieldCheck size={17} />} label="Last Login" value={lastLogin} />
              <AdminLine icon={<Mail size={17} />} label="Contact" value={phone} />
            </div>
          </article>

          <article className="terminal-panel p-6">
            <p className="text-xs uppercase tracking-[.2em] text-gold-300">Academy Permissions</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Administrative access only</h2>
            <p className="mt-3 leading-7 text-ink/72">
              This account is intentionally excluded from student profile, dashboard, billing, membership, enrollment, and course-progress fallback flows.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {permissions.map((permission) => (
                <div key={permission} className="border border-gold-500/16 bg-navy-950 p-3 text-sm font-semibold text-white">
                  {permission}
                </div>
              ))}
            </div>
          </article>
        </SectionInner>
      </Section>
    </>
  );
}

function AdminLine({ icon, label, value: lineValue }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-950 p-3">
      <div className="flex items-center gap-2 text-gold-300">
        {icon}
        <p className="text-[10px] uppercase tracking-[.18em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-white">{lineValue}</p>
    </div>
  );
}
