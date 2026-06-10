"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Bot, BookOpenText, BriefcaseBusiness, Building2, CalendarDays, ClipboardCheck, CreditCard, Gamepad2, HandHeart, Landmark, Mail, MessageSquare, Mic, NotebookPen, Radio, Scale, ShieldCheck, ShoppingBag, Tv, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { DashboardCourseSummary } from "@/components/dashboard-course-summary";
import { ZoomClassesPanel } from "@/components/zoom-classes-panel";

const dashboardLinks = [
  { href: "/billing", label: "Membership Billing", icon: CreditCard },
  { href: "/marketplace", label: "AFF Marketplace", icon: ShoppingBag },
  { href: "/career-center", label: "Career Center", icon: BriefcaseBusiness },
  { href: "/research-institute", label: "Research Institute", icon: BookOpenText },
  { href: "/events", label: "Events Division", icon: CalendarDays },
  { href: "/campus-expansion", label: "Campus Expansion", icon: Building2 },
  { href: "/endowment-fund", label: "Endowment Fund", icon: Landmark },
  { href: "/foundation", label: "Foundation", icon: HandHeart },
  { href: "/civic-leadership", label: "Civic Leadership", icon: Scale },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/ai-coach", label: "AI Forex Coach", icon: Bot },
  { href: "/voice-coach", label: "AI Voice Coach", icon: Mic },
  { href: "/trading-simulator", label: "Trading Simulator", icon: Gamepad2 },
  { href: "/social-network", label: "Social Learning", icon: Users },
  { href: "/tv-studio", label: "AFF TV Studio", icon: Tv },
  { href: "/live-trading-room", label: "Live Trading Room", icon: Radio },
  { href: "/journal", label: "Trading Journal", icon: NotebookPen },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/exams", label: "Certification Exams", icon: ShieldCheck },
  { href: "/certificates", label: "Certificates", icon: Award }
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser }
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        try {
          const { count } = await supabase
            .from("student_messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", currentUser.id)
            .is("read_at", null)
            .is("deleted_at", null);

          setUnreadCount(count ?? 0);
        } catch {
          setUnreadCount(0);
        }
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  const studentName =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
      ? user.user_metadata.name
      : "Student";

  return (
    <section className="market-grid min-h-[calc(100vh-155px)] border-b border-gold-500/20 bg-navy-900 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-gold-300">Student Dashboard</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-white sm:text-5xl">
          Welcome to Academy for Financial Future
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="terminal-panel h-fit p-6 shadow-gold">
            <p className="text-sm uppercase tracking-[.22em] text-gold-300">Student Profile</p>
            {loading ? (
              <p className="mt-5 text-ink/72">Loading student account...</p>
            ) : (
              <div className="mt-5 grid gap-4">
                <p className="flex items-center gap-3 text-white">
                  <User className="text-gold-300" size={20} />
                  <span>{studentName}</span>
                </p>
                <p className="flex items-center gap-3 text-ink/76">
                  <Mail className="text-gold-300" size={20} />
                  <span>{user?.email}</span>
                </p>
              </div>
            )}
          </aside>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardLinks.map((item) => (
              <Link key={item.href} href={item.href} className="terminal-panel p-6 transition hover:border-gold-400/60">
                <div className="flex items-center justify-between gap-3">
                  <item.icon className="text-gold-300" size={28} />
                  {item.href === "/messages" && unreadCount > 0 ? (
                    <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-navy-950">{unreadCount} unread</span>
                  ) : null}
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">{item.label}</h2>
                <p className="mt-3 leading-7 text-ink/70">
                  Open your {item.label.toLowerCase()} workspace for the Forex Training Division.
                </p>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <DashboardCourseSummary />
        </div>
        <div className="mt-8">
          <ZoomClassesPanel user={user} />
        </div>
      </div>
    </section>
  );
}
