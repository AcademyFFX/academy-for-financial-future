import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const chartReportSource = read("lib/chart-report.ts");
const isolatedChartReportSource = chartReportSource.replace(/import type \{ ChartAnalystSection \} from "@\/lib\/chart-analyst";\n/, "");
const chartReportModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(isolatedChartReportSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);

const validRow = {
  id: 17,
  student_id: "student-1",
  file_name: "eurusd.png",
  file_type: "image/png",
  file_size: 1024,
  storage_path: "student-1/eurusd.png",
  public_url: "https://project.supabase.co/storage/v1/object/public/chart-analyst-uploads/student-1/eurusd.png",
  platform: "TradingView",
  dr_moricette_review_mode: false,
  summary: "Valid production report",
  overall_grade: 88,
  risk_rating: "Moderate",
  sections: JSON.stringify([{ title: "Market Structure", finding: "Bullish structure", grade: "Professional", action: "Mark swing points" }]),
  created_at: "2026-10-26T12:00:00.000Z"
};

const report = chartReportModule.normalizeChartReport(validRow);
assert.ok(report, "a valid production report must normalize");
assert.equal(report.sections.length, 1, "jsonb returned as a JSON string must still expose its analysis sections");
assert.equal(report.sections[0].title, "Market Structure");
assert.deepEqual(chartReportModule.getChartAssetPresentation(report), {
  kind: "image",
  url: validRow.public_url,
  label: "eurusd.png"
}, "a valid chart image must produce a renderable image presentation");

const recovered = chartReportModule.normalizeChartReport({ ...validRow, id: 18, public_url: null }, "https://project.supabase.co/recovered.png");
assert.equal(recovered.public_url, "https://project.supabase.co/recovered.png", "legacy reports must recover their public URL from storage_path");
assert.equal(chartReportModule.getChartAssetPresentation(recovered).kind, "image");
const privateAsset = chartReportModule.normalizeChartReport(validRow, "https://project.supabase.co/storage/v1/object/sign/chart-analyst-uploads/student-1/eurusd.png?token=signed");
assert.match(privateAsset.public_url, /\/object\/sign\//, "an authorized signed URL must replace a legacy public URL");

const malformed = chartReportModule.normalizeChartReport({ ...validRow, id: 19, sections: "not-json" });
assert.deepEqual(malformed.sections, [], "malformed legacy sections must not crash the chart page");
assert.equal(chartReportModule.normalizeChartReport({ ...validRow, id: 20, public_url: "javascript:alert(1)" }).public_url, null, "unsafe chart URLs must not be rendered");
assert.equal(chartReportModule.getChartAssetPresentation(chartReportModule.normalizeChartReport({ ...validRow, id: 21, file_name: "packet.pdf", file_type: "application/pdf" })).kind, "document", "valid PDF chart packets must remain accessible");

const chartPage = read("app/chart-analyst/page.tsx");
const aiCenter = read("app/ai-center/page.tsx");
const affOS = read("app/aff-os/page.tsx");
const studentDashboard = read("app/student-dashboard/page.tsx");
const executiveCommandCenter = read("app/executive-command-center/page.tsx");
const migration = read("supabase/migrations/20261026_restore_aff_chart_visibility.sql");
const privateStorageMigration = read("supabase/migrations/20261027_secure_aff_chart_storage.sql");

assert.match(chartPage, /getClientAdminStatus\(\)/, "Chart Analyst must resolve the canonical admin role");
assert.match(chartPage, /if \(!admin\) query = query\.eq\("student_id", user\.id\)/, "students must remain scoped to their own chart reports");
assert.match(chartPage, /<img[\s\S]*src=\{activeAsset\.url\}/, "the Chart Analyst must render a valid uploaded chart image");
assert.match(chartPage, /createSignedUrl\(storagePath, 60 \* 60\)/, "chart files must be delivered through short-lived authorized URLs");
assert.doesNotMatch(chartPage, /getPublicUrl\(storagePath\)/, "the Chart Analyst must not recover private uploads through public URLs");
assert.match(chartPage, /No valid analysis sections were stored/, "malformed sections must show an explicit empty state instead of blanking the page");
assert.match(chartPage, /Report history could not be loaded/, "query failures must not be mislabeled as an empty report history");
assert.match(aiCenter, /getClientAdminStatus\(\)/, "AI Center chart analytics must use the canonical admin role");
assert.match(aiCenter, /admin\s*\? supabase\.from\(table\)\.select\("\*"\)/, "AI Center admins must query the full chart report set");
assert.match(affOS, /getClientAdminStatus\(\)/, "AFF OS chart signals must use the canonical admin role");
assert.match(affOS, /admin[\s\S]*from\("chart_analyst_reports"\)[\s\S]*eq\("student_id", user\.id\)/, "AFF OS must provide separate admin and student chart scopes");
assert.match(studentDashboard, /from\(table\)\.select\("\*"\)\.eq\("student_id", currentUser\.id\)[\s\S]*chart_analyst_reports|chart_analyst_reports[\s\S]*\.eq\("student_id", currentUser\.id\)/, "student dashboard chart metrics must remain student-owned");
assert.match(executiveCommandCenter, /getClientAdminStatus\(\)/, "Executive Command Center must remain admin-gated");
assert.match(migration, /auth\.uid\(\) = student_id or public\.is_aff_admin\(\)/, "RLS must expose each chart report only to its student or an active AFF admin");
assert.doesNotMatch(migration, /acafffx@gmail\.com/, "chart visibility must not depend on one hard-coded email");
assert.doesNotMatch(migration, /delete from|truncate table/i, "the chart visibility migration must preserve historical records");
assert.match(privateStorageMigration, /values \('chart-analyst-uploads', 'chart-analyst-uploads', false\)/, "the chart bucket must be private");
assert.match(privateStorageMigration, /auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\][\s\S]*public\.is_aff_admin\(\)/, "private chart files must remain readable only by their owner or an AFF administrator");
assert.doesNotMatch(privateStorageMigration, /delete from|truncate table/i, "the private-storage repair must preserve reports and uploaded objects");

console.log("Chart visibility regression tests passed.");
