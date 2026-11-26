# AFF-DEV-003-F.5A — Affiliate commission security design

Status: proposed, review only. No migration, payout or production activation authorized.
Existing affiliate schema and policy must be inventoried before implementation. Default-branch code search returned no matches; this is not evidence of absence.

## Controls
- Resolve affiliate identity and referral ownership server-side; reject self-referrals and ambiguous attribution.
- Require an eligible, settled, independently verified ledger payment. Never trust client amount, rate or referral metadata.
- Snapshot approved policy version, currency, eligible amount and rate. Use integer minor units and explicit rounding; reject unsupported currencies.
- Enforce unique commission per eligible payment and beneficiary under an approved attribution policy. Lock relevant rows and make recording atomic.
- Record immutable adjustment entries for refunds, disputes and corrections; support partial refunds and prevent over-reversal.
- Separate commission accrual, approval and payout; require authorized administrators, audit actor and reason, and provider idempotency for eventual payouts.
- Deny direct client writes to financial records; verify RLS, grants and privileged RPC authorization.
- Never activate certification as a consequence of commission activity.

## Proposed lifecycle
pending -> eligible -> approved -> paid; held or reversed via audited transitions and adjustment entries. No actual payouts in this phase.

## Unresolved business policy
Commission rate, eligible products, attribution window, refund hold, payout minimum, currency and approval roles require owner confirmation. No default commercial terms are assumed.

## Release gates
1. Inventory existing affiliate tables, constraints, policies and application paths.
2. Confirm business policy and financial ledger integration.
3. Prepare additive migration and guarded rollback for isolated testing.
4. Test duplicate/concurrent claims, authorization, rounding, refunds and payout replay.
5. Verify outstanding subscription integration and database atomicity tests.
6. Obtain separate production approval. No paid infrastructure or live payment activation.
