"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AFFStandardLogo } from "@/components/aff-logo";
import { createClient } from "@/lib/supabase";

type NavLink = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavLink[];
};

const navGroups: NavGroup[] = [
  {
    label: "Academics",
    items: [
      { href: "/university", label: "University" },
      { href: "/courses", label: "Forex Courses" },
      { href: "/research-institute", label: "Research Institute" },
      { href: "/accreditation", label: "Accreditation" },
      { href: "/governance-school", label: "Governance School" },
      { href: "/think-tank", label: "Think Tank" }
    ]
  },
  {
    label: "Student",
    items: [
      { href: "/student-dashboard", label: "Student Dashboard" },
      { href: "/aff-os", label: "AFF OS" },
      { href: "/assignments", label: "Assignments" },
      { href: "/certificates", label: "Certificates" },
      { href: "/messages", label: "Messages" }
    ]
  },
  {
    label: "Trading",
    items: [
      { href: "/trading-floor", label: "Trading Floor" },
      { href: "/ai-coach", label: "AI Forex Coach" },
      { href: "/voice-coach", label: "Voice Coach" },
      { href: "/chart-analyst", label: "Chart Analyst" },
      { href: "/investment-bank", label: "Investment Bank" }
    ]
  },
  {
    label: "Global",
    items: [
      { href: "/global-network", label: "Global Network" },
      { href: "/campus-expansion", label: "Campus Expansion" },
      { href: "/events", label: "Events" },
      { href: "/alumni-network", label: "Alumni Network" },
      { href: "/career-center", label: "Career Center" }
    ]
  },
  {
    label: "Impact",
    items: [
      { href: "/foundation", label: "Foundation" },
      { href: "/civic-leadership", label: "Civic Leadership" },
      { href: "/digital-civilization", label: "Digital Civilization" },
      { href: "/human-flourishing", label: "Human Flourishing" },
      { href: "/endowment-fund", label: "Endowment Fund" }
    ]
  },
  {
    label: "Business",
    items: [
      { href: "/marketplace", label: "Marketplace" },
      { href: "/billing", label: "Billing" },
      { href: "/publishing-house", label: "Publishing House" }
    ]
  }
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) return;

        const { count, error } = await supabase
          .from("student_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null)
          .is("deleted_at", null);

        if (!error) setUnreadCount(count ?? 0);
      } catch {
        setUnreadCount(0);
      }
    }

    loadUnreadCount();
  }, [pathname]);

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-50 border-b border-gold-500/20 bg-navy-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="logo-section flex min-w-0 shrink-0 items-center gap-4">
            <AFFStandardLogo
              priority
              className="h-12 w-[300px] sm:h-14 sm:w-[350px] lg:h-16 lg:max-h-[72px] lg:w-[150px]"
              imageClassName="object-contain object-left"
            />
            <span className="hidden min-w-0 lg:block">
              <span className="brand-title block font-serif text-[15px] font-semibold uppercase tracking-[.08em] text-white">
                ACADEMY FOR FINANCIAL FUTURE
              </span>
              <span className="block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[.22em] text-gold-300">
                LEARN • GROW • PROSPER
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-end gap-0 overflow-x-auto lg:flex xl:gap-1">
            <TopLink href="/" label="Home" active={pathname === "/"} />
            {navGroups.map((group, index) => (
              <DesktopDropdown
                key={group.label}
                group={group}
                pathname={pathname}
                unreadCount={unreadCount}
                alignRight={index >= navGroups.length - 2}
              />
            ))}
            <div className="ml-3 flex shrink-0 items-center gap-2 border-l border-gold-500/20 pl-3">
              <Link href="/login" className="border border-gold-500/45 px-3 py-2 text-xs font-semibold text-gold-300 transition hover:border-gold-300 hover:text-white">
                Login
              </Link>
              <Link href="/register" className="bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950 transition hover:bg-gold-300">
                Register
              </Link>
            </div>
          </nav>

          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((value) => !value)}
            className="ml-auto grid h-11 w-11 shrink-0 place-items-center border border-gold-500/40 text-gold-300 lg:hidden"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-gold-500/20 bg-navy-900 px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-3">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className={`border border-gold-500/16 bg-navy-950 px-4 py-3 text-sm font-semibold ${pathname === "/" ? "text-gold-300" : "text-white"}`}
              >
                Home
              </Link>
              {navGroups.map((group) => (
                <MobileGroup
                  key={group.label}
                  group={group}
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="border border-gold-500/40 px-3 py-3 text-center text-sm font-semibold text-gold-300">
                  Login
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="bg-gold-500 px-3 py-3 text-center text-sm font-bold text-navy-950">
                  Register
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      <main>{children}</main>
      <footer className="border-t border-gold-500/20 bg-navy-950 px-4 py-10 text-sm text-ink/68">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AFFStandardLogo className="h-14 w-72" />
          <div className="space-y-1 sm:text-right">
            <p>© 2026 Academy for Financial Future. All rights reserved.</p>
            <p>Administrator: Dr. Jean Rene Moricette</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopLink({ href, label, active }: NavLink & { active: boolean }) {
  return (
    <Link href={href} className={`shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${active ? "text-gold-300" : "text-ink/76 hover:text-white"}`}>
      {label}
    </Link>
  );
}

function DesktopDropdown({ group, pathname, unreadCount, alignRight }: { group: NavGroup; pathname: string; unreadCount: number; alignRight?: boolean }) {
  const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${active ? "text-gold-300" : "text-ink/76 hover:text-white"}`}
      >
        {group.label}
        <ChevronDown className="transition group-hover:rotate-180" size={14} />
      </button>
      <div className={`invisible absolute top-full z-50 w-64 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${alignRight ? "right-0" : "left-0"}`}>
        <div className="border border-gold-500/24 bg-navy-950 p-2 shadow-gold">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition ${pathname === item.href ? "bg-gold-500 text-navy-950" : "text-ink/78 hover:bg-navy-800 hover:text-white"}`}
            >
              <span>{item.label}</span>
              {item.href === "/messages" && unreadCount > 0 ? <NotificationBadge count={unreadCount} /> : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileGroup({
  group,
  pathname,
  unreadCount,
  onNavigate
}: {
  group: NavGroup;
  pathname: string;
  unreadCount: number;
  onNavigate: () => void;
}) {
  const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <details className="border border-gold-500/16 bg-navy-950" open={active}>
      <summary className={`flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-[.12em] [&::-webkit-details-marker]:hidden ${active ? "text-gold-300" : "text-white"}`}>
        {group.label}
        <ChevronDown size={16} />
      </summary>
      <div className="grid gap-1 border-t border-gold-500/14 p-2">
        {group.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${pathname === item.href ? "text-gold-300" : "text-ink/78"}`}
          >
            <span>{item.label}</span>
            {item.href === "/messages" && unreadCount > 0 ? <NotificationBadge count={unreadCount} /> : null}
          </Link>
        ))}
      </div>
    </details>
  );
}

function NotificationBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-950">
      {count > 99 ? "99+" : count}
    </span>
  );
}
