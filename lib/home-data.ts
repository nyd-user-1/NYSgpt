/**
 * The homepage's two data plates, shared between the page (masthead + contents
 * grid) and the switchboard panel (which lives in the root layout so it can
 * follow the reader across routes). One copy, or the panel and the page drift.
 */

export type HomeCardData = {
  href: string;
  /**
   * The name the panel prints as its header. Set where `href` is the
   * password-protected Amplify address (2026-10-01), so the header still reads
   * as the product's own domain rather than a build hostname.
   */
  domain?: string;
  title: string;
  /** The project's primary accent — title color + light bg tint when active. */
  accent: string;
  body: string;
  /** Raw count from the project's database; compact() handles the display. */
  value: number;
  unit: string;
  /**
   * Paper cards (Refresh) only: the bottom-left mono line — "Published
   * January 10, 2026". Products leave it unset and print value + unit there.
   */
  footer?: string;
  /**
   * Open in THIS tab rather than a new one. Set for 44B — the flagship the
   * mothership hands the reader to — so following it reads as moving deeper
   * into the system rather than leaving it. The nine other sub-brand
   * deployments keep the new tab.
   */
  sameTab?: boolean;
  /**
   * Sub-stats for the panel's product view — rendered as a ruled 2-col grid
   * beneath the headline figure. Only cards with measured breakdowns set it.
   * The panel sorts them large → small at render, so order here is free.
   * `href` is the surface holding that layer — every cell is a live link, and
   * it must be a PUBLIC index (44B's detail pages sit behind auth).
   */
  stats?: { value: number; unit: string; href: string }[];
};

/** The masthead ledger — four headline totals, from the full count of
 *  2026-10-01: every record held, in every database and inside every file
 *  (docs/TASK-SWITCHBOARD-COUNTS.md, 12,021,607,502 in all). Legislative is
 *  the Policy project, Energy is Energy + Solar, Healthcare is the EHR. */
export const LEDGER = [
  { value: 12_021_607_502, unit: "Government Records" },
  { value: 6_170_256_205, unit: "Legislative Records" },
  { value: 4_867_901_988, unit: "Energy Records" },
  { value: 592_386_952, unit: "Healthcare Records" },
];

/** The ten products — the contents plate, and the panel's product rows. */
export const CARDS: HomeCardData[] = [
  {
    href: "https://amplify.d39b380ic58tna.amplifyapp.com", domain: "44b.nysgpt.com", title: "Artificial Intelligence", accent: "#033882",
    body: "Select patents, papers, and policies concerning AI, the research behind them, and related peer review records.",
    // Measured 2026-08-24 from the corpus DB (139 GB): every row in the public
    // schema, 102 tables. The sub-stats are the same measurement's breakdown;
    // citations = document citations (21.24M) + patent citations (11.17M).
    value: 379_859_662, unit: "records",
    stats: [
      // The paper layer
      { value: 3_561_047, unit: "papers", href: "https://amplify.d39b380ic58tna.amplifyapp.com/library" },
      { value: 32_410_264, unit: "citations", href: "https://amplify.d39b380ic58tna.amplifyapp.com/citations" },
      { value: 1_608_839, unit: "full texts", href: "https://amplify.d39b380ic58tna.amplifyapp.com/library" },
      { value: 2_098_936, unit: "embeddings", href: "https://amplify.d39b380ic58tna.amplifyapp.com/sources" },
      { value: 354_821, unit: "peer reviews", href: "https://amplify.d39b380ic58tna.amplifyapp.com/sources" },
      // The patent layer
      { value: 1_405_557, unit: "patents", href: "https://amplify.d39b380ic58tna.amplifyapp.com/patents" },
      { value: 2_545_217, unit: "patent assignments", href: "https://amplify.d39b380ic58tna.amplifyapp.com/patents" },
      // The Hugging Face layer (repositories = models + datasets + spaces)
      { value: 658_283, unit: "models", href: "https://amplify.d39b380ic58tna.amplifyapp.com/models" },
      { value: 999_534, unit: "repositories", href: "https://amplify.d39b380ic58tna.amplifyapp.com/repositories" },
      { value: 55_198, unit: "datasets", href: "https://amplify.d39b380ic58tna.amplifyapp.com/datasets" },
      { value: 259_137, unit: "spaces", href: "https://amplify.d39b380ic58tna.amplifyapp.com/spaces" },
      // Governance & evaluation
      { value: 1_233, unit: "regulations", href: "https://amplify.d39b380ic58tna.amplifyapp.com/regulations" },
      { value: 665, unit: "benchmarks", href: "https://amplify.d39b380ic58tna.amplifyapp.com/benchmarks" },
      // The organization layer
      { value: 58_514, unit: "organizations", href: "https://amplify.d39b380ic58tna.amplifyapp.com/organizations" },
      { value: 683_769, unit: "funding awards", href: "https://amplify.d39b380ic58tna.amplifyapp.com/organizations" },
    ],
  },
  { href: "https://childcare.nysgpt.com", title: "Childcare", accent: "#2f6d6a", body: "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.", value: 19_663, unit: "records",
    // Measured 2026-09-30 from the childcare DB (Neon childcaregpt): exact
    // count(*) and sums over all 6 tables, 19,663 rows.
    stats: [
      { value: 729_502, unit: "seats", href: "https://childcare.nysgpt.com/facility" },
      { value: 429_556, unit: "school-age seats", href: "https://childcare.nysgpt.com/facility" },
      { value: 114_220, unit: "preschool seats", href: "https://childcare.nysgpt.com/facility" },
      { value: 36_656, unit: "toddler seats", href: "https://childcare.nysgpt.com/facility" },
      { value: 17_179, unit: "infant seats", href: "https://childcare.nysgpt.com/facility" },
      { value: 17_285, unit: "facilities", href: "https://childcare.nysgpt.com/facility" },
      { value: 16_439, unit: "providers", href: "https://childcare.nysgpt.com/search" },
      { value: 16_542, unit: "mapped locations", href: "https://childcare.nysgpt.com/maps" },
      { value: 9_905, unit: "group family day cares", href: "https://childcare.nysgpt.com/facility" },
      { value: 2_935, unit: "school-age programs", href: "https://childcare.nysgpt.com/facility" },
      { value: 2_334, unit: "family day cares", href: "https://childcare.nysgpt.com/facility" },
      { value: 2_109, unit: "day care centers", href: "https://childcare.nysgpt.com/facility" },
      { value: 1_278_617, unit: "children under six", href: "https://childcare.nysgpt.com/county" },
      { value: 1_572, unit: "ZIP codes", href: "https://childcare.nysgpt.com/zip-code" },
      { value: 1_169, unit: "ZIP demographic profiles", href: "https://childcare.nysgpt.com/zip-code" },
      { value: 1_333, unit: "cities", href: "https://childcare.nysgpt.com/city" },
      { value: 930, unit: "county cost rows", href: "https://childcare.nysgpt.com/county" },
      { value: 657, unit: "school districts", href: "https://childcare.nysgpt.com/search" },
      { value: 213, unit: "legislative districts", href: "https://childcare.nysgpt.com/officials" },
      { value: 62, unit: "counties", href: "https://childcare.nysgpt.com/county" },
    ],
  },
  { href: "https://leuk.nysgpt.com", title: "EHR", accent: "#3f8290", body: "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.", value: 592_386_952, unit: "records",
    // Measured 2026-09-30 from the Leuk public DB (Neon leuk-public): exact
    // count(*) of all 88 tables, 31,527,931 rows. Form 5500 filings = full +
    // short-form. /rates sits behind sign-in, so rate layers link the directory.
    stats: [
      { value: 16_452_641, unit: "rates", href: "https://leuk.nysgpt.com/providers" },
      { value: 9_671_888, unit: "NPIs", href: "https://leuk.nysgpt.com/providers" },
      { value: 2_441_556, unit: "network listings", href: "https://leuk.nysgpt.com/providers" },
      { value: 719_947, unit: "provider aliases", href: "https://leuk.nysgpt.com/providers" },
      { value: 588_640, unit: "Schedule A rows", href: "https://leuk.nysgpt.com/providers" },
      { value: 556_512, unit: "NPPES endpoints", href: "https://leuk.nysgpt.com/providers" },
      { value: 203_010, unit: "Form 5500 filings", href: "https://leuk.nysgpt.com/providers" },
      { value: 163_523, unit: "organization affiliations", href: "https://leuk.nysgpt.com/providers" },
      { value: 124_163, unit: "directory providers", href: "https://leuk.nysgpt.com/providers" },
      { value: 105_557, unit: "organizations", href: "https://leuk.nysgpt.com/providers" },
      { value: 99_511, unit: "provider qualifications", href: "https://leuk.nysgpt.com/specialty" },
      { value: 67_111, unit: "employer census rows", href: "https://leuk.nysgpt.com/providers" },
      { value: 56_646, unit: "FHIR services", href: "https://leuk.nysgpt.com/providers" },
      { value: 44_916, unit: "FHIR locations", href: "https://leuk.nysgpt.com/providers" },
      { value: 29_795, unit: "tax IDs", href: "https://leuk.nysgpt.com/providers" },
      { value: 20_542, unit: "plans", href: "https://leuk.nysgpt.com/providers" },
      { value: 19_356, unit: "relative value units", href: "https://leuk.nysgpt.com/providers" },
      { value: 8_725, unit: "HCPCS codes", href: "https://leuk.nysgpt.com/specialty" },
      { value: 883, unit: "taxonomy codes", href: "https://leuk.nysgpt.com/specialty" },
      { value: 72, unit: "networks", href: "https://leuk.nysgpt.com/providers" },
      { value: 48, unit: "insurers", href: "https://leuk.nysgpt.com/providers" },
    ],
  },
  { href: "https://main.d2bart0mempmp5.amplifyapp.com", domain: "solar.nysgpt.com", title: "Energy", accent: "#d97706", body: "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.", value: 4_867_679_100, unit: "records",
    // Measured 2026-09-30 from the solar DB (Neon solar): exact count(*) of all
    // 118 tables, 27,876,401 rows — grid telemetry + EIA 860/923/861/930 + NYISO
    // + Cambium. MWh and MW are sums over EIA 923 and 860.
    stats: [
      { value: 4_308_634_298, unit: "MWh generated", href: "https://main.d2bart0mempmp5.amplifyapp.com/plants" },
      { value: 7_660_306, unit: "grid observations", href: "https://main.d2bart0mempmp5.amplifyapp.com/grid" },
      { value: 6_562_227, unit: "nodal prices", href: "https://main.d2bart0mempmp5.amplifyapp.com/grid" },
      { value: 2_780_514, unit: "hourly prices", href: "https://main.d2bart0mempmp5.amplifyapp.com/grid" },
      { value: 1_934_748, unit: "MW nameplate", href: "https://main.d2bart0mempmp5.amplifyapp.com/generators" },
      { value: 1_788_480, unit: "county load-shape rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/counties" },
      { value: 1_238_345, unit: "daily interchange rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/balancing-authorities" },
      { value: 598_833, unit: "daily fuel-mix rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/balancing-authorities" },
      { value: 524_517, unit: "plant-year generation records", href: "https://main.d2bart0mempmp5.amplifyapp.com/plants" },
      { value: 500_358, unit: "day-ahead vs real-time spreads", href: "https://main.d2bart0mempmp5.amplifyapp.com/grid" },
      { value: 294_824, unit: "monthly capacity records", href: "https://main.d2bart0mempmp5.amplifyapp.com/generators" },
      { value: 248_832, unit: "hourly emission rates", href: "https://main.d2bart0mempmp5.amplifyapp.com/nrel-gea" },
      { value: 246_764, unit: "outage records", href: "https://main.d2bart0mempmp5.amplifyapp.com/grid" },
      { value: 97_736, unit: "NYISO queue rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/interconnection-queue" },
      { value: 34_855, unit: "generators", href: "https://main.d2bart0mempmp5.amplifyapp.com/generators" },
      { value: 16_132, unit: "plants", href: "https://main.d2bart0mempmp5.amplifyapp.com/plants" },
      { value: 11_776, unit: "service territories", href: "https://main.d2bart0mempmp5.amplifyapp.com/utilities" },
      { value: 6_643, unit: "utilities", href: "https://main.d2bart0mempmp5.amplifyapp.com/utilities" },
      { value: 3_492, unit: "plant emission records", href: "https://main.d2bart0mempmp5.amplifyapp.com/plants" },
      { value: 1_800, unit: "NYISO queue projects", href: "https://main.d2bart0mempmp5.amplifyapp.com/interconnection-queue" },
      { value: 81, unit: "balancing authorities", href: "https://main.d2bart0mempmp5.amplifyapp.com/balancing-authorities" },
    ],
  },
  { href: "https://insurance.nysgpt.com", title: "Insurance", accent: "#16a34a", body: "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.", value: 21_406, unit: "records",
    // Measured 2026-09-30 from the insurance DB (Neon insurance): exact count(*)
    // of all 23 tables, 21,406 rows; rating cells count non-empty NHTSA fields.
    stats: [
      { value: 17_306, unit: "vehicles rated", href: "https://insurance.nysgpt.com/explore" },
      { value: 9_572, unit: "frontal driver ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 8_479, unit: "frontal crash tests", href: "https://insurance.nysgpt.com/explore" },
      { value: 8_192, unit: "rollover ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 8_159, unit: "stability factors", href: "https://insurance.nysgpt.com/explore" },
      { value: 7_634, unit: "side crash tests", href: "https://insurance.nysgpt.com/explore" },
      { value: 5_875, unit: "side pole ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 5_846, unit: "frontal star ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 5_831, unit: "side star ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 5_468, unit: "overall star ratings", href: "https://insurance.nysgpt.com/explore" },
      { value: 3_497, unit: "five-star vehicles", href: "https://insurance.nysgpt.com/explore" },
      { value: 2_524, unit: "models", href: "https://insurance.nysgpt.com/makes" },
      { value: 129, unit: "body styles", href: "https://insurance.nysgpt.com/explore" },
      { value: 64, unit: "makes", href: "https://insurance.nysgpt.com/makes" },
      { value: 37, unit: "model years", href: "https://insurance.nysgpt.com/explore" },
    ],
  },
  { href: "https://policy.nysgpt.com", title: "Policy", accent: "#3d63dd", body: "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.", value: 6_170_256_205, unit: "records",
    // Measured 2026-09-30 from the GovBlock DB (Aurora aurora-2525, database
    // policy): exact count(*) of all 198 tables, 168,414,928 rows, every state
    // and Congress. Congressional vote positions = House + Senate.
    stats: [
      { value: 89_135_777, unit: "member votes", href: "https://policy.nysgpt.com/roll-call-votes" },
      { value: 18_122_066, unit: "bill actions", href: "https://policy.nysgpt.com/bills" },
      { value: 12_084_763, unit: "sponsorships", href: "https://policy.nysgpt.com/members" },
      { value: 8_351_512, unit: "progress events", href: "https://policy.nysgpt.com/bills" },
      { value: 4_397_842, unit: "documents", href: "https://policy.nysgpt.com/bills" },
      { value: 3_489_901, unit: "bill texts", href: "https://policy.nysgpt.com/bills" },
      { value: 2_959_065, unit: "subject tags", href: "https://policy.nysgpt.com/bills" },
      { value: 2_953_908, unit: "committee referrals", href: "https://policy.nysgpt.com/committees" },
      { value: 2_218_042, unit: "law sections", href: "https://policy.nysgpt.com/laws" },
      { value: 2_129_901, unit: "bills", href: "https://policy.nysgpt.com/bills" },
      { value: 1_986_771, unit: "congressional vote positions", href: "https://policy.nysgpt.com/roll-call-votes" },
      { value: 1_730_826, unit: "roll calls", href: "https://policy.nysgpt.com/roll-call-votes" },
      { value: 1_454_854, unit: "calendar events", href: "https://policy.nysgpt.com/calendar" },
      { value: 677_465, unit: "lobbying activities", href: "https://policy.nysgpt.com/lobbying" },
      { value: 562_061, unit: "lobbied bills", href: "https://policy.nysgpt.com/lobbying" },
      { value: 392_182, unit: "forms", href: "https://policy.nysgpt.com/forms" },
      { value: 357_379, unit: "lobbying filings", href: "https://policy.nysgpt.com/lobbying" },
      { value: 116_820, unit: "FEC contributions", href: "https://policy.nysgpt.com/money" },
      { value: 91_174, unit: "Congressional Record articles", href: "https://policy.nysgpt.com/record" },
      { value: 22_726, unit: "legislators", href: "https://policy.nysgpt.com/members" },
      { value: 14_092, unit: "CRS reports", href: "https://policy.nysgpt.com/reports" },
      { value: 7_038, unit: "amendments", href: "https://policy.nysgpt.com/amendments" },
      { value: 4_297, unit: "news stories", href: "https://policy.nysgpt.com/news" },
      { value: 2_076, unit: "nominations", href: "https://policy.nysgpt.com/nominations" },
      { value: 940, unit: "hearings", href: "https://policy.nysgpt.com/hearings" },
    ],
  },
  { href: "https://amplify.duruug4qfhs29.amplifyapp.com", domain: "nsr.nysgpt.com", title: "Science", accent: "#00BFFF", body: "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.", value: 6_406_550, unit: "records",
    // Measured 2026-09-30 from the NSR DB (Neon nsr): exact count(*) of all 42
    // tables, 5,261,457 rows. hrefs unverified: deployment disabled 2026-09-30.
    stats: [
      { value: 1_404_442, unit: "author links", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 1_210_113, unit: "nuclide links", href: "https://amplify.duruug4qfhs29.amplifyapp.com/structure" },
      { value: 686_880, unit: "subject links", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 303_568, unit: "references", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 277_068, unit: "embeddings", href: "https://amplify.duruug4qfhs29.amplifyapp.com/search" },
      { value: 229_143, unit: "reactions", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 214_376, unit: "topic links", href: "https://amplify.duruug4qfhs29.amplifyapp.com/graph" },
      { value: 198_295, unit: "ENSDF references", href: "https://amplify.duruug4qfhs29.amplifyapp.com/ensdf/datasets" },
      { value: 128_190, unit: "authors", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 27_070, unit: "EXFOR entries", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 23_515, unit: "EXFOR links", href: "https://amplify.duruug4qfhs29.amplifyapp.com/references" },
      { value: 20_917, unit: "XUNDL references", href: "https://amplify.duruug4qfhs29.amplifyapp.com/xundl" },
      { value: 20_120, unit: "ENSDF datasets", href: "https://amplify.duruug4qfhs29.amplifyapp.com/ensdf/datasets" },
      { value: 12_072, unit: "XUNDL archive datasets", href: "https://amplify.duruug4qfhs29.amplifyapp.com/xundl" },
      { value: 10_043, unit: "nuclides", href: "https://amplify.duruug4qfhs29.amplifyapp.com/ensdf/chart" },
    ],
  },
  { href: "https://main.d2bart0mempmp5.amplifyapp.com", domain: "solar.nysgpt.com", title: "Solar", accent: "#f59e0b", body: "State-to-ZIP drill-down over rooftop solar potential and reprojected satellite flux rasters.", value: 56_295_190, unit: "rooftops scanned",
    // Measured 2026-09-30 from the solar DB (Neon solar): Project Sunroof sums
    // at census-tract level, plus Tracking the Sun, URDB and Cambium layers.
    stats: [
      { value: 4_571_280_429, unit: "panels of rooftop capacity", href: "https://main.d2bart0mempmp5.amplifyapp.com/rooftops" },
      { value: 787_002_379, unit: "tons of carbon offset", href: "https://main.d2bart0mempmp5.amplifyapp.com/rooftops" },
      { value: 56_295_190, unit: "rooftops qualified", href: "https://main.d2bart0mempmp5.amplifyapp.com/rooftops" },
      { value: 3_407_208, unit: "installed systems tracked", href: "https://main.d2bart0mempmp5.amplifyapp.com/states" },
      { value: 1_142_820, unit: "MW of rooftop potential", href: "https://main.d2bart0mempmp5.amplifyapp.com/rooftops" },
      { value: 676_299, unit: "existing installs", href: "https://main.d2bart0mempmp5.amplifyapp.com/rooftops" },
      { value: 486_436, unit: "utility rate rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/zips" },
      { value: 55_260, unit: "installer-year records", href: "https://main.d2bart0mempmp5.amplifyapp.com/states" },
      { value: 52_589, unit: "census tracts", href: "https://main.d2bart0mempmp5.amplifyapp.com/solar-map" },
      { value: 45_116, unit: "roof orientation rows", href: "https://main.d2bart0mempmp5.amplifyapp.com/cities" },
      { value: 40_462, unit: "Cambium ZIP mappings", href: "https://main.d2bart0mempmp5.amplifyapp.com/nrel-gea" },
      { value: 14_221, unit: "installers", href: "https://main.d2bart0mempmp5.amplifyapp.com/states" },
      { value: 11_512, unit: "ZIP codes", href: "https://main.d2bart0mempmp5.amplifyapp.com/zips" },
      { value: 8_194, unit: "cities", href: "https://main.d2bart0mempmp5.amplifyapp.com/cities" },
      { value: 7_629, unit: "utility-scale solar generators", href: "https://main.d2bart0mempmp5.amplifyapp.com/generators" },
      { value: 1_029, unit: "counties", href: "https://main.d2bart0mempmp5.amplifyapp.com/counties" },
    ],
  },
  { href: "https://sports.nysgpt.com", title: "Sports", accent: "#033882", body: "New York high-school football as a live stat ledger — players, box scores, and every yard logged.", value: 37_270, unit: "records",
    // Measured 2026-09-30 from the sports DB (Neon sports): exact count(*) of all
    // 23 tables, 37,270 rows; yardage and scoring are sums over player_game_stats
    // and games. hrefs unverified: deployment disabled 2026-09-30.
    stats: [
      { value: 309_762, unit: "rushing yards", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 192_044, unit: "passing yards", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 183_536, unit: "receiving yards", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 53_029, unit: "points scored", href: "https://sports.nysgpt.com/game" },
      { value: 43_130, unit: "carries", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 14_615, unit: "stat lines", href: "https://sports.nysgpt.com/game" },
      { value: 12_940, unit: "completions", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 11_404, unit: "receptions", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 8_168, unit: "roster rows", href: "https://sports.nysgpt.com/team" },
      { value: 8_003, unit: "touchdowns", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 4_722, unit: "players", href: "https://sports.nysgpt.com/player" },
      { value: 4_639, unit: "season stat lines", href: "https://sports.nysgpt.com/player" },
      { value: 2_219, unit: "Regents results", href: "https://sports.nysgpt.com/school" },
      { value: 1_123, unit: "games", href: "https://sports.nysgpt.com/game" },
      { value: 1_108, unit: "box scores", href: "https://sports.nysgpt.com/game" },
      { value: 970, unit: "sacks", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 584, unit: "interceptions", href: "https://sports.nysgpt.com/leaderboard" },
      { value: 52, unit: "schools", href: "https://sports.nysgpt.com/school" },
      { value: 5, unit: "seasons", href: "https://sports.nysgpt.com/board" },
      { value: 4, unit: "divisions", href: "https://sports.nysgpt.com/division" },
    ],
  },
  { href: "https://tariffs.nysgpt.com", title: "Tariffs", accent: "#c9a961", body: "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.", value: 977_537, unit: "records",
    // Measured 2026-09-30 from the tariffs DB (Neon tariffs): exact count(*) of
    // all 33 tables, 756,231 rows (CBP CROSS + HTS + USITC DataWeb).
    stats: [
      { value: 221_605, unit: "CROSS rulings", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 221_603, unit: "embeddings", href: "https://tariffs.nysgpt.com/search" },
      { value: 221_306, unit: "ruling PDFs indexed", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 215_917, unit: "ruling documents", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 184_071, unit: "New York rulings", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 37_533, unit: "headquarters rulings", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 41_301, unit: "ruling terms", href: "https://tariffs.nysgpt.com/search" },
      { value: 35_795, unit: "HTS lines", href: "https://tariffs.nysgpt.com/codes" },
      { value: 19_949, unit: "ten-digit HTS codes", href: "https://tariffs.nysgpt.com/codes" },
      { value: 7_950, unit: "import duty rows", href: "https://tariffs.nysgpt.com/duties" },
      { value: 6_637, unit: "refund-relevant rulings", href: "https://tariffs.nysgpt.com/eligibility" },
      { value: 3_323, unit: "NAFTA rulings", href: "https://tariffs.nysgpt.com/rulings" },
      { value: 3_103, unit: "tariff codes", href: "https://tariffs.nysgpt.com/codes" },
      { value: 2_515, unit: "customs brokers", href: "https://tariffs.nysgpt.com/data" },
      { value: 1_262, unit: "HTS headings", href: "https://tariffs.nysgpt.com/codes" },
      { value: 150, unit: "countries", href: "https://tariffs.nysgpt.com/duties" },
    ],
  },
];
