# AFF-DEV-003-F.6A — Financial reconciliation design
Proposed design only; no production activation or commercial policy approval.

## Sources and accounting boundaries
Reconcile independently verified provider settlements against immutable internal ledger entries using provider account, transaction ID, currency and minor-unit amount. Never infer cash received from membership status. Keep gross collections, refunds, disputes, provider fees, affiliate liabilities, payouts and bank settlements separate. Do not label cash collections as recognized revenue or profit. Never aggregate currencies without an approved conversion policy.

## Reconciliation lifecycle
Import verified evidence -> match canonical identifiers -> compare amount/currency/status -> classify matched, missing, duplicate, mismatch or pending -> authorized review -> append correction with reason and evidence -> recheck. Never overwrite historical ledger entries. Unknown or incomplete evidence must remain unresolved, not zero.

## Dashboard
Read-only summaries by currency and explicit reporting period: gross verified collections, refunds, disputes, fees, net collections, affiliate accrued/adjusted/paid/outstanding amounts, settlement differences, unresolved exceptions and last verified timestamp. Restrict financial access server-side; redact personal information. Display unavailable data as unavailable.

## Release gates
Inventory existing ledger migrations before choosing schema. Confirm accounting definitions and reporting timezone with owner. Test partial refunds, duplicate events, late settlements, currency mismatch, concurrent writes, missing evidence and unauthorized reads. Verify all seven existing CI suites. Require separate approval for production changes; no paid services, live payouts or automatic certification.
