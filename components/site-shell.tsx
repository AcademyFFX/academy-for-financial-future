"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Radio,
  Settings,
  Users,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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

type AdminNavGroup = NavGroup & {
  icon: LucideIcon;
  description: string;
};

const studentAuthLinks: NavLink[] = [
  { href: "/student-dashboard", label: "Dashboard" },
  { href: "/student-courses", label: "My Courses" },
  { href: "/student-profile", label: "Profile" },
  { href: "/billing", label: "Billing" }
];
const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Academy operations overview",
    items: [
      { href: "/admin", label: "Admin Dashboard" },
      { href: "/admin/command-center", label: "Command Center" }
    ]
  },
  {
    label: "Students",
    icon: Users,
    description: "Enrollment, directory, and student records",
    items: [
      { href: "/student-directory", label: "Student Management" },
      { href: "/admin/enrollment", label: "Enrollment Review" }
    ]
  },
  {
    label: "Courses",
    icon: BookOpen,
    description: "LMS, assets, exams, and certificates",
    items: [
      { href: "/admin/course-management", label: "Course Manager" },
      { href: "/admin/course-management/upload-center", label: "Upload Center" },
      { href: "/admin/certifications", label: "Certification Center" }
    ]
  },
  {
    label: "Media Center",
    icon: MonitorPlay,
    description: "Broadcasting and content channels",
    items: [
      { href: "/broadcast-network", label: "Broadcast Network" },
      { href: "/tv-studio", label: "AFF TV Studio" },
      { href: "/broadcast-network/eyes-on-society", label: "Eyes on Society TV" }
    ]
  },
  {
    label: "Live Academy",
    icon: Radio,
    description: "Live classroom and academy events",
    items: [
      { href: "/admin/live-classroom", label: "Live Classroom" },
      { href: "/events", label: "Events Division" },
      { href: "/homework-center", label: "Homework Center" }
    ]
  },
  {
    label: "Analytics",
    icon: BarChart3,
    description: "Executive and performance intelligence",
    items: [
      { href: "/executive-command-center", label: "Executive Command Center" },
      { href: "/admin/command-center", label: "Admin Command Center" }
    ]
  },
  {
    label: "Administration",
    icon: Settings,
    description: "Profiles, governance, and university controls",
    items: [
      { href: "/admin/profile", label: "Admin Profile" },
      { href: "/university", label: "Global University" },
      { href: "/accreditation", label: "Accreditation Authority" }
    ]
  }
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
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [openAdminMenu, setOpenAdminMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const authenticatedLinks = isAdmin ? [] : studentAuthLinks;
  const displayName = welcomeName || resolveUserName(authUser);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setAdminMenuOpen(false);
    setOpenAdminMenu(null);
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
        setOpenAdminMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setOpenAdminMenu(null);
        setAdminMenuOpen(false);
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
    setAdminMenuOpen(false);
    setOpenAdminMenu(null);
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
            {navGroups.map((group, index) => (
              <DesktopDropdown
                key={group.label}
                group={group}
                pathname={pathname}
                unreadCount={unreadCount}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                alignRight={index >= navGroups.length - 2}
              />
            ))}
          </nav>

          {isAdmin && authUser ? (
            <div className="hidden shrink-0 items-center border-l border-gold-500/20 pl-4 lg:flex">
              <p className="max-w-[220px] truncate text-right text-xs font-semibold text-gold-300">Welcome, {displayName}</p>
            </div>
          ) : (
            <AuthNavigation
              user={authUser}
              displayName={displayName}
              links={authenticatedLinks}
              pathname={pathname}
              onLogout={logout}
              desktop
            />
          )}

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
              {!isAdmin ? <AuthNavigation user={authUser} displayName={displayName} links={authenticatedLinks} pathname={pathname} onLogout={logout} onNavigate={() => setMobileOpen(false)} /> : null}
            </div>
          </div>
        ) : null}
        {isAdmin && authUser ? (
          <AdminNavigationRow
            groups={adminNavGroups}
            pathname={pathname}
            displayName={displayName}
            menuOpen={adminMenuOpen}
            setMenuOpen={setAdminMenuOpen}
            openAdminMenu={openAdminMenu}
            setOpenAdminMenu={setOpenAdminMenu}
            onLogout={logout}
          />
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

function AdminNavigationRow({
  groups,
  pathname,
  displayName,
  menuOpen,
  setMenuOpen,
  openAdminMenu,
  setOpenAdminMenu,
  onLogout
}: {
  groups: AdminNavGroup[];
  pathname: string;
  displayName: string;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  openAdminMenu: string | null;
  setOpenAdminMenu: (menu: string | null) => void;
  onLogout: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const activeGroup = groups.find((group) => group.items.some((item) => isActive(item.href)));

  return (
    <section className="border-t border-gold-500/20 bg-[linear-gradient(180deg,rgba(10,24,51,0.98),rgba(10,24,51,0.92))] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden h-10 w-10 shrink-0 place-items-center border border-gold-500/35 bg-navy-950/70 text-gold-300 sm:grid">
              <GraduationCap size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.24em] text-gold-300">AFF ADMINISTRATION</p>
              <p className="mt-1 truncate text-xs text-ink/62">
                Enterprise university management{displayName ? ` · ${displayName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Toggle administrator navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex shrink-0 items-center gap-2 border border-gold-500/35 bg-navy-950/70 px-3 py-2 text-xs font-semibold text-gold-300 transition hover:border-gold-300 hover:bg-navy-800 hover:text-white md:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
            Admin Menu
          </button>
        </div>

        <div className="hidden items-stretch gap-2 md:flex md:flex-wrap">
          {groups.map((group) => {
            const Icon = group.icon;
            const groupActive = group.items.some((item) => isActive(item.href));
            const isOpen = openAdminMenu === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setOpenAdminMenu(isOpen ? null : group.label)}
                  onMouseEnter={() => setOpenAdminMenu(group.label)}
                  className={`group flex h-full min-h-12 items-center gap-2 border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[.08em] transition ${
                    groupActive || isOpen
                      ? "border-gold-300 bg-gold-500 text-navy-950 shadow-gold"
                      : "border-gold-500/24 bg-navy-950/55 text-ink/78 hover:border-gold-300 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <Icon size={16} className={groupActive || isOpen ? "text-navy-950" : "text-gold-300 transition group-hover:text-gold-200"} />
                  <span>{group.label}</span>
                  <ChevronDown size={13} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen ? (
                  <div
                    className="absolute left-0 top-full z-[99999] w-80 pt-2"
                    onMouseEnter={() => setOpenAdminMenu(group.label)}
                    onMouseLeave={() => setOpenAdminMenu(null)}
                  >
                    <div className="border border-gold-500/35 bg-navy-950 p-2 shadow-gold">
                      <div className="border-b border-gold-500/14 px-3 py-2">
                        <p className="text-xs font-bold uppercase tracking-[.16em] text-gold-300">{group.label}</p>
                        <p className="mt-1 text-xs text-ink/62">{group.description}</p>
                      </div>
                      <div className="grid gap-1 pt-2">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenAdminMenu(null)}
                            className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold transition ${
                              isActive(item.href)
                                ? "bg-gold-500 text-navy-950"
                                : "text-ink/78 hover:bg-navy-800 hover:text-white"
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={onLogout}
            className="ml-auto inline-flex min-h-12 shrink-0 items-center gap-2 bg-gold-500 px-4 py-2 text-xs font-bold uppercase tracking-[.08em] text-navy-950 transition hover:bg-gold-300"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {menuOpen ? (
          <div className="grid gap-3 border-t border-gold-500/14 pt-3 md:hidden">
            {groups.map((group) => {
              const Icon = group.icon;

              return (
                <details key={group.label} className="border border-gold-500/20 bg-navy-950/65" open={activeGroup?.label === group.label}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-bold uppercase tracking-[.1em] text-gold-300 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <Icon size={16} />
                      {group.label}
                    </span>
                    <ChevronDown size={15} />
                  </summary>
                  <div className="grid gap-1 border-t border-gold-500/14 p-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`border px-3 py-3 text-sm font-semibold ${
                          isActive(item.href)
                            ? "border-gold-300 bg-gold-500 text-navy-950"
                            : "border-gold-500/16 text-white hover:border-gold-300 hover:text-gold-300"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              );
            })}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 bg-gold-500 px-3 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-300"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </section>
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
