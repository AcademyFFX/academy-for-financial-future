import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const middleware = read("middleware.ts");
const studentDashboard = read("app/student-dashboard/page.tsx");
const studentCourses = read("app/student-courses/page.tsx");
const studentLessonViewer = read("app/student-courses/[courseId]/lessons/[lessonId]/page.tsx");
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
const adminLmsManager = read("components/admin-lms-manager.tsx");
const courseUploadCenter = read("components/course-upload-center.tsx");
const studentDirectoryPage = read("app/student-directory/page.tsx");
const lessonVideoPersistenceMigration = read("supabase/migrations/20260806_repair_lesson_video_metadata_persistence.sql");

assert.match(middleware, /\["\/student-dashboard", "\/admin"\]/, "administrator /student-dashboard must redirect to /admin");
assert.match(middleware, /\["\/student-profile", "\/admin\/profile"\]/, "administrator /student-profile must redirect to /admin/profile");
assert.match(middleware, /\["\/billing", "\/admin"\]/, "administrator /billing must redirect to /admin");
assert.match(middleware, /\["\/courses", "\/admin\/course-management"\]/, "administrator /courses must redirect to /admin/course-management");
assert.match(middleware, /\["\/profile", "\/admin\/profile"\]/, "administrator /profile must redirect to /admin/profile");
assert.match(middleware, /\["\/my-courses", "\/admin\/course-management"\]/, "administrator /my-courses must redirect to /admin/course-management");
assert.match(middleware, /\["\/student-courses", "\/admin\/course-management"\]/, "administrator /student-courses must redirect to /admin/course-management");
assert.match(middleware, /isStudentLessonPreview/, "middleware must allow administrators to preview individual student lesson pages");
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
assert.match(studentCourses, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "student courses must redirect admins before loading enrollments");
assert.match(studentCourses, /\.from\("students"\)[\s\S]*\.eq\("auth_user_id", user\.id\)/, "student courses must locate the student through students.auth_user_id");
assert.match(studentCourses, /\.from\("enrollments"\)[\s\S]*\.eq\("student_id", studentId\)/, "student courses must load enrollments through the internal students.id");
assert.match(studentCourses, /\.from\("lesson_progress"\)[\s\S]*\.eq\("student_id", user\.id\)/, "student courses must scope lesson progress to the authenticated user");
assert.match(studentCourses, /\.from\("certificates"\)[\s\S]*\.eq\("student_id", user\.id\)/, "student courses must scope certificate records to the authenticated user");
assert.doesNotMatch(studentCourses, /SERVICE_ROLE|service_role|hardcoded/i, "student courses must not expose service-role access or hardcoded student data");
assert.match(studentLessonViewer, /\.from\("students"\)[\s\S]*\.eq\("auth_user_id", user\.id\)/, "student lesson viewer must locate students by auth_user_id");
assert.match(studentLessonViewer, /\.from\("enrollments"\)[\s\S]*\.eq\("student_id", studentId\)/, "student lesson viewer must verify enrollment through internal students.id");
assert.match(studentLessonViewer, /\.from\("lesson_progress"\)[\s\S]*upsert/, "student lesson viewer must persist completion through lesson_progress upsert");
assert.match(studentLessonViewer, /youtubeEmbedUrl/, "student lesson viewer must parse YouTube classroom URLs");
assert.match(studentLessonViewer, /vimeoEmbedUrl/, "student lesson viewer must parse Vimeo classroom URLs");
assert.match(studentLessonViewer, /isDirectVideo\(url\)/, "student lesson viewer must detect MP4/uploaded classroom video URLs");
assert.match(studentLessonViewer, /Lesson media is being prepared by the Academy\./, "student lesson viewer must preserve the no-media placeholder");
assert.match(studentLessonViewer, /Playback tracking is available for direct Academy video files\./, "iframe providers must not claim precise playback tracking without provider APIs");
assert.match(studentLessonViewer, /\.from\("video_progress"\)[\s\S]*\.eq\("auth_user_id", user\.id\)[\s\S]*\.eq\("course_id", Number\(idOf\(course\)\)\)[\s\S]*\.eq\("lesson_id", Number\(idOf\(lesson\)\)\)/, "student lesson viewer must load playback progress for only the authenticated student");
assert.match(studentLessonViewer, /\.from\("video_progress"\)[\s\S]*\.upsert\([\s\S]*onConflict: "auth_user_id,course_id,lesson_id"/, "student lesson viewer must upsert playback progress through the video_progress composite key");
assert.match(studentLessonViewer, /state\.isAdmin[\s\S]*return/, "administrator preview must not write playback progress");
assert.match(studentLessonViewer, /Lesson video is temporarily unavailable\./, "invalid media URLs must not crash the lesson page");
assert.match(studentLessonViewer, /\.from\("lesson_notes"\)[\s\S]*\.eq\("auth_user_id", user\.id\)[\s\S]*\.eq\("course_id", numericCourseId\)[\s\S]*\.eq\("lesson_id", numericLessonId\)[\s\S]*\.maybeSingle\(\)/, "student lesson viewer must load the authenticated student's cloud lesson note");
assert.match(studentLessonViewer, /\.from\("lesson_notes"\)[\s\S]*\.upsert\([\s\S]*onConflict: "auth_user_id,course_id,lesson_id"/, "student lesson viewer must upsert notes through the lesson_notes composite key");
assert.match(studentLessonViewer, /savedText !== textBeingSaved/, "student lesson viewer must verify the returned Supabase note before showing success");
assert.match(studentLessonViewer, /if \(!noteText\.trim\(\) && localNote\.trim\(\)\)/, "local note migration must not overwrite an existing cloud note");
assert.match(studentLessonViewer, /Student private notes are unavailable in administrator preview/, "administrator preview must not create or edit private student notes");
assert.match(studentLessonViewer, /Offline copy only — reconnect to sync with your AFF account/, "offline fallback must not claim cloud persistence");
assert.doesNotMatch(studentLessonViewer, /SERVICE_ROLE|service_role/i, "student lesson viewer must not expose service-role access");
assert.match(studentProfile, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin\/profile"\)/, "student profile must redirect admins before student data fallbacks");
assert.match(billing, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "billing must redirect admins before membership fallback creation");
assert.match(studentProfile, /\.from\("students"\)[\s\S]*profile_photo_url/, "student profile photos must persist to the existing students table");
assert.match(studentProfile, /\.eq\("auth_user_id", authenticatedUserId\)[\s\S]*\.select\("id, student_id, auth_user_id, profile_photo_url"\)[\s\S]*\.single\(\)/, "student profile photo update must match auth_user_id, return the saved students row, and require a single row");
assert.match(studentProfile, /verifiedUrl !== publicUrl/, "student profile photo upload must verify the saved URL equals the generated Storage URL");
assert.doesNotMatch(studentProfile, /\.from\("student_profiles"\)|student_profiles\.profile_photo_url/, "student profile page must not reference the missing student_profiles table for photo persistence");

assert.match(directoryRoute, /getAffAdminStatus\(\)/, "student directory API must check server-side admin status");
assert.match(directoryRoute, /status: 403/, "student directory API must deny non-admin requests");
assert.match(directoryRoute, /\.from\("students"\)[\s\S]*profile_photo_url/, "student directory API must read profile photos from the existing students table");
assert.doesNotMatch(directoryRoute, /\.from\("student_profiles"\)|student_profiles\.profile_photo_url/, "student directory API must not reference the missing student_profiles table for profile photos");

const adminLinksBlock = siteShell.match(/const adminNavGroups:[\s\S]*?const navGroups/)?.[0] ?? "";
const publicHeaderBlock = siteShell.slice(
  siteShell.indexOf('<div className="mx-auto flex max-w-[1440px]'),
  siteShell.indexOf("{mobileOpen ?")
);
assert.doesNotMatch(adminLinksBlock, /label: "Profile"/, "admin auth links must not use student profile label");
assert.doesNotMatch(adminLinksBlock, /label: "Billing"/, "admin auth links must not expose student billing");
assert.doesNotMatch(adminLinksBlock, /label: "My Courses"/, "admin auth links must not expose student courses");
assert.match(siteShell, /href: "\/student-courses", label: "My Courses"/, "student My Courses navigation must use the protected student courses dashboard");
assert.match(siteShell, /label: "Admin Profile"/, "admin navigation must include Admin Profile");
assert.match(siteShell, /href: "\/admin\/command-center", label: "Command Center"/, "admin navigation must include Admin Command Center");
assert.doesNotMatch(siteShell, /visibleNavGroups/, "public top navigation must not be replaced with administrator links");
assert.match(siteShell, /const authenticatedLinks = isAdmin \? \[\] : studentAuthLinks/, "administrator buttons must not be mixed into the top auth navigation");
assert.match(siteShell, /function AdminNavigationRow/, "administrator navigation must render in a dedicated second row");
assert.match(siteShell, /AFF ADMINISTRATION/, "dedicated administrator row must be clearly labeled");
assert.match(siteShell, /Admin Menu/, "administrator navigation must provide a mobile menu");
assert.match(siteShell, /const adminNavGroups:[\s\S]*Dashboard[\s\S]*Students[\s\S]*Courses[\s\S]*Media Center[\s\S]*Live Academy[\s\S]*Analytics[\s\S]*Administration/, "administrator navigation must be grouped into enterprise toolbar sections");
assert.match(siteShell, /<AdminNavigationRow[\s\S]*groups=\{adminNavGroups\}/, "administrator groups must be passed only to the second row");
assert.match(siteShell, /<AuthNavigation[\s\S]*links=\{authenticatedLinks\}/, "public header auth controls must use the non-admin authenticated links set");
assert.doesNotMatch(publicHeaderBlock, /adminNavGroups|AdminNavigationRow/, "administrator navigation must not render inside the public top header row");
assert.match(adminProfile, /getAffAdminStatus\(\)/, "admin profile must read administrator role through getAffAdminStatus");
assert.match(executiveCommandCenter, /getClientAdminStatus\(\)/, "executive command center must use aff_admin_users admin status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV === "production"/, "admin route audit must detect production mode");
assert.match(adminRouteAudit, /Admin dashboard ready\./, "production admin route audit must show only simple success status");
assert.match(adminRouteAudit, /Administrator authorization required\./, "production admin route audit must show only simple denial status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV !== "production"[\s\S]*console\.info/, "verbose admin route diagnostics must be development-only");
assert.doesNotMatch(adminRouteAudit, /Supabase config/, "admin route audit must not render Supabase configuration details");
assert.doesNotMatch(adminStatusRoute, /SUPABASE_SERVICE_ROLE_KEY|hasSupabaseServiceRoleKey|supabaseHost|environment/, "admin status API must not expose Supabase environment configuration");
assert.doesNotMatch(adminClient, /hasSupabaseServiceRoleKey|supabaseHost|environment/, "browser admin client must not carry Supabase environment configuration");
assert.match(adminLmsManager, /function videoUrlValidationMessage/, "admin course manager must validate lesson video URLs before saving");
assert.match(adminLmsManager, /youtube\.com[\s\S]*youtu\.be/, "admin course manager must accept YouTube watch, short, and embed URLs");
assert.match(adminLmsManager, /vimeo\.com[\s\S]*endsWith\("\.vimeo\.com"\)/, "admin course manager must accept Vimeo and player URLs");
assert.match(adminLmsManager, /mp4\|webm\|mov/, "admin course manager must accept browser-playable direct media URLs");
assert.match(adminLmsManager, /javascript\|data/, "admin course manager must reject unsafe javascript and data URLs");
assert.match(adminLmsManager, /Local file paths cannot be saved/, "admin course manager must reject accidental local file paths");
assert.match(adminLmsManager, /Use a temporary public test video URL for technical verification/, "admin course manager must explain the temporary test video workflow");
assert.match(adminLmsManager, /\.from\("lessons"\)\.update\(payload\)\.eq\("id", Number\(lessonForm\.lessonId\)\)\.select/, "admin course manager must update the existing lesson row and read it back");
assert.match(adminLmsManager, /Lesson media saved successfully\./, "admin course manager must show verified media save confirmation");
assert.match(adminLmsManager, /savedProvider !== lessonForm\.videoProvider \|\| savedUrl !== expectedUrl/, "admin course manager must verify returned database media fields before reporting success");
assert.match(adminLmsManager, /resetLessonPlaybackProgress/, "admin course manager must expose an optional reset playback progress action");
assert.match(adminLmsManager, /\.from\("video_progress"\)\.delete\(\)\.eq\("lesson_id", Number\(lessonId\)\)/, "admin reset must target only the selected lesson playback rows");
assert.match(courseUploadCenter, /External Lesson Video/, "course upload center must expose the external lesson video panel after lesson selection");
assert.match(courseUploadCenter, /selectedLesson \? \(/, "external lesson video panel must render only when a valid lesson is selected");
assert.match(courseUploadCenter, /Attach a YouTube, Vimeo, or direct browser-playable video URL to the selected lesson\./, "external video panel must describe supported external URL workflow");
assert.match(courseUploadCenter, /youtube\.com[\s\S]*youtu\.be/, "upload center must accept YouTube watch, short, and embed URLs");
assert.match(courseUploadCenter, /vimeo\.com[\s\S]*endsWith\("\.vimeo\.com"\)/, "upload center must accept Vimeo video and player URLs");
assert.match(courseUploadCenter, /mp4\|webm\|mov/, "upload center must accept direct MP4, WebM, and MOV URLs");
assert.match(courseUploadCenter, /javascript\|data/, "upload center must reject unsafe javascript and data URLs");
assert.match(courseUploadCenter, /Local computer paths cannot be saved/, "upload center must reject local computer paths");
assert.match(courseUploadCenter, /Preview Video/, "upload center must provide an administrator preview button");
assert.match(courseUploadCenter, /Save Lesson Video/, "upload center must provide a save lesson video button");
assert.match(courseUploadCenter, /type="button" onClick=\{saveExternalLessonVideo\}/, "save lesson video button must fire the explicit click handler without submitting a parent form");
assert.match(courseUploadCenter, /Saving lesson video\.\.\./, "save lesson video workflow must show an immediate saving state");
assert.match(courseUploadCenter, /Remove Video/, "upload center must provide a remove video button");
assert.match(courseUploadCenter, /Reset Playback Progress/, "upload center must provide a confirmed reset playback action");
assert.match(courseUploadCenter, /Unable to identify the selected lesson\. Please reselect the course and lesson\./, "missing or mismatched selected lessons must show a clear error");
assert.match(courseUploadCenter, /parseDurationSeconds[\s\S]*parts\.reduce\(\(total, part\) => total \* 60 \+ part, 0\)/, "duration values such as 10:34 must convert to integer seconds");
assert.match(courseUploadCenter, /\.from\("lessons"\)[\s\S]*\.update\(payload\)[\s\S]*\.eq\("id", selectedLessonId\)[\s\S]*\.eq\("course_id", selectedCourseId\)[\s\S]*\.select\(lessonVideoColumns\)/, "upload center must update only the selected lesson row for the selected course");
assert.match(courseUploadCenter, /\.from\("lessons"\)[\s\S]*\.select\(lessonVideoColumns\)[\s\S]*\.eq\("id", selectedLessonId\)[\s\S]*\.eq\("course_id", selectedCourseId\)[\s\S]*\.single\(\)/, "upload center must read back the saved lesson row after update");
assert.match(courseUploadCenter, /Database update returned no lesson row\./, "database updates that return no row must be treated as failures");
assert.match(courseUploadCenter, /Permission denied while updating the lesson/, "Supabase RLS or permission failures must be visible to the admin");
assert.match(courseUploadCenter, /confirmedDuration !== expectedDuration/, "read-back verification must include persisted duration");
assert.match(courseUploadCenter, /confirmedThumbnail !== expectedThumbnail/, "read-back verification must include persisted thumbnail URL");
assert.match(courseUploadCenter, /Lesson video saved successfully\./, "upload center must show success only after Supabase verifies the lesson video row");
assert.match(courseUploadCenter, /Saved: \{new Date\(lastVideoSavedAt\)\.toLocaleString\(\)\}/, "successful saves must display the saved timestamp");
assert.match(courseUploadCenter, /Restoring the Academy classroom placeholder[\s\S]*video_provider: "none"[\s\S]*video_url: null/, "upload center must remove video metadata and restore the placeholder");
assert.match(courseUploadCenter, /video_provider: "uploaded_video"[\s\S]*video_url: publicUrl[\s\S]*select\("id, video_provider, video_url, video_title"\)/, "computer video upload must connect the uploaded Storage URL to the selected lesson and verify it");
assert.doesNotMatch(courseUploadCenter, /\.from\("lessons"\)\.insert\(/, "upload center must not create duplicate lessons when saving lesson video metadata");
assert.match(courseUploadCenter, /Video Upload/, "existing computer video upload card must remain available");
assert.match(courseUploadCenter, /PDF Notes/, "existing PDF upload card must remain available");
assert.match(courseUploadCenter, /PowerPoint Upload/, "existing PowerPoint upload card must remain available");
assert.match(courseUploadCenter, /Assignment Upload/, "existing assignment upload card must remain available");
assert.match(courseUploadCenter, /Course Thumbnail/, "existing course thumbnail upload card must remain available");
assert.match(lessonVideoPersistenceMigration, /alter table public\.lessons add column if not exists video_provider text/, "lesson video persistence migration must add missing provider column idempotently");
assert.match(lessonVideoPersistenceMigration, /grant update \([\s\S]*video_provider[\s\S]*video_url[\s\S]*video_duration_seconds[\s\S]*\) on public\.lessons to authenticated/, "lesson video persistence migration must grant only required update columns");
assert.match(lessonVideoPersistenceMigration, /create policy "AFF admins can update lesson video metadata"[\s\S]*for update[\s\S]*using \(public\.is_aff_admin\(\)\)[\s\S]*with check \(public\.is_aff_admin\(\)\)/, "lesson video persistence migration must restrict lesson metadata updates to active AFF admins");
assert.doesNotMatch(lessonVideoPersistenceMigration, /grant insert|grant delete|for all/i, "lesson video persistence migration must not grant broad student lesson-edit permissions");

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
