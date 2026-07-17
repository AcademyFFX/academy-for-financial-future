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
const adminServer = read("lib/admin-server.ts");
const executiveCommandCenter = read("app/executive-command-center/page.tsx");
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
assert.match(middleware, /\.from\("aff_admin_users"\)/, "middleware must resolve administrator role from aff_admin_users");
assert.match(middleware, /\.eq\("role", "administrator"\)/, "middleware admin authorization must require administrator role");
assert.match(middleware, /\.eq\("is_active", true\)/, "middleware admin authorization must require active admin row");
assert.match(middleware, /const adminOnlyRoutes = \["\/admin", "\/student-directory", "\/executive-command-center"\]/, "executive command center must be admin-only");
assert.match(adminServer, /\.eq\("role", "administrator"\)/, "server admin helper must require administrator role");
assert.match(adminServer, /\.eq\("is_active", true\)/, "server admin helper must require active admin row");
assert.match(authRole, /adminRow\?\.is_active === true && adminRow\.role === "administrator"/, "shared role resolver must require role and active status");

assert.match(studentDashboard, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "student dashboard must redirect admins before student data fallbacks");
assert.match(studentProfile, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin\/profile"\)/, "student profile must redirect admins before student data fallbacks");
assert.match(billing, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "billing must redirect admins before membership fallback creation");

assert.match(directoryRoute, /isAffAdminUser\(user\.id\)/, "student directory API must check server-side admin role");
assert.match(directoryRoute, /status: 403/, "student directory API must deny non-admin requests");

const adminLinksBlock = siteShell.match(/const adminAuthLinks:[\s\S]*?];/)?.[0] ?? "";
assert.doesNotMatch(adminLinksBlock, /label: "Profile"/, "admin auth links must not use student profile label");
assert.doesNotMatch(adminLinksBlock, /label: "Billing"/, "admin auth links must not expose student billing");
assert.doesNotMatch(adminLinksBlock, /label: "My Courses"/, "admin auth links must not expose student courses");
assert.match(siteShell, /label: "Admin Profile"/, "admin navigation must include Admin Profile");
assert.match(siteShell, /label: "Command Center"/, "admin navigation must include Command Center");
assert.match(adminProfile, /getAffAdminRole\(user\.id\)/, "admin profile must read administrator role from aff_admin_users");
assert.match(executiveCommandCenter, /getClientAdminStatus\(\)/, "executive command center must use aff_admin_users admin status");

for (const [route, source] of [
  ["/admin/certifications", adminCertifications],
  ["/admin/live-classroom", adminLiveClassroom],
  ["/admin/enrollment", adminEnrollment],
  ["/admin/course-management", adminCourseManagement],
  ["/admin/course-management/upload-center", adminUploadCenter],
  ["/student-directory", studentDirectoryPage],
  ["/admin/profile", adminProfile],
  ["/executive-command-center", executiveCommandCenter]
]) {
  assert.match(source, /AdminRouteAudit/, `${route} must display admin route authorization diagnostics`);
}

assert.doesNotMatch(adminCertifications, /redirect\("\/certifications"\)/, "/admin/certifications must not redirect through student-facing route alias");
assert.doesNotMatch(adminLiveClassroom, /redirect\("\/live-classroom"\)/, "/admin/live-classroom must not redirect through student-facing route alias");

console.log("AFF role access tests passed.");
