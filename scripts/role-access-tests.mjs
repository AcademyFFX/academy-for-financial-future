import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const middleware = read("middleware.ts");
const studentDashboard = read("app/student-dashboard/page.tsx");
const studentProfile = read("app/student-profile/page.tsx");
const billing = read("app/billing/page.tsx");
const siteShell = read("components/site-shell.tsx");
const directoryRoute = read("app/api/admin/student-directory/route.ts");
const adminProfile = read("app/admin/profile/page.tsx");
const authRole = read("lib/auth-role.ts");
const adminStatus = read("lib/admin-status.ts");
const adminServer = read("lib/admin-server.ts");
const adminClient = read("lib/admin-client.ts");
const adminStatusRoute = read("app/api/auth/admin-status/route.ts");
const adminRouteAudit = read("components/admin-route-audit.tsx");
const executiveCommandCenter = read("app/executive-command-center/page.tsx");
const adminCommandCenter = read("app/admin/command-center/page.tsx");
const adminCertifications = read("app/admin/certifications/page.tsx");
const adminLiveClassroom = read("app/admin/live-classroom/page.tsx");
const adminEnrollment = read("app/admin/enrollment/page.tsx");
const adminCourseManagement = read("app/admin/course-management/page.tsx");
const adminUploadCenter = read("app/admin/course-management/upload-center/page.tsx");
const studentDirectoryPage = read("app/student-directory/page.tsx");

assert.match(middleware, /\["\/student-dashboard", "\/admin"\]/, "administrator /student-dashboard must redirect to /admin");
assert.match(middleware, /\["\/student-profile", "\/admin\/profile"\]/, "administrator /student-profile must redirect to /admin/profile");
assert.match(middleware, /\["\/billing", "\/admin"\]/, "administrator /billing must redirect to /admin");
assert.match(middleware, /\["\/courses", "\/admin\/course-management"\]/, "administrator /courses must redirect to /admin/course-management");
assert.match(middleware, /\["\/profile", "\/admin\/profile"\]/, "administrator /profile must redirect to /admin/profile");
assert.match(middleware, /\["\/my-courses", "\/admin\/course-management"\]/, "administrator /my-courses must redirect to /admin/course-management");
assert.match(middleware, /getAffAdminStatusFromSupabase\(supabase\)/, "middleware must resolve administrator role through the shared admin status helper");
assert.match(adminStatus, /\.from\("aff_admin_users"\)/, "shared admin status helper must query aff_admin_users");
assert.match(adminStatus, /\.eq\("user_id", userId\)/, "shared admin status helper must match by user_id first");
assert.match(adminStatus, /\.eq\("email", email\)/, "shared admin status helper must optionally match by normalized email");
assert.match(adminStatus, /new Set\(\["administrator", "admin"\]\)/, "shared admin status helper must accept administrator or admin roles");
assert.match(adminStatus, /params\.row\?\.is_active === true/, "shared admin status helper must require active admin row");
assert.match(middleware, /const isLoginRoute = request\.nextUrl\.pathname === "\/login"/, "middleware must make /login role-aware");
assert.match(middleware, /isLoginRoute && isAdmin[\s\S]*url\.pathname = "\/admin"/, "authenticated admins opening /login must redirect to /admin");
assert.match(middleware, /const adminOnlyRoutes = \["\/admin", "\/student-directory", "\/executive-command-center"\]/, "executive command center must be admin-only");
assert.match(adminServer, /export async function getAffAdminStatus\(\)/, "server admin helper must export getAffAdminStatus");
assert.match(adminServer, /getAffAdminStatusFromSupabase\(createSupabaseServerClient\(\)\)/, "server admin helper must use the cookie-aware Supabase server client");
assert.match(authRole, /\["administrator", "admin"\]\.includes/, "legacy role resolver must accept administrator/admin roles");

assert.match(studentDashboard, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "student dashboard must redirect admins before student data fallbacks");
assert.match(studentProfile, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin\/profile"\)/, "student profile must redirect admins before student data fallbacks");
assert.match(billing, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "billing must redirect admins before membership fallback creation");

assert.match(directoryRoute, /getAffAdminStatus\(\)/, "student directory API must check server-side admin status");
assert.match(directoryRoute, /status: 403/, "student directory API must deny non-admin requests");

const adminLinksBlock = siteShell.match(/const adminAuthLinks:[\s\S]*?];/)?.[0] ?? "";
const publicHeaderBlock = siteShell.slice(
  siteShell.indexOf('<div className="mx-auto flex max-w-[1440px]'),
  siteShell.indexOf("{mobileOpen ?")
);
assert.doesNotMatch(adminLinksBlock, /label: "Profile"/, "admin auth links must not use student profile label");
assert.doesNotMatch(adminLinksBlock, /label: "Billing"/, "admin auth links must not expose student billing");
assert.doesNotMatch(adminLinksBlock, /label: "My Courses"/, "admin auth links must not expose student courses");
assert.match(siteShell, /label: "Admin Profile"/, "admin navigation must include Admin Profile");
assert.match(siteShell, /href: "\/admin\/command-center", label: "Command Center"/, "admin navigation must include Admin Command Center");
assert.doesNotMatch(siteShell, /visibleNavGroups/, "public top navigation must not be replaced with administrator links");
assert.match(siteShell, /const authenticatedLinks = isAdmin \? \[\] : studentAuthLinks/, "administrator buttons must not be mixed into the top auth navigation");
assert.match(siteShell, /function AdminNavigationRow/, "administrator navigation must render in a dedicated second row");
assert.match(siteShell, /AFF ADMINISTRATION/, "dedicated administrator row must be clearly labeled");
assert.match(siteShell, /Admin Menu/, "administrator navigation must provide a mobile menu");
assert.match(siteShell, /<AdminNavigationRow[\s\S]*links=\{adminAuthLinks\}/, "administrator links must be passed only to the second row");
assert.match(siteShell, /<AuthNavigation[\s\S]*links=\{authenticatedLinks\}/, "public header auth controls must use the non-admin authenticated links set");
assert.doesNotMatch(publicHeaderBlock, /adminAuthLinks|AdminNavigationRow/, "administrator navigation must not render inside the public top header row");
assert.match(adminProfile, /getAffAdminStatus\(\)/, "admin profile must read administrator role through getAffAdminStatus");
assert.match(executiveCommandCenter, /getClientAdminStatus\(\)/, "executive command center must use aff_admin_users admin status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV === "production"/, "admin route audit must detect production mode");
assert.match(adminRouteAudit, /Admin dashboard ready\./, "production admin route audit must show only simple success status");
assert.match(adminRouteAudit, /Administrator authorization required\./, "production admin route audit must show only simple denial status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV !== "production"[\s\S]*console\.info/, "verbose admin route diagnostics must be development-only");
assert.doesNotMatch(adminRouteAudit, /Supabase config/, "admin route audit must not render Supabase configuration details");
assert.doesNotMatch(adminStatusRoute, /SUPABASE_SERVICE_ROLE_KEY|hasSupabaseServiceRoleKey|supabaseHost|environment/, "admin status API must not expose Supabase environment configuration");
assert.doesNotMatch(adminClient, /hasSupabaseServiceRoleKey|supabaseHost|environment/, "browser admin client must not carry Supabase environment configuration");

for (const [route, source] of [
  ["/admin/certifications", adminCertifications],
  ["/admin/live-classroom", adminLiveClassroom],
  ["/admin/enrollment", adminEnrollment],
  ["/admin/course-management", adminCourseManagement],
  ["/admin/course-management/upload-center", adminUploadCenter],
  ["/admin/command-center", adminCommandCenter],
  ["/student-directory", studentDirectoryPage],
  ["/admin/profile", adminProfile],
  ["/executive-command-center", executiveCommandCenter]
]) {
  assert.match(source, /AdminRouteAudit/, `${route} must display admin route authorization diagnostics`);
}

assert.doesNotMatch(adminCertifications, /redirect\("\/certifications"\)/, "/admin/certifications must not redirect through student-facing route alias");
assert.doesNotMatch(adminLiveClassroom, /redirect\("\/live-classroom"\)/, "/admin/live-classroom must not redirect through student-facing route alias");

console.log("AFF role access tests passed.");
