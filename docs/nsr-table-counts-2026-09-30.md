# NSR (Neon `nsr`) — exact row counts, 2026-09-30

Every base table, `count(*)` over a direct connection. Total: **5,261,457** rows across 42 tables. Materialized views (derived, excluded from the total): 67,152 rows across 3.

| rows | table |
|---:|---|
| 1,404,442 | public.nsr_authors |
| 1,210,113 | public.nsr_nuclides |
| 686,880 | public.nsr_subjects |
| 303,568 | public.nsr |
| 277,068 | public.nsr_embeddings |
| 277,068 | public.nsr_embeddings_nsr |
| 229,143 | public.nsr_reactions |
| 214,376 | public.nsr_topics |
| 198,295 | public.ensdf_refs |
| 152,006 | public.nsr_train_mining |
| 128,190 | public.authors |
| 62,402 | public.distinct_authors (matview) |
| 27,070 | public.exfor_entries |
| 23,515 | public.nsr_exfor |
| 20,917 | public.xundl_refs |
| 20,120 | public.ensdf_datasets |
| 12,072 | public.xundl_archive_datasets |
| 10,043 | public.nuclide_dict |
| 9,995 | public.nsr_eval_queries |
| 9,995 | public.nsr_eval_queries_candidate |
| 9,323 | public.reaction_dict |
| 9,323 | public.reaction_display |
| 7,565 | public.author_aliases |
| 6,922 | public.xundl_datasets |
| 4,277 | public.distinct_nuclides (matview) |
| 4,023 | public.nsr_mass_ranges |
| 3,721 | public.nsr_z_ranges |
| 1,312 | public.particle_dict |
| 1,149 | public.collaboration_names |
| 739 | public.ensdf_index |
| 606 | public.journals |
| 575 | public.subject_dict |
| 529 | public.decay_processes |
| 473 | public.distinct_reactions (matview) |
| 357 | public.ensdf_archive_files |
| 316 | public.endf_reports |
| 51 | public.chat_sessions |
| 30 | public.query_vec_cache |
| 16 | public.research_feed |
| 12 | public.workspace_views |
| 5 | public.community_issues |
| 4 | public.community_posts |
| 3 | public.community_threads |
| 0 | public.nsr_embeddings_commercial |
| 0 | public.xundl_archive_files |
