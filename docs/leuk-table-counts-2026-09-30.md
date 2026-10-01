# Leuk public (Neon `leuk-public`) — exact row counts, 2026-09-30

Every base table, `count(*)` over a direct connection. Total: **31,527,931** rows across 88 tables. Materialized views (derived, excluded from the total): 5,396,051 rows across 13.

| rows | table |
|---:|---|
| 16,452,641 | public.provider_rate_signals |
| 9,671,888 | public.nppes_npi |
| 2,441,556 | public.provider_network_participation |
| 1,765,261 | public.org_tin_npi_rates (matview) |
| 1,163,331 | public.org_network_rates (matview) |
| 1,091,544 | public.rate_service_rows_mv (matview) |
| 941,014 | public.org_tin_rate_summary (matview) |
| 719,947 | public.nppes_other_names |
| 588,640 | public.form5500_schedule_a |
| 556,512 | public.nppes_endpoints |
| 165,361 | public.org_tin_rosters (matview) |
| 163,523 | public.org_affiliations |
| 150,635 | public.form5500_filings |
| 144,865 | public.rate_table_child_mv (matview) |
| 124,163 | public.directory_providers |
| 105,557 | public.organizations |
| 104,060 | public.nppes_organizations |
| 99,511 | public.provider_qualifications |
| 67,111 | public.uhc_employer_census |
| 56,646 | public.fhir_healthcare_services |
| 52,375 | public.form5500_sf_filings |
| 44,916 | public.fhir_locations |
| 44,093 | public.provider_rate_summary (matview) |
| 39,701 | public.provider_participation_summary (matview) |
| 38,984 | public.rate_table_mv (matview) |
| 29,795 | public.tin_registry |
| 20,542 | public.plans |
| 19,356 | public.cms_rvu |
| 16,934 | public.provider_merge_map |
| 8,725 | public.hcpcs_codes |
| 6,462 | public.directory_programs |
| 5,851 | public.fhir_organizations |
| 5,572 | public.employers |
| 2,960 | public.audit_events |
| 2,664 | public.fhir_org_affiliations |
| 2,589 | public.uhc_census_matches |
| 1,658 | public.rate_bands_license_summary (matview) |
| 1,133 | public.payer_network_map |
| 1,133 | public.payer_networks |
| 883 | public.nucc_taxonomy |
| 809 | public.fhir_insurance_plans |
| 808 | public.payer_unmatched_npis |
| 719 | public.sessions |
| 242 | public.dfs_insurers |
| 189 | public.rate_bands_payer_summary (matview) |
| 186 | public.appointments |
| 117 | public.sync_runs |
| 109 | public.cms_gpci |
| 101 | public.insurer_aliases |
| 89 | public.network_aliases |
| 72 | public.networks |
| 48 | public.insurers |
| 37 | public.insurer_companies |
| 36 | public.payer_rate_totals (matview) |
| 32 | public.notes |
| 30 | public.availability |
| 27 | public.agent_skills |
| 23 | public.lead_reports |
| 20 | public.cpt_codes |
| 18 | public.clients |
| 16 | public.messages |
| 16 | public.stripe_events |
| 14 | public.forms |
| 14 | public.invoice_items |
| 14 | public.rate_bands_checked_payers (matview) |
| 12 | public.invoices |
| 12 | public.payer_sources |
| 9 | public.notifications |
| 9 | public.payments |
| 9 | public.threads |
| 8 | public.insurance_policies |
| 7 | public.users |
| 5 | public.provider_profiles |
| 5 | public.services |
| 4 | public.files |
| 4 | public.note_amendments |
| 3 | public.form_responses |
| 3 | public.note_templates |
| 3 | public.payers |
| 2 | public.cms_pfs_config |
| 2 | public.locations |
| 2 | public.nppes_sync_log |
| 2 | public.transcripts |
| 1 | neon_auth.project_config |
| 1 | public.schema_drafts |
| 1 | public.stripe_connect_accounts |
| 0 | neon_auth.account |
| 0 | neon_auth.invitation |
| 0 | neon_auth.jwks |
| 0 | neon_auth.member |
| 0 | neon_auth.organization |
| 0 | neon_auth.session |
| 0 | neon_auth.user |
| 0 | neon_auth.verification |
| 0 | public.canvas_maps |
| 0 | public.password_tokens |
| 0 | public.provider_affiliation_attestations |
| 0 | public.provider_applications |
| 0 | public.provider_leads |
| 0 | public.referrals |
| 0 | public.stripe_payment_splits |
