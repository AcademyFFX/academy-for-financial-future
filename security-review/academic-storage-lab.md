# Isolated academic storage laboratory
Preparation only. Never target production or Civic staging. No paid provisioning.
Use a disposable local storage emulator or local Supabase instance with synthetic identities only. Abort if the endpoint is not loopback. Do not import production credentials or files.
## Fixtures
Create two synthetic students A and B, assigned instructor I, evaluator E, unrelated staff U, and anonymous visitor. Create active and expired entitlements and enrolled and unenrolled course relationships. Use disposable private buckets representing course assets and submissions.
Create synthetic text documents for published lesson, draft lesson, workbook, instructor answer key, and separate assignments owned by A and B. Generate a short original test video locally for range and seeking tests. No real student records.
## Acceptance matrix
- Anonymous and unrelated students cannot read protected objects directly or obtain signed links.
- Enrolled entitled A can obtain published lesson and workbook links; expired or unenrolled A cannot.
- Draft student lesson denied; instructor answer key only assigned instructor.
- Assignment A accessible to A and assigned evaluator, not B or unrelated staff.
- Reject mismatched asset identity, bucket, path and missing classification before signing.
- Verify signer uses trusted endpoint and private bucket; test actual expiration and bearer-link behavior.
- Test video range requests, seeking, renewal after expiry, authorized download and upload/replace.
- Verify metadata and lesson text access separately; no persistent signed URLs or token logging.
- Confirm no production endpoint contacted; destroy disposable fixtures after run.
Record each test as pass, fail or not run, with redacted evidence. A mock signer is not evidence of storage enforcement. Production remains NO-GO until real isolated tests, application compatibility and separate approval.
