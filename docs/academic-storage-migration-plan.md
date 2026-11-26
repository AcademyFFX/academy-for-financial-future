# Academic storage protection — proposed rollout
Status: NO-GO for production changes until acceptance gates and separate owner approval.
## Preparation
Inventory all object references, external media hosts, upload and download callers, and audience classifications privately. Reconcile references to canonical bucket/key pairs; identify missing and ambiguous references. Preserve object keys and content. Capture existing bucket settings and policy definitions privately; do not commit student identifiers, signed URLs or secrets.
## Compatibility
Use disposable synthetic fixtures, no paid provisioning or production student data. Verify owner and evaluator assignment access, cross-user denial, student enrollment and entitlement expiry, draft and instructor-only denial, administrative workflows, upload/replace behavior, video range requests, seeking and link renewal. Test direct object URLs and storage API reads as anonymous and unrelated authenticated users. Check database content and metadata access separately; signing alone cannot protect public objects or exposed lesson text.
## Proposed rollout
First integrate trusted server-side authorization and private/no-store link responses in a disabled-by-default application path. Verify actual signer host and private bucket state. Separate intentionally public branding from protected assets. Prioritize assignment confidentiality; do not change bucket visibility until replacement read and upload paths pass tests. Use an approved maintenance window, staged cutover and immediate verification. Preserve all existing academic records. Do not modify profile or chart buckets in this phase.
## Recovery
Stop rollout on access failures, unexpected disclosure or missing references. Disable affected delivery paths and prefer forward repair; do not restore public access to confidential files as an automatic rollback. Retain private configuration snapshots and object inventory. Escalate any suspected exposure for confidential incident assessment.
## Acceptance
Confirm CI and preview build, realistic isolated storage tests, policy and metadata review, direct URL denial, authorized access and playback, recovery rehearsal, and explicit production approval. Five-minute signed link lifetime is provisional. No payment activation, certification changes, production writes or paid services authorized.
