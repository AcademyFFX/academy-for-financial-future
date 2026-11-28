#!/usr/bin/env bash
set -euo pipefail
# Only the disposable CI database is supported.
[[ "${PGDATABASE:-}" == aff_test && "${PGHOST:-}" == localhost ]] || exit 2
p=(psql -X -v ON_ERROR_STOP=1)
"${p[@]}" -c "INSERT INTO public.aff_payment_intents VALUES ('cs_race','00000000-0000-4000-8000-000000000001','test',1000,'usd',false,'2030-01-01')"
call="SET ROLE service_role; SELECT public.aff_record_verified_checkout('evt_race','cs_race','pi_race',1000,'usd',false,'2026-11-27');"
"${p[@]}" -c "BEGIN; $call SELECT pg_sleep(2); COMMIT;" & a=$!
"${p[@]}" -c "$call" & b=$!
wait "$a"
wait "$b"
"${p[@]}" -c "DO \$\$ BEGIN IF (SELECT count(*) FROM public.aff_financial_ledger)<>1 OR (SELECT count(*) FROM public.aff_checkout_settlements)<>1 OR (SELECT count(*) FROM public.aff_checkout_event_bindings)<>1 THEN RAISE EXCEPTION 'concurrent replay duplicated records'; END IF; END \$\$;"
echo 'Concurrent identical replay passed'
