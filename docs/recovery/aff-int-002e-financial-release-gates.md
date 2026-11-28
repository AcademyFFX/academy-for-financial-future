# AFF-INT-002E — Financial authorization release gates
Status: NO-GO for live payments. Read-only production audit, 2026-11-27.
Evidence: authenticated table-level INSERT/UPDATE and all 20 membership columns; owner UPDATE policy; validation trigger derives Paid from active nontrial plan. Exploit not tested. Five membership rows must be preserved.
Existing source: fix/aff-financial-authorization, docs/aff-financial-release-audit.md, lib/subscription-entitlement.ts, scripts/financial-security-tests.mjs.
Required before migration:
1. Inventory every membership writer (browser, admin, checkout, webhook, RPC); move privileged writes to authorized server operations. Preserve legitimate trial and pending checkout flows.
2. Remove direct client financial writes; verify effective grants including inherited roles and RPCs. Require verified provider evidence for activation, idempotent event handling and audit records. No automatic certification.
3. Test student A/B, anonymous, admin and trusted server roles with disposable identities in an isolated environment. Deny self-upgrade, forged paid status, expiry extension, cross-account access and replay; verify legitimate checkout, renewal, cancellation and suspension.
4. Review commercial schema draft for repeatability, sequence privileges, RLS, existing-table drift, server-only writes and catalog fallback. No seeds or payment activation without approval.
5. Verify all eight tables, policies, grants, original membership rows, application build and existing financial CI. Prepare rollback that refuses to drop tables containing data; restore permissions only under reviewed security controls.
6. Obtain separate approval for staging target and production deployment. Civic staging must remain untouched; no paid provisioning.
This document is a test plan, not evidence of passing tests or an implemented membership repair.
