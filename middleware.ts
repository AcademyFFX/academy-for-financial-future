import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/student-dashboard", "/dashboard", "/courses", "/journal", "/assignments", "/exams", "/certificates", "/live-trading-room", "/trading-simulator", "/social-network", "/tv-studio", "/executive-command-center", "/accreditation", "/career-center", "/research-institute", "/events", "/campus-expansion", "/endowment-fund", "/foundation", "/civic-leadership", "/marketplace", "/billing", "/messages", "/ai-coach", "/admin"];
const enrollmentRestrictedRoutes = ["/journal", "/assignments", "/exams", "/certificates", "/live-trading-room", "/trading-simulator", "/social-network", "/tv-studio"];

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

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const requiresEnrollment = enrollmentRestrictedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
  if (requiresEnrollment && user.email?.toLowerCase() !== "acafffx@gmail.com") {
    const { data, error } = await supabase
      .from("student_memberships")
      .select("account_status, trial_ends_at, current_period_end")
      .eq("student_id", user.id)
      .maybeSingle();

    if (!error) {
      const activeUntil = data?.current_period_end ?? data?.trial_ends_at;
      const hasActivePeriod = activeUntil ? new Date(activeUntil).getTime() > Date.now() : false;
      const hasAccess = data?.account_status === "Active" || (data?.account_status === "Trial" && hasActivePeriod) || hasActivePeriod;

      if (!hasAccess) {
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
  matcher: ["/student-dashboard/:path*", "/dashboard/:path*", "/courses/:path*", "/journal/:path*", "/assignments/:path*", "/exams/:path*", "/certificates/:path*", "/live-trading-room/:path*", "/trading-simulator/:path*", "/social-network/:path*", "/tv-studio/:path*", "/executive-command-center/:path*", "/accreditation/:path*", "/career-center/:path*", "/research-institute/:path*", "/events/:path*", "/campus-expansion/:path*", "/endowment-fund/:path*", "/foundation/:path*", "/civic-leadership/:path*", "/marketplace/:path*", "/billing/:path*", "/messages/:path*", "/ai-coach/:path*", "/admin/:path*"]
};
