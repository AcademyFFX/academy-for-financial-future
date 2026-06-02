import { createServerClient } from "@supabase/ssr";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/journal", "/assignments", "/exams", "/certificates", "/admin"];

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

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/journal/:path*", "/assignments/:path*", "/exams/:path*", "/certificates/:path*", "/admin/:path*"]
};
