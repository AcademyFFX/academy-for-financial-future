#!/usr/bin/env node
// AFF curriculum reconciliation. Offline, read-only; no Supabase client or writes.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  if (!path) throw new Error("Usage: node scripts/cti-curriculum-dry-run.mjs <inventory.json> <manifest.json>");
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}
function normalize(value) { return String(value ?? "").trim().toLowerCase(); }
function fail(message) { throw new Error(message); }
function array(value, label) {
  if (!Array.isArray(value)) fail(label + " must be an array");
  return value;
}
function reconcile(inventory, manifest) {
  const courses = array(inventory.courses, "inventory.courses");
  const lessons = array(inventory.lessons, "inventory.lessons");
  const modules = array(inventory.modules, "inventory.modules");
  const requested = array(manifest.courses, "manifest.courses");
  const report = { mode: "OFFLINE_READ_ONLY", proposedWrites: 0, courses: [], errors: [], warnings: [] };
  const seenCodes = new Set();
  for (const planned of requested) {
    const code = normalize(planned.course_code);
    if (!code) { report.errors.push("Missing course_code"); continue; }
    if (seenCodes.has(code)) { report.errors.push("Duplicate manifest course code: " + code); continue; }
    seenCodes.add(code);
    const matches = courses.filter(row => normalize(row.course_code) === code);
    if (matches.length !== 1) {
      report.errors.push(matches.length ? "Ambiguous existing course: " + code : "Course not found; creation requires separate approval: " + code);
      continue;
    }
    const existing = matches[0];
    const entry = { course_code: planned.course_code, existing_id: existing.id, publication_status: existing.publication_status, lessons: [], modules: [] };
    if (!Array.isArray(planned.modules)) { report.errors.push("Missing module list for " + code); report.courses.push(entry); continue; }
    const seenOrders = new Set();
    for (const mod of planned.modules) {
      const order = Number(mod.order);
      if (!Number.isInteger(order) || order < 1 || seenOrders.has(order)) {
        report.errors.push("Invalid or repeated module order for " + code + ": " + mod.order);
        continue;
      }
      seenOrders.add(order);
      if (!mod.title || !mod.source_sha256 || !/^[a-f0-9]{64}$/i.test(mod.source_sha256)) {
        report.errors.push("Missing verified module title or SHA-256 for " + code + " module " + order);
        continue;
      }
      const matchesModule = modules.filter(row => String(row.course_id) === String(existing.id) &&
        normalize(row.asset_type) === "module" && normalize(row.asset_title) === normalize(mod.title));
      if (matchesModule.length > 1) report.errors.push("Duplicate existing modules: " + mod.title);
      entry.modules.push({ order, title: mod.title, status: matchesModule.length === 1 ? "EXISTS" : "REVIEW_MISSING", matched_id: matchesModule.length === 1 ? matchesModule[0].id : null });
    }
    for (const plannedLesson of array(planned.lessons ?? [], "planned lessons")) {
      if (!plannedLesson.title || !plannedLesson.source_sha256 || !/^[a-f0-9]{64}$/i.test(plannedLesson.source_sha256)) {
        report.errors.push("Missing verified lesson title or SHA-256 in " + code);
        continue;
      }
      const found = lessons.filter(row => String(row.course_id) === String(existing.id) &&
        normalize(row.lesson_title ?? row.title) === normalize(plannedLesson.title));
      if (found.length > 1) report.errors.push("Duplicate existing lessons: " + plannedLesson.title);
      entry.lessons.push({ title: plannedLesson.title, status: found.length === 1 ? "EXISTS" : "REVIEW_MISSING", matched_id: found.length === 1 ? found[0].id : null });
    }
    report.courses.push(entry);
  }
  if (!requested.length) report.errors.push("No manifest courses supplied");
  report.readyForImport = false; // Explicitly never authorizes imports.
  return report;
}
try {
  const result = reconcile(readJson(process.argv[2]), readJson(process.argv[3]));
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.errors.length) process.exitCode = 2;
} catch (error) {
  process.stderr.write("AFF reconciliation failed: " + error.message + "\n");
  process.exitCode = 2;
}
