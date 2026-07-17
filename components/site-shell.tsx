"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AFFStandardLogo } from "@/components/aff-logo";
import { getClientAdminSession } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type NavLink = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavLink[];
};

const studentAuthLinks: NavLink[] = [
  { href: "/student-dashboard", label: "Dashboard" },
  { href: "/courses", label: "My Courses" },
  { href: "/student-profile", label: "Profile" },
  { href: "/billing", label: "Billing" }
];
const adminAuthLinks: NavLink[] = [
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/student-directory", label: "Student Management" },
  { href: "/admin/course-management", label: "Course Manager" },
  { href: "/admin/course-management/upload-center", label: "Upload Center" },
  { href: "/admin/profile", label: "Admin Profile" }
];

const navGroups: NavGroup[] = [
  {
    label: "Academics",
    items: [
      { href: "/university", label: "University" },
      { href: "/courses", label: "Forex Courses" },
      { href: "/degrees", label: "Degrees" },
      { href: "/transcripts", label: "Transcripts" },
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
      { href: "/student-profile", label: "Student Profile" },
      { href: "/mobile-app", label: "Mobile App" },
      { href: "/aff-os", label: "AFF OS" },
      { href: "/assignments", label: "Assignments" },
      { href: "/homework-center", label: "Homework Center" },
      { href: "/live-classroom", label: "Live Classroom" },
      { href: "/certifications", label: "Certification Center" },
      { href: "/certificates", label: "Certificates" },
      { href: "/verify-transcript", label: "Verify Transcript" },
      { href: "/messages", label: "Messages" }
    ]
  },
  {
    label: "Trading",
    items: [
      { href: "/trading-floor", label: "Trading Floor" },
      { href: "/ai-center", label: "AI Center" },
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
      { href: "/publishing-house", label: "Publishing House" },
      { href: "/broadcast-network", label: "Broadcast Network" }
    ]
  }
];

export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const headerRef = useRef<HTMLElement | null>(null);
  const authenticatedLinks = isAdmin ? adminAuthLinks : studentAuthLinks;
  const visibleNavGroups = useMemo(() => {
    if (!isAdmin) return navGroups;

    return navGroups.map((group) => {
      if (group.label === "Student") {
        return {
          ...group,
          items: [
            { href: "/admin", label: "Admin Dashboard" },
            { href: "/student-directory", label: "Student Management" },
            { href: "/admin/course-management", label: "Course Manager" },
            { href: "/admin/course-management/upload-center", label: "Upload Center" },
            { href: "/admin/profile", label: "Admin Profile" },
            { href: "/messages", label: "Messages" }
          ]
        };
      }

      if (group.label === "Business") {
        return {
          ...group,
          items: group.items.filter((item) => item.href !== "/billing")
        };
      }

      return group;
    });
  }, [isAdmin]);
  const displayName = welcomeName || resolveUserName(authUser);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function applyUser(user: User | null) {
      if (!mounted) return;
      setAuthUser(user);
      setUnreadCount(0);
      if (!user) {
        setWelcomeName("");
        setIsAdmin(false);
        return;
      }

      const fallbackName = resolveUserName(user);
      setWelcomeName(fallbackName);

      const adminSession = await getClientAdminSession();
      if (!mounted) return;
      setIsAdmin(adminSession.isAdmin);

      if (adminSession.isAdmin) {
        setWelcomeName(adminSession.email || fallbackName || "Academy Administrator");
        return;
      }

      try {
        const email = user.email ?? "";
        const { data, error } = await supabase
          .from("students")
          .select("full_name")
          .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.full_name && mounted) {
          setWelcomeName(String(data.full_name));
        }
      } catch {
        setWelcomeName(fallbackName);
      }
    }

    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const supabase = createClient();
        if (!authUser) return;

        const { count, error } = await supabase
          .from("student_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", authUser.id)
          .is("read_at", null)
          .is("deleted_at", null);

        if (!error) setUnreadCount(count ?? 0);
      } catch {
        setUnreadCount(0);
      }
    }

    loadUnreadCount();
  }, [authUser, pathname]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent | PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthUser(null);
    setWelcomeName("");
    setUnreadCount(0);
    setOpenMenu(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header ref={headerRef} className="sticky top-0 z-[9999] border-b border-gold-500/20 bg-navy-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 overflow-visible px-4 py-2 sm:px-6 lg:px-8">
          <Link href="/" className="logo-section flex shrink-0 items-center">
            <AFFStandardLogo
              priority
              className="h-12 w-[300px] sm:h-14 sm:w-[350px] lg:h-[72px] lg:w-[260px]"
              imageClassName="object-contain object-left"
            />
          </Link>

          <nav className="relative hidden min-w-0 flex-1 shrink items-center justify-center gap-7 overflow-visible lg:flex">
            <TopLink href="/" label="Home" active={pathname === "/"} />
            {visibleNavGroups.map((group, index) => (
              <DesktopDropdown
                key={group.label}
                group={group}
                pathname={pathname}
                unreadCount={unreadCount}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                alignRight={index >= visibleNavGroups.length - 2}
              />
            ))}
          </nav>

          <AuthNavigation
            user={authUser}
            displayName={displayName}
            links={authenticatedLinks}
            pathname={pathname}
            onLogout={logout}
            desktop
          />

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
              {visibleNavGroups.map((group) => (
                <MobileGroup
                  key={group.label}
                  group={group}
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
              <AuthNavigation user={authUser} displayName={displayName} links={authenticatedLinks} pathname={pathname} onLogout={logout} onNavigate={() => setMobileOpen(false)} />
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

function resolveUserName(user: User | null) {
  if (!user) return "";
  const metadata = user.user_metadata ?? {};
  if (typeof metadata.full_name === "string" && metadata.full_name.trim()) return metadata.full_name.trim();
  if (typeof metadata.name === "string" && metadata.name.trim()) return metadata.name.trim();
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name.trim() : "";
  const lastName = typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || user.email?.split("@")[0] || "Student";
}

function AuthNavigation({
  user,
  displayName,
  links,
  pathname,
  onLogout,
  onNavigate,
  desktop = false
}: {
  user: User | null;
  displayName: string;
  links: NavLink[];
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
  desktop?: boolean;
}) {
  if (!user) {
    return (
      <div className={desktop ? "hidden shrink-0 items-center gap-2 border-l border-gold-500/20 pl-3 lg:flex" : "grid grid-cols-2 gap-2 pt-1"}>
        <Link href="/login" onClick={onNavigate} className={desktop ? "border border-gold-500/45 px-3 py-2 text-xs font-semibold text-gold-300 transition hover:border-gold-300 hover:text-white" : "border border-gold-500/40 px-3 py-3 text-center text-sm font-semibold text-gold-300"}>
          Login
        </Link>
        <Link href="/enrollment" onClick={onNavigate} className={desktop ? "bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950 transition hover:bg-gold-300" : "bg-gold-500 px-3 py-3 text-center text-sm font-bold text-navy-950"}>
          Enroll
        </Link>
      </div>
    );
  }

  return (
    <div className={desktop ? "hidden max-w-[410px] shrink-0 items-center gap-2 border-l border-gold-500/20 pl-3 lg:flex" : "grid gap-2 border-t border-gold-500/14 pt-3"}>
      <p className={desktop ? "max-w-36 truncate text-right text-xs font-semibold text-gold-300" : "px-3 text-sm font-semibold text-gold-300"}>
        Welcome, {displayName}
      </p>
      <div className={desktop ? "flex items-center gap-2" : "grid gap-2"}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={
              desktop
                ? `border px-3 py-2 text-xs font-semibold transition ${pathname === link.href ? "border-gold-300 text-white" : "border-gold-500/35 text-gold-300 hover:border-gold-300 hover:text-white"}`
                : `border border-gold-500/24 px-3 py-3 text-sm font-semibold ${pathname === link.href ? "text-gold-300" : "text-white"}`
            }
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onLogout}
          className={desktop ? "bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950 transition hover:bg-gold-300" : "bg-gold-500 px-3 py-3 text-sm font-bold text-navy-950"}
        >
          Logout
        </button>
      </div>
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

function DesktopDropdown({
  group,
  pathname,
  unreadCount,
  openMenu,
  setOpenMenu,
  alignRight
}: {
  group: NavGroup;
  pathname: string;
  unreadCount: number;
  openMenu: string | null;
  setOpenMenu: (menu: string | null) => void;
  alignRight?: boolean;
}) {
  const active = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const isOpen = openMenu === group.label;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)}
        className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold uppercase tracking-[.12em] transition ${active || isOpen ? "text-gold-300" : "text-ink/76 hover:text-white"}`}
      >
        {group.label}
        <ChevronDown className={`transition ${isOpen ? "rotate-180" : ""}`} size={14} />
      </button>
      {isOpen ? (
        <div className={`absolute top-full z-[99999] w-64 pt-3 pointer-events-auto ${alignRight ? "right-0" : "left-0"}`}>
          <div className="border border-[rgba(212,175,55,0.32)] bg-navy-950 p-2 shadow-gold">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenMenu(null)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition ${pathname === item.href ? "bg-gold-500 text-navy-950" : "text-ink/78 hover:bg-navy-800 hover:text-white"}`}
              >
                <span>{item.label}</span>
                {item.href === "/messages" && unreadCount > 0 ? <NotificationBadge count={unreadCount} /> : null}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
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
