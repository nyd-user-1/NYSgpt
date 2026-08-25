/**
 * The homepage's two data plates, shared between the page (masthead + contents
 * grid) and the switchboard panel (which lives in the root layout so it can
 * follow the reader across routes). One copy, or the panel and the page drift.
 */

export type HomeCardData = {
  href: string;
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

/** The masthead ledger — four headline totals.
 *  Records bumped +6.7M on 2026-08-24 when the AI corpus re-measured
 *  57.0M → 63.67M (see the Artificial Intelligence card below). */
export const LEDGER = [
  { value: 646_700_000, unit: "Records" },
  { value: 510922, unit: "Documents" },
  { value: 563, unit: "APIs" },
  { value: 470, unit: "Scripts" },
];

/** The ten products — the contents plate, and the panel's product rows. */
export const CARDS: HomeCardData[] = [
  {
    href: "https://44b.nysgpt.com", sameTab: true, title: "Artificial Intelligence", accent: "#033882",
    body: "Select patents, papers, and policies concerning AI, the research behind them, and related peer review records.",
    // Measured 2026-08-24 from the corpus DB (139 GB): every row in the public
    // schema, 102 tables. The sub-stats are the same measurement's breakdown;
    // citations = document citations (21.24M) + patent citations (11.17M).
    value: 63_669_576, unit: "patents & papers",
    stats: [
      // The paper layer
      { value: 3_561_047, unit: "papers", href: "https://44b.nysgpt.com/library" },
      { value: 32_410_264, unit: "citations", href: "https://44b.nysgpt.com/citations" },
      { value: 1_608_839, unit: "full texts", href: "https://44b.nysgpt.com/library" },
      { value: 2_098_936, unit: "embeddings", href: "https://44b.nysgpt.com/sources" },
      { value: 354_821, unit: "peer reviews", href: "https://44b.nysgpt.com/sources" },
      // The patent layer
      { value: 1_405_557, unit: "patents", href: "https://44b.nysgpt.com/patents" },
      { value: 2_545_217, unit: "patent assignments", href: "https://44b.nysgpt.com/patents" },
      // The Hugging Face layer (repositories = models + datasets + spaces)
      { value: 658_283, unit: "models", href: "https://44b.nysgpt.com/models" },
      { value: 999_534, unit: "repositories", href: "https://44b.nysgpt.com/repositories" },
      { value: 55_198, unit: "datasets", href: "https://44b.nysgpt.com/datasets" },
      { value: 259_137, unit: "spaces", href: "https://44b.nysgpt.com/spaces" },
      // Governance & evaluation
      { value: 1_233, unit: "regulations", href: "https://44b.nysgpt.com/regulations" },
      { value: 665, unit: "benchmarks", href: "https://44b.nysgpt.com/benchmarks" },
      // The organization layer
      { value: 58_514, unit: "organizations", href: "https://44b.nysgpt.com/organizations" },
      { value: 683_769, unit: "funding awards", href: "https://44b.nysgpt.com/organizations" },
    ],
  },
  { href: "https://childcare.nysgpt.com", title: "Childcare", accent: "#2f6d6a", body: "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.", value: 16_800, unit: "providers" },
  { href: "https://leuk.nysgpt.com", title: "EHR", accent: "#3f8290", body: "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.", value: 16_400_000, unit: "rates" },
  { href: "https://solar.nysgpt.com", title: "Energy", accent: "#d97706", body: "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.", value: 4_300_000_000, unit: "MWh generated" },
  { href: "https://insurance.nysgpt.com", title: "Insurance", accent: "#16a34a", body: "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.", value: 17_306, unit: "vehicles rated" },
  { href: "https://policy.nysgpt.com", title: "Policy", accent: "#3d63dd", body: "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.", value: 292_754, unit: "votes counted" },
  { href: "https://nsr.nysgpt.com", title: "Science", accent: "#00BFFF", body: "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.", value: 46_728, unit: "publications" },
  { href: "https://solar.nysgpt.com", title: "Solar", accent: "#f59e0b", body: "State-to-ZIP drill-down over rooftop solar potential and reprojected satellite flux rasters.", value: 56_200_000, unit: "rooftops scanned" },
  { href: "https://sports.nysgpt.com", title: "Sports", accent: "#033882", body: "New York high-school football as a live stat ledger — players, box scores, and every yard logged.", value: 685_342, unit: "yards logged" },
  { href: "https://tariffs.nysgpt.com", title: "Tariffs", accent: "#c9a961", body: "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.", value: 220_178, unit: "federal rulings" },
];
