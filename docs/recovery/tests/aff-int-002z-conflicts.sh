#!/usr/bin/env bash
set -euo pipefail
[[ "${PGDATABASE:-}" == aff_test && "${PGHOST:-}" == localhost ]] || exit 2
p=(psql -X -v ON_ERROR_STOP=1)
for s in conflict_a conflict_b conflict_c; do
 "${p[@]}" -c "INSERT INTO public.aff_payment_intents(checkout_session_id,membership_id,plan,amount_minor,currency,livemode,expires_at) VALUES ('cs_$s','00000000-0000-4000-8000-000000000001','test',1000,'usd',false,'2030-01-01')"
done
race() {
 local a="$1" b="$2" expected="$3" log
 log=$(mktemp)
 "${p[@]}" -c "BEGIN; SET ROLE service_role; $a; SELECT pg_sleep(2); COMMIT;" >"$log.a" 2>&1 & local pid=$!
 # Wait for the winning session to reach its sleep while holding locks.
 local ready=0
 for i in {1..100}; do
  if [[ $("${p[@]}" -Atc "SELECT count(*) FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND wait_event='PgSleep' AND query LIKE '%aff_record_verified_checkout%'") -gt 0 ]]; then ready=1; break; fi
  sleep .05
 done
 [[ "$ready" == 1 ]] || { wait "$pid"; exit 1; }
 if "${p[@]}" -c "SET ROLE service_role; $b" >"$log" 2>&1; then wait "$pid"; echo 'Unexpected conflicting success'; exit 1; fi
 wait "$pid"
 grep -F "$expected" "$log"
 rm -f "$log" "$log.a"
}
race "SELECT public.aff_record_verified_checkout('evt_ca','cs_conflict_a','pi_ca',1000,'usd',false,'2026-11-27')" "SELECT public.aff_record_verified_checkout('evt_cb','cs_conflict_a','pi_cb',1000,'usd',false,'2026-11-27')" 'checkout settlement conflict'
race "SELECT public.aff_record_verified_checkout('evt_cc','cs_conflict_b','pi_cc',1000,'usd',false,'2026-11-27')" "SELECT public.aff_record_verified_checkout('evt_cc','cs_conflict_c','pi_cd',1000,'usd',false,'2026-11-27')" 'event binding conflict'
"${p[@]}" -c "DO \$\$ BEGIN IF (SELECT count(*) FROM public.aff_financial_ledger)<>3 OR (SELECT count(*) FROM public.aff_checkout_settlements)<>3 OR (SELECT count(*) FROM public.aff_checkout_event_bindings)<>3 OR (SELECT count(*) FROM public.aff_stripe_events)<>3 THEN RAISE EXCEPTION 'unexpected committed records'; END IF; END \$\$;"
echo 'Concurrent conflicts rejected'
