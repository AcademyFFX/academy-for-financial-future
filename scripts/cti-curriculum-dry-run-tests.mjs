import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "aff-cti-"));
try {
  const inventory = { courses: [
    { id: 19, course_code: "AFF-CTI-101", publication_status: "Published" },
    { id: 20, course_code: "AFF-CTI-102", publication_status: "Draft" }
  ], lessons: [], modules: [] };
  const hash = "a".repeat(64);
  const manifest = { courses: [{ course_code: "AFF-CTI-101", modules: [{ order: 1, title: "Verified Module", source_sha256: hash }], lessons: [] }] };
  const inventoryPath = join(dir, "inventory.json");
  const manifestPath = join(dir, "manifest.json");
  writeFileSync(inventoryPath, JSON.stringify(inventory));
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const run = () => spawnSync(process.execPath, ["scripts/cti-curriculum-dry-run.mjs", inventoryPath, manifestPath], { encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  let report = JSON.parse(result.stdout);
  assert.equal(report.mode, "OFFLINE_READ_ONLY");
  assert.equal(report.proposedWrites, 0);
  assert.equal(report.readyForImport, false);
  assert.equal(report.courses[0].existing_id, 19);
  assert.equal(report.courses[0].publication_status, "Published");
  assert.equal(report.courses[0].modules[0].status, "REVIEW_MISSING");
  manifest.courses[0].modules[0].source_sha256 = "unverified";
  writeFileSync(manifestPath, JSON.stringify(manifest));
  result = run();
  assert.equal(result.status, 2);
  assert.match(result.stdout, /Missing verified module title or SHA-256/);
  console.log("AFF CTI offline dry-run tests passed");
} finally { rmSync(dir, { recursive: true, force: true }); }
