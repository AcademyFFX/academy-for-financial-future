import assert from "node:assert/strict";

const required = [
  "AFF_MEDIA_STAGING_URL",
  "AFF_MEDIA_ASSET_ID",
  "AFF_MEDIA_ADMIN_JWT",
  "AFF_MEDIA_ENROLLED_JWT",
  "AFF_MEDIA_UNENROLLED_JWT",
  "AFF_MEDIA_REVOKED_JWT",
  "AFF_MEDIA_DRAFT_ASSET_ID"
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing staging-only configuration: ${missing.join(", ")}`);
  process.exit(2);
}

const baseUrl = process.env.AFF_MEDIA_STAGING_URL;
const url = new URL("/api/course-media/sign", baseUrl);
if (!/^https:$/.test(url.protocol)) throw new Error("Staging preview must use HTTPS");
if (/academy-for-financial-future\.vercel\.app$/i.test(url.hostname)) {
  throw new Error("Refusing canonical production hostname");
}
const assetId = process.env.AFF_MEDIA_ASSET_ID;
const draftId = process.env.AFF_MEDIA_DRAFT_ASSET_ID;
const call = async (token, id = assetId, raw = undefined) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: raw ?? JSON.stringify({ assetId: id }),
    redirect: "manual"
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload, headers: response.headers };
};
const cases = [
  ["missing token", null, assetId, 401],
  ["invalid token", "invalid-token", assetId, 401],
  ["malformed asset ID", process.env.AFF_MEDIA_ADMIN_JWT, "not-a-uuid", 400],
  ["admin access", process.env.AFF_MEDIA_ADMIN_JWT, assetId, 200],
  ["enrolled student", process.env.AFF_MEDIA_ENROLLED_JWT, assetId, 200],
  ["unenrolled student", process.env.AFF_MEDIA_UNENROLLED_JWT, assetId, 403],
  ["revoked enrollment", process.env.AFF_MEDIA_REVOKED_JWT, assetId, 403],
  ["draft student access", process.env.AFF_MEDIA_ENROLLED_JWT, draftId, 403]
];
for (const [name, token, id, expected] of cases) {
  const response = await call(token, id);
  assert.equal(response.status, expected, `${name}: expected ${expected}, got ${response.status}`);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i, `${name}: response must not be cached`);
  if (expected === 200) {
    assert.equal(typeof response.payload.url, "string", `${name}: missing signed URL`);
    assert.equal(response.payload.expiresIn, 300, `${name}: unexpected TTL`);
    const signedUrl = new URL(response.payload.url);
    assert.equal(signedUrl.protocol, "https:", `${name}: signed URL must use HTTPS`);
  }
  console.log(`PASS: ${name}`);
}
console.log("Eight staging HTTP scenarios passed. Manual private-storage and expiry checks remain required.");
