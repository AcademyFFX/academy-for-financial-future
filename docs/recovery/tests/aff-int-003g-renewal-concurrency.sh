#!/usr/bin/env bash
set -euo pipefail
# Disposable PostgreSQL laboratory only, after 003E succeeds.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
sql="SELECT public.aff_record_verified_renewal('evt_race_renew','in_race_renew','pi_race_renew','00000000-0000-4000-8000-000000000002','sub_test',1000,'usd','2027-01-01','2026-12-01');"
psql -X -v ON_ERROR_STOP=1 -At >"$tmp/first" <<SQL &
BEGIN;
SET LOCAL ROLE service_role;
$sql
SELECT pg_sleep(2);
COMMIT;
SQL
first=$!
psql -X -v ON_ERROR_STOP=1 -At >"$tmp/second" <<SQL &
BEGIN;
SET LOCAL ROLE service_role;
$sql
COMMIT;
SQL
second=$!
wait "$first"
wait "$second"
test "$(grep -hxc extended "$tmp/first" "$tmp/second" | awk '{s+=$1} END{print s}')" = 1
test "$(grep -hxc already_recorded "$tmp/first" "$tmp/second" | awk '{s+=$1} END{print s}')" = 1
psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
 IF (SELECT count(*) FROM public.aff_financial_ledger WHERE provider_object_id='pi_race_renew' AND livemode AND entry_type='payment')<>1
 OR (SELECT count(*) FROM public.aff_renewal_receipts WHERE invoice_id='in_race_renew')<>1
 OR (SELECT count(*) FROM public.aff_renewal_event_bindings WHERE event_id='evt_race_renew')<>1
 OR (SELECT current_period_end FROM public.student_memberships WHERE id='00000000-0000-4000-8000-000000000002') IS DISTINCT FROM '2027-01-01'::timestamptz
 THEN RAISE EXCEPTION 'concurrent renewal invariant failed'; END IF;
END $$;
SQL
