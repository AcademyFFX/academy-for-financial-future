import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/course-media-access.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { canSignCourseMedia } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const base = { isAdmin: false, assetStatus: "Published", studentId: 8, enrollmentStudentId: 8, enrollmentCourseId: 12, assetCourseId: 12, enrollmentStatus: "Active" };
assert.equal(canSignCourseMedia(base), true, "active enrolled student");
assert.equal(canSignCourseMedia({ ...base, isAdmin: true, studentId: null, enrollmentStudentId: null }), true, "admin");
assert.equal(canSignCourseMedia({ ...base, studentId: null }), false, "anonymous or missing student");
assert.equal(canSignCourseMedia({ ...base, enrollmentStudentId: 9 }), false, "other student's enrollment");
assert.equal(canSignCourseMedia({ ...base, enrollmentCourseId: 13 }), false, "other course");
assert.equal(canSignCourseMedia({ ...base, enrollmentStatus: "Revoked" }), false, "revoked");
assert.equal(canSignCourseMedia({ ...base, enrollmentStatus: "Pending" }), false, "pending");
assert.equal(canSignCourseMedia({ ...base, assetStatus: "Draft" }), false, "draft asset");
assert.equal(canSignCourseMedia({ ...base, enrollmentStatus: "Completed" }), true, "completed");
console.log("Course media access policy: 9 assertions passed");
