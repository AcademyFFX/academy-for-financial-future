import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getAffAdminStatusFromSupabase } from "./lib/admin-status";
import { hasFullCourseAccess } from "./lib/membership-state";

const protectedRoutes = ["/login", "/student-dashboard", "/dashboard", "/profile", "/student-profile", "/my-courses", "/student-courses", "/aff-os", "/mobile-super-app", "/alumni-network", "/publishing-house", "/economic-intelligence", "/investment-bank", "/governance-school", "/think-tank", "/university", "/courses", "/journal", "/assignments", "/exams", "/certificates", "/live-trading-room", "/trading-simulator", "/trading-floor", "/social-network", "/tv-studio", "/executive-command-center", "/accreditation", "/career-center", "/research-institute", "/events", "/global-network", "/campus-expansion", "/endowment-fund", "/foundation", "/civic-leadership", "/digital-civilization", "/human-flourishing", "/marketplace", "/billing", "/messages", "/ai-coach", "/voice-coach", "/chart-analyst", "/admin", "/student-directory"];
const enrollmentRestrictedRoutes = ["/journal", "/assignments", "/exams", "/certificates", "/live-trading-room", "/trading-simulator", "/social-network", "/tv-studio"];
const adminOnlyRoutes = ["/admin", "/student-directory", "/executive-command-center"];
const adminRedirects: Array<[string, string]> = [
  ["/student-dashboard", "/admin"],
  ["/dashboard", "/admin"],
  ["/profile", "/admin/profile"],
  ["/student-profile", "/admin/profile"],
  ["/billing", "/admin"],
  ["/my-courses", "/admin/course-management"],
  ["/student-courses", "/admin/course-management"],
  ["/courses", "/admin/course-management"]
];

export async function middleware(request: NextRequest) {
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: Partial<ResponseCookie>) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: Partial<ResponseCookie>) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname === "/login";
  if (!user) {
    if (isLoginRoute) return response;

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const adminStatus = await getAffAdminStatusFromSupabase(supabase);
  const isAdmin = adminStatus.authorized;

  if (isLoginRoute && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  const adminRedirect = adminRedirects.find(([route]) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`));
  if (isAdmin && adminRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = adminRedirect[1];
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  const requiresAdmin = adminOnlyRoutes.some((route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`));
  if (requiresAdmin) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/access-denied";
      url.searchParams.set("from", request.nextUrl.pathname.replace(/^\//, ""));
      return NextResponse.redirect(url);
    }
  }

  const requiresEnrollment = enrollmentRestrictedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  if (requiresEnrollment && !isAdmin) {
    const { data, error } = await supabase
      .from("student_memberships")
      .select("selected_membership_plan, active_membership_plan, membership_plan, account_status, payment_status, membership_status, trial_ends_at, current_period_end")
      .eq("student_id", user.id)
      .maybeSingle();

    if (!error) {
      if (!hasFullCourseAccess(data)) {
        const url = request.nextUrl.clone();
        url.pathname = "/billing";
        url.searchParams.set("restricted", "membership");
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/login", "/student-dashboard", "/student-dashboard/:path*", "/dashboard", "/dashboard/:path*", "/profile", "/profile/:path*", "/student-profile", "/student-profile/:path*", "/my-courses", "/my-courses/:path*", "/student-courses", "/student-courses/:path*", "/aff-os/:path*", "/mobile-super-app/:path*", "/alumni-network/:path*", "/publishing-house/:path*", "/economic-intelligence/:path*", "/investment-bank/:path*", "/governance-school/:path*", "/think-tank/:path*", "/university/:path*", "/courses", "/courses/:path*", "/journal/:path*", "/assignments/:path*", "/exams/:path*", "/certificates/:path*", "/live-trading-room/:path*", "/trading-simulator/:path*", "/trading-floor/:path*", "/social-network/:path*", "/tv-studio/:path*", "/executive-command-center/:path*", "/accreditation/:path*", "/career-center/:path*", "/research-institute/:path*", "/events/:path*", "/global-network/:path*", "/campus-expansion/:path*", "/endowment-fund/:path*", "/foundation/:path*", "/civic-leadership/:path*", "/digital-civilization/:path*", "/human-flourishing/:path*", "/marketplace/:path*", "/billing", "/billing/:path*", "/messages/:path*", "/ai-coach/:path*", "/voice-coach/:path*", "/chart-analyst/:path*", "/admin", "/admin/:path*", "/student-directory", "/student-directory/:path*"]
};
