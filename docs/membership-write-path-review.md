# Membership write path review — F.7B.2
Partial review only. No deployment.
Reviewed development checkout route, checkout registration adapter, membership state helper and verified checkout adapter.
Trial creation uses authenticated server identity and privileged insert; unique conflict rejects repeated trial. Paid checkout is gated and does not mutate membership. Registration and verified checkout depend on financial database objects that require deployment verification. Membership helper checks consistent state but does not itself establish payment provenance or expiry.
Remaining: enumerate all registration, dashboard, admin, billing, RPC and background writers; confirm server-only admin client and authorization at each call site; verify expiry enforcement and audit existing entitlements against trusted evidence.
Default branch code search for student_memberships returned no matches despite known references on development branch; search is not an exhaustive inventory. Branch comparison is 44 commits ahead, zero behind at review time, and does not enumerate unchanged files.
Do not revoke client writes until compatibility is established or an explicitly approved maintenance containment plan is ready. No production changes.
