/**
 * The home page boxes (2026-11-19, brief 43): taken from the option 3 sketch
 * (docs/sketches/2026-11-12-nysgpt-root-option3.html), its box markup and its
 * SET_DATA, by a script. Four sets: data, models, platforms, tools. `foot` is
 * the figure or label the box's side panel shows; `icon` is the type icon in
 * the box footer. SET_INFO is each non-data box's facts for the side panel
 * and the catalog overlay (models: task, size, visibility, updated, link).
 */

import { SOURCE_BOXES, SOURCE_INFO } from './home-sources'
import { TABLE_BOXES } from './home-tables'

/** The five outside sources, A to Z (2026-11-19): their boxes come from lib/home-sources.ts, written by scripts/home-sources.mjs. */
export type SourceKind = 'aa' | 'kaggle' | 'llmstats' | 'gh-skills' | 'gh-design' | 'gh-api' | 'gh-mcp' | 'hf-models' | 'hf-datasets' | 'hf-spaces' | 'hf-papers'
/* The masthead's later pages, in order: the sources page A to Z, then a page each for GitHub and Hugging Face (A to Z),
   whose four cells are that source's groups and whose nameplate wears its mark. */
export const SOURCE_PAGES: SourceKind[][] = [
  ['aa', 'kaggle', 'llmstats'],
  ['gh-skills', 'gh-design', 'gh-api', 'gh-mcp'],
  ['hf-models', 'hf-datasets', 'hf-spaces', 'hf-papers'],
]
export const SOURCE_KINDS: SourceKind[] = SOURCE_PAGES.flat()
/** The source whose logo the nameplate wears while this set is on show; none for the first four sets. */
export const brandOf = (k: BoxKind | null | undefined): 'github' | 'hf' | 'aa' | 'kaggle' | 'llmstats' | null =>
  !k ? null : k.startsWith('gh-') ? 'github' : k.startsWith('hf-') ? 'hf' : k === 'aa' || k === 'kaggle' || k === 'llmstats' ? k : null
export const SOURCES: Record<SourceKind, { word: string; unit: string }> = {
  aa: { word: 'Artificial Analysis', unit: 'Models' },
  kaggle: { word: 'Kaggle', unit: 'Datasets' },
  llmstats: { word: 'LLM Stats', unit: 'Benchmarks' },
  'gh-skills': { word: 'Skills', unit: 'Repositories' },
  'gh-design': { word: 'Design', unit: 'Repositories' },
  'gh-api': { word: 'API', unit: 'Repositories' },
  'gh-mcp': { word: 'MCP', unit: 'Repositories' },
  'hf-models': { word: 'Models', unit: 'Models' },
  'hf-datasets': { word: 'Datasets', unit: 'Datasets' },
  'hf-spaces': { word: 'Spaces', unit: 'Spaces' },
  'hf-papers': { word: 'Papers', unit: 'Papers' },
}
export const isSource = (k: BoxKind): k is SourceKind => (SOURCE_KINDS as BoxKind[]).includes(k)

/* 'tables' took Tools' place on the masthead (Brendan, 2026-11-19). The tools boxes stay in this file but no set shows them. */
export type BoxKind = 'data' | 'models' | 'platforms' | 'tables' | 'tools' | SourceKind
/** The sets the all view shows: the first masthead page. */
export const OWN_KINDS: BoxKind[] = ['data', 'models', 'platforms', 'tables']
export type BoxIcon = 'db' | 'cpu' | 'layers' | 'wrench' | 'github' | 'download' | 'package' | 'hf' | 'kaggle' | 'aa' | 'llmstats' | 'sparkles' | 'palette' | 'braces' | 'plug' | 'file' | 'table'
export type Box = { kind: BoxKind; title: string; group: string; body: string; foot: string; accent: string; icon: BoxIcon }
export type SetEntry = { database: string; table: string; about: string; fields: { name: string; desc: string }[] }

/** The type colours: a box's footer icon, its hover tint and its title on hover. */
/* The five sources take colours that sit beside the first four without repeating one: rose, green, slate. */
export const TYPE_COLOR: Record<BoxKind, string> = {
  data: '#0e7490',
  models: '#7c3aed',
  platforms: '#033882',
  tables: '#ea580c',
  tools: '#ea580c',
  aa: '#be123c',
  kaggle: '#15803d',
  llmstats: '#475569',
  // GitHub's and Hugging Face's pages are laid out as the first page is, so their cells take its four colours in order
  'gh-skills': '#0e7490',
  'gh-design': '#7c3aed',
  'gh-api': '#033882',
  'gh-mcp': '#ea580c',
  'hf-models': '#0e7490',
  'hf-datasets': '#7c3aed',
  'hf-spaces': '#033882',
  'hf-papers': '#ea580c',
}

const OWN_BOXES: Box[] = [
 {
  "kind": "data",
  "title": "AI Chips and Data Centers",
  "group": "Science",
  "body": "AI chips, GPU clusters and data centers: owners, quantities, power and timelines.",
  "foot": "3.8K",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "AI Models and Benchmarks",
  "group": "Science",
  "body": "AI models, who made them, benchmark scores, rankings and prices.",
  "foot": "173.7K",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "AI Policy and Safety",
  "group": "Science",
  "body": "AI policy documents, harm categories, incidents and safety frameworks.",
  "foot": "19.5K",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Bills",
  "group": "Politics",
  "body": "Bills in every state and Congress: text, versions, history, subjects and outcomes.",
  "foot": "41M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Campaign Donations",
  "group": "Politics",
  "body": "Who gave to federal campaigns and committees: donors, amounts, employers and places.",
  "foot": "297M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Campaign Spending",
  "group": "Politics",
  "body": "How campaigns and committees spent their money: vendors, purposes and transfers.",
  "foot": "71.1M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Candidates and Committees",
  "group": "Politics",
  "body": "Federal candidates and committees, how they link, and their totals by cycle.",
  "foot": "587K",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Child Care",
  "group": "Community",
  "body": "Child care facilities, costs and demographics by county and ZIP code.",
  "foot": "19.7K",
  "accent": "#0e7490",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Election Results",
  "group": "Politics",
  "body": "Election results by precinct, county, state and district, including ranked-choice ballots.",
  "foot": "316M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Electricity Demand",
  "group": "Energy",
  "body": "Electricity demand by region, county and hour, with forecasts.",
  "foot": "2.9M",
  "accent": "#b45309",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Electricity Prices",
  "group": "Energy",
  "body": "Wholesale electricity prices by region, zone and hour, and retail rates by ZIP code.",
  "foot": "10.9M",
  "accent": "#b45309",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Eligible Voters",
  "group": "Politics",
  "body": "Citizens of voting age by state, county, city, district, tract and block group.",
  "foot": "5M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Employee Benefit Plans",
  "group": "Business",
  "body": "Retirement and health plans filed with the Department of Labor: sponsors, assets, fees and insurers.",
  "foot": "197.7M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Federal Budget and Accounts",
  "group": "Government",
  "body": "Federal cash, receipts, accounts and agency budget requests.",
  "foot": "5.3M",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Federal Contracts",
  "group": "Government",
  "body": "Federal contracts, and the opportunities posted before they were awarded.",
  "foot": "106.8M",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Federal Debt and Interest Rates",
  "group": "Government",
  "body": "Federal debt, Treasury securities, auctions, savings bonds and interest rates.",
  "foot": "8.2M",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Federal Grants and Loans",
  "group": "Government",
  "body": "Federal grants, loans and direct payments to states, organizations and people.",
  "foot": "129.4M",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Federal Trust Funds",
  "group": "Government",
  "body": "Receipts, spending and balances of federal trust funds.",
  "foot": "6K",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Government Forms",
  "group": "Government",
  "body": "Government forms by agency, with source and status.",
  "foot": "392.2K",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Health Care Prices",
  "group": "Health",
  "body": "Negotiated rates by procedure, provider and payer, with Medicare benchmarks.",
  "foot": "21.7M",
  "accent": "#be185d",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Health Care Providers",
  "group": "Health",
  "body": "Doctors, clinics and hospitals: registry records, specialties, locations and affiliations.",
  "foot": "11.8M",
  "accent": "#be185d",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Health Insurance Plans and Networks",
  "group": "Health",
  "body": "Health plans, insurers, networks, and which providers belong to them.",
  "foot": "2.6M",
  "accent": "#be185d",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Legislators and Committees",
  "group": "Politics",
  "body": "Legislators, sponsors, committees, referrals, meetings and calendars.",
  "foot": "16.7M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Lobbying",
  "group": "Politics",
  "body": "Who lobbies, for which clients, on which issues and bills, and for how much.",
  "foot": "1.6M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "New York Bills",
  "group": "Politics",
  "body": "New York bills: status, committee referrals and committee workload.",
  "foot": "55.9K",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "New York State Budget",
  "group": "Government",
  "body": "New York State appropriations, spending, revenue, contracts and school funding.",
  "foot": "156.9K",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Nonprofits",
  "group": "Business",
  "body": "Tax-exempt organizations, their IRS filings, finances and revocations.",
  "foot": "23.5M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Nuclear Experiments",
  "group": "Science",
  "body": "Experimental nuclear reaction measurements: entries, reactions, data points and labs.",
  "foot": "174M",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Nuclear Reaction Data",
  "group": "Science",
  "body": "Evaluated nuclear data: cross sections, angular and energy distributions, fission yields.",
  "foot": "14.8B",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Nuclear Science Papers",
  "group": "Science",
  "body": "Nuclear science references by nuclide, reaction, author and journal.",
  "foot": "3.9M",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Nuclear Structure and Decay",
  "group": "Science",
  "body": "Nuclear levels, gamma rays, decay modes and half-lives by nuclide.",
  "foot": "10.1M",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Open-Source AI Models",
  "group": "Science",
  "body": "Openly published AI models and repositories, the papers behind them, and adoption.",
  "foot": "2.4M",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Applications",
  "group": "Business",
  "body": "Published patent applications: claims, classes, filing data and continuity.",
  "foot": "398.6M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Citations",
  "group": "Business",
  "body": "Which patents and papers each patent cites.",
  "foot": "401M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Examination",
  "group": "Business",
  "body": "How patents move through examination: office actions, rejections, fees and timelines.",
  "foot": "555.6M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Litigation",
  "group": "Business",
  "body": "Patent lawsuits: cases, parties, attorneys, documents and patents asserted.",
  "foot": "12.7M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Owners and Inventors",
  "group": "Business",
  "body": "Who owns and who invented each patent, with attorneys and locations.",
  "foot": "543.1M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patent Ownership Transfers",
  "group": "Business",
  "body": "Recorded sales and transfers of patents between owners.",
  "foot": "117.7M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Patents",
  "group": "Business",
  "body": "U.S. patents: titles, abstracts, claims, technology classes and AI scores.",
  "foot": "431.8M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Political Advertising",
  "group": "Politics",
  "body": "Political ads: advertisers, spending by place and week, targeting and impressions.",
  "foot": "7.3M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Political Organizations",
  "group": "Politics",
  "body": "Political organizations (527s): registrations, officers, donors and spending.",
  "foot": "18.9M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Polls and Surveys",
  "group": "Politics",
  "body": "Election polls and national surveys: questions and results.",
  "foot": "1.9M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Power Generation and Fuel Mix",
  "group": "Energy",
  "body": "Electricity generation by fuel, flows between regions, emissions and outages.",
  "foot": "4.5M",
  "accent": "#b45309",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Power Plants and Utilities",
  "group": "Energy",
  "body": "Power plants, generators, utilities, service territories and the interconnection queue.",
  "foot": "1.4M",
  "accent": "#b45309",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Research Papers",
  "group": "Science",
  "body": "Research papers, citations, authors' organizations, funders and peer reviews.",
  "foot": "32.9M",
  "accent": "#6d28d9",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "School Sports",
  "group": "Community",
  "body": "School teams, players, games and season stats, with Regents exam results.",
  "foot": "37.3K",
  "accent": "#0e7490",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "SEC Filings",
  "group": "Business",
  "body": "Companies and their SEC filings, with reported financial facts.",
  "foot": "183.9M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "SEC Financial Statements",
  "group": "Business",
  "body": "Financial statement values, notes and tags from company filings.",
  "foot": "1.1B",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "SEC Fund Holdings",
  "group": "Business",
  "body": "What investment funds hold, quarter by quarter (Form 13F).",
  "foot": "125.9M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "SEC Insider Trading",
  "group": "Business",
  "body": "Stock trades and holdings reported by company officers, directors and major owners.",
  "foot": "37.9M",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Solar Energy",
  "group": "Energy",
  "body": "Solar installations, rooftop potential, site output and grid scenarios.",
  "foot": "222.9K",
  "accent": "#b45309",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Tariffs and Trade",
  "group": "Business",
  "body": "Tariff codes, duty rates, customs rulings and trade by country and industry.",
  "foot": "328.4K",
  "accent": "#047857",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "U.S. Law",
  "group": "Government",
  "body": "The United States Code, section by section.",
  "foot": "0",
  "accent": "#1d4ed8",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Vehicle Safety",
  "group": "Community",
  "body": "Crash-test safety ratings by make, model and year.",
  "foot": "17.3K",
  "accent": "#0e7490",
  "icon": "db"
 },
 {
  "kind": "data",
  "title": "Votes",
  "group": "Politics",
  "body": "Roll call votes and how each legislator voted.",
  "foot": "90.8M",
  "accent": "#b42318",
  "icon": "db"
 },
 {
  "kind": "models",
  "title": "NSR Encoder v2",
  "group": "NSR",
  "body": "Private, updated 3 days ago.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Learning Loops",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "PRIVATE",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Winning Modes",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "PRIVATE",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Publish Policy",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "PRIVATE",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Video Encoder",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "PRIVATE",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Velocity Classifier",
  "group": "Martian",
  "body": "Tabular Classification, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Semantic Id Model",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "PRIVATE",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Retention Regressor",
  "group": "Martian",
  "body": "Tabular Regression, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Resonance Encoder",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Resonance Encoder Full",
  "group": "Martian",
  "body": "Private, updated 22 to 24 days ago.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Reranker",
  "group": "Martian",
  "body": "Text Classification, private, updated 22 to 24 days ago.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Persuasion Reference",
  "group": "Martian",
  "body": "Tabular Regression, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Headline Ranker",
  "group": "Martian",
  "body": "Text Classification, private, updated 22 to 24 days ago.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Feed Ranker",
  "group": "Martian",
  "body": "Tabular Classification, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Encoder",
  "group": "Martian",
  "body": "Sentence Similarity, private, updated 22 to 24 days ago.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Classifier",
  "group": "Martian",
  "body": "Tabular Classification, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Martian Composition Ranker",
  "group": "Martian",
  "body": "Tabular Classification, private, updated 22 to 24 days ago.",
  "foot": "TABULAR",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "NSR Reranker",
  "group": "NSR",
  "body": "Text Ranking, public, updated Sep 3.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "NSR Encoder",
  "group": "NSR",
  "body": "Feature Extraction, public, updated Aug 24.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Biomed Reranker",
  "group": "Biomed",
  "body": "Text Ranking, private, updated Aug 24.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "Biomed Encoder",
  "group": "Biomed",
  "body": "Feature Extraction, private, updated Aug 24.",
  "foot": "0.6B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "44B Reranker Mini",
  "group": "44B",
  "body": "Text Ranking, public, updated Aug 24.",
  "foot": "22.7M",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "44B Reranker",
  "group": "44B",
  "body": "Text Ranking, public, updated Aug 24.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "CSHL MESH Tagger",
  "group": "CSHL",
  "body": "Text Classification, private, updated Aug 21.",
  "foot": "0.2B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "models",
  "title": "CSHL Category",
  "group": "CSHL",
  "body": "Text Classification, private, updated Aug 21.",
  "foot": "0.1B",
  "accent": "#7c3aed",
  "icon": "cpu"
 },
 {
  "kind": "platforms",
  "title": "Artificial Intelligence",
  "group": "Original",
  "body": "Select patents, papers, and policies concerning AI, the research behind them, and related peer review records.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Childcare",
  "group": "Original",
  "body": "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Consensus",
  "group": "Original",
  "body": "Gather opinion at scale; groups emerge from the votes, not the loudest voice.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Energy",
  "group": "Original",
  "body": "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Gov",
  "group": "Original",
  "body": "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Healthcare",
  "group": "Original",
  "body": "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Insurance",
  "group": "Original",
  "body": "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Science",
  "group": "Original",
  "body": "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Tariffs",
  "group": "Original",
  "body": "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Video",
  "group": "Original",
  "body": "Make videos that change minds and move feet.",
  "foot": "ORIGINAL",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Hugging Face",
  "group": "Outside",
  "body": "Models, datasets and Spaces for machine learning.",
  "foot": "MODELS",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Kaggle",
  "group": "Outside",
  "body": "Datasets, notebooks and data science competitions.",
  "foot": "DATA",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "GitHub",
  "group": "Outside",
  "body": "Code hosting and collaboration.",
  "foot": "CODE",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "AWS Marketplace",
  "group": "Outside",
  "body": "Software and data listings sold through AWS.",
  "foot": "MARKETPLACE",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Data.gov",
  "group": "Outside",
  "body": "US federal open data catalog.",
  "foot": "DATA",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Zenodo",
  "group": "Outside",
  "body": "Research data and software archive run by CERN.",
  "foot": "ARCHIVE",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "OpenML",
  "group": "Outside",
  "body": "Open datasets and experiment records for machine learning.",
  "foot": "DATA",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Replicate",
  "group": "Outside",
  "body": "Run and host machine learning models through an API.",
  "foot": "MODELS",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Weights & Biases",
  "group": "Outside",
  "body": "Experiment tracking and model evaluation.",
  "foot": "TRACKING",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Google Dataset Search",
  "group": "Outside",
  "body": "Search engine for open datasets across the web.",
  "foot": "SEARCH",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "platforms",
  "title": "Registry of Open Data on AWS",
  "group": "Outside",
  "body": "Public datasets hosted on AWS.",
  "foot": "DATA",
  "accent": "#033882",
  "icon": "layers"
 },
 {
  "kind": "tools",
  "title": "Inspector",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "Sonar",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "MIMR",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "Tailwindex",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "Sessions",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "HQ",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "Hyperion",
  "group": "Original",
  "body": "Placeholder description.",
  "foot": "ORIGINAL",
  "accent": "#ea580c",
  "icon": "wrench"
 },
 {
  "kind": "tools",
  "title": "jq",
  "group": "GitHub",
  "body": "Command-line JSON processor.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "csvkit",
  "group": "GitHub",
  "body": "Command-line tools for working with CSV files.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "Datasette",
  "group": "GitHub",
  "body": "Explore and publish SQLite databases in the browser.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "Polars",
  "group": "GitHub",
  "body": "Fast DataFrame library for Python and Rust.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "pandas",
  "group": "GitHub",
  "body": "Data analysis and manipulation library for Python.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "DuckDB",
  "group": "GitHub",
  "body": "In-process analytical SQL database.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "dbt-core",
  "group": "GitHub",
  "body": "Transform data in your warehouse with SQL.",
  "foot": "GITHUB",
  "accent": "#ea580c",
  "icon": "github"
 },
 {
  "kind": "tools",
  "title": "SingleFile",
  "group": "App",
  "body": "Saves a web page as one HTML file.",
  "foot": "APP",
  "accent": "#ea580c",
  "icon": "download"
 },
 {
  "kind": "tools",
  "title": "d3",
  "group": "npm",
  "body": "Charts and maps drawn in SVG and HTML.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "papaparse",
  "group": "npm",
  "body": "Fast CSV parser for the browser and Node.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "typescript",
  "group": "npm",
  "body": "Typed superset of JavaScript that compiles to plain JavaScript.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "vite",
  "group": "npm",
  "body": "Frontend build tool and dev server.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "chart.js",
  "group": "npm",
  "body": "Simple charts for the web.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "lodash",
  "group": "npm",
  "body": "Utility functions for JavaScript.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "prettier",
  "group": "npm",
  "body": "Opinionated code formatter.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "eslint",
  "group": "npm",
  "body": "Linter for JavaScript and TypeScript.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "tsx",
  "group": "npm",
  "body": "Run TypeScript files directly in Node.",
  "foot": "NPM",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "requests",
  "group": "PyPI",
  "body": "HTTP library for Python.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "NumPy",
  "group": "PyPI",
  "body": "Array computing for Python.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "Matplotlib",
  "group": "PyPI",
  "body": "Plotting library for Python.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "Plotly",
  "group": "PyPI",
  "body": "Interactive charts for Python.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "Playwright",
  "group": "PyPI",
  "body": "Browser automation for Python.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 },
 {
  "kind": "tools",
  "title": "HTTPie",
  "group": "PyPI",
  "body": "Command-line HTTP client.",
  "foot": "PYPI",
  "accent": "#ea580c",
  "icon": "package"
 }
]

/** Every box: the four sets, then the five sources. The all view leaves the sources out (HomePlate). */
export const BOXES: Box[] = [...OWN_BOXES, ...TABLE_BOXES, ...SOURCE_BOXES]

const OWN_INFO: Record<'models' | 'platforms' | 'tools', SetEntry[]> = {
 "models": [
  {
   "database": "NSR",
   "table": "NSR Encoder v2",
   "about": "Private, updated 3 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "3 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/nsr-encoder-v2"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Learning Loops",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-learning-loops"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Winning Modes",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-winning-modes"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Publish Policy",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-publish-policy"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Video Encoder",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-video-encoder"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Velocity Classifier",
   "about": "Tabular Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Classification"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-velocity-classifier"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Semantic Id Model",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-semantic-id-model"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Retention Regressor",
   "about": "Tabular Regression, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Regression"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-retention-regressor"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Resonance Encoder",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-resonance-encoder"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Resonance Encoder Full",
   "about": "Private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Not listed"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-resonance-encoder-full"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Reranker",
   "about": "Text Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Classification"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-reranker"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Persuasion Reference",
   "about": "Tabular Regression, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Regression"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-persuasion-reference"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Headline Ranker",
   "about": "Text Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Classification"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-headline-ranker"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Feed Ranker",
   "about": "Tabular Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Classification"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-feed-ranker"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Encoder",
   "about": "Sentence Similarity, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Sentence Similarity"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-encoder"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Classifier",
   "about": "Tabular Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Classification"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-classifier"
    }
   ]
  },
  {
   "database": "Martian",
   "table": "Martian Composition Ranker",
   "about": "Tabular Classification, private, updated 22 to 24 days ago.",
   "fields": [
    {
     "name": "Task",
     "desc": "Tabular Classification"
    },
    {
     "name": "Size",
     "desc": "Not listed"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "22 to 24 days ago"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/martian-composition-ranker"
    }
   ]
  },
  {
   "database": "NSR",
   "table": "NSR Reranker",
   "about": "Text Ranking, public, updated Sep 3.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Ranking"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Public"
    },
    {
     "name": "Updated",
     "desc": "Sep 3"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/nsr-reranker"
    }
   ]
  },
  {
   "database": "NSR",
   "table": "NSR Encoder",
   "about": "Feature Extraction, public, updated Aug 24.",
   "fields": [
    {
     "name": "Task",
     "desc": "Feature Extraction"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Public"
    },
    {
     "name": "Updated",
     "desc": "Aug 24"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/nsr-encoder"
    }
   ]
  },
  {
   "database": "Biomed",
   "table": "Biomed Reranker",
   "about": "Text Ranking, private, updated Aug 24.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Ranking"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "Aug 24"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/biomed-reranker"
    }
   ]
  },
  {
   "database": "Biomed",
   "table": "Biomed Encoder",
   "about": "Feature Extraction, private, updated Aug 24.",
   "fields": [
    {
     "name": "Task",
     "desc": "Feature Extraction"
    },
    {
     "name": "Size",
     "desc": "0.6B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "Aug 24"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/biomed-encoder"
    }
   ]
  },
  {
   "database": "44B",
   "table": "44B Reranker Mini",
   "about": "Text Ranking, public, updated Aug 24.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Ranking"
    },
    {
     "name": "Size",
     "desc": "22.7M"
    },
    {
     "name": "Visibility",
     "desc": "Public"
    },
    {
     "name": "Updated",
     "desc": "Aug 24"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/44b-reranker-mini"
    }
   ]
  },
  {
   "database": "44B",
   "table": "44B Reranker",
   "about": "Text Ranking, public, updated Aug 24.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Ranking"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Public"
    },
    {
     "name": "Updated",
     "desc": "Aug 24"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/44b-reranker"
    }
   ]
  },
  {
   "database": "CSHL",
   "table": "CSHL MESH Tagger",
   "about": "Text Classification, private, updated Aug 21.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Classification"
    },
    {
     "name": "Size",
     "desc": "0.2B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "Aug 21"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/cshl-MESH-tagger"
    }
   ]
  },
  {
   "database": "CSHL",
   "table": "CSHL Category",
   "about": "Text Classification, private, updated Aug 21.",
   "fields": [
    {
     "name": "Task",
     "desc": "Text Classification"
    },
    {
     "name": "Size",
     "desc": "0.1B"
    },
    {
     "name": "Visibility",
     "desc": "Private"
    },
    {
     "name": "Updated",
     "desc": "Aug 21"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co/NYSgpt/cshl-category"
    }
   ]
  }
 ],
 "tools": [
  {
   "database": "Original",
   "table": "Inspector",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Sonar",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "MIMR",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Tailwindex",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Sessions",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "HQ",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Hyperion",
   "about": "Placeholder description.",
   "fields": [
    {
     "name": "Kind",
     "desc": "Own dev tool"
    },
    {
     "name": "Link",
     "desc": "To come"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "jq",
   "about": "Command-line JSON processor.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/jqlang/jq"
    },
    {
     "name": "Install",
     "desc": "brew install jq"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "csvkit",
   "about": "Command-line tools for working with CSV files.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/wireservice/csvkit"
    },
    {
     "name": "Install",
     "desc": "pip install csvkit"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "Datasette",
   "about": "Explore and publish SQLite databases in the browser.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/simonw/datasette"
    },
    {
     "name": "Install",
     "desc": "pip install datasette"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "Polars",
   "about": "Fast DataFrame library for Python and Rust.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/pola-rs/polars"
    },
    {
     "name": "Install",
     "desc": "pip install polars"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "pandas",
   "about": "Data analysis and manipulation library for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/pandas-dev/pandas"
    },
    {
     "name": "Install",
     "desc": "pip install pandas"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "DuckDB",
   "about": "In-process analytical SQL database.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/duckdb/duckdb"
    },
    {
     "name": "Install",
     "desc": "pip install duckdb"
    }
   ]
  },
  {
   "database": "GitHub",
   "table": "dbt-core",
   "about": "Transform data in your warehouse with SQL.",
   "fields": [
    {
     "name": "Kind",
     "desc": "GITHUB"
    },
    {
     "name": "Link",
     "desc": "https://github.com/dbt-labs/dbt-core"
    },
    {
     "name": "Install",
     "desc": "pip install dbt-core"
    }
   ]
  },
  {
   "database": "App",
   "table": "SingleFile",
   "about": "Saves a web page as one HTML file.",
   "fields": [
    {
     "name": "Kind",
     "desc": "APP"
    },
    {
     "name": "Link",
     "desc": "https://github.com/gildas-lormeau/SingleFile"
    },
    {
     "name": "Install",
     "desc": "Download from the releases page"
    }
   ]
  },
  {
   "database": "npm",
   "table": "d3",
   "about": "Charts and maps drawn in SVG and HTML.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/d3"
    },
    {
     "name": "Install",
     "desc": "npm install d3"
    }
   ]
  },
  {
   "database": "npm",
   "table": "papaparse",
   "about": "Fast CSV parser for the browser and Node.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/papaparse"
    },
    {
     "name": "Install",
     "desc": "npm install papaparse"
    }
   ]
  },
  {
   "database": "npm",
   "table": "typescript",
   "about": "Typed superset of JavaScript that compiles to plain JavaScript.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/typescript"
    },
    {
     "name": "Install",
     "desc": "npm install typescript"
    }
   ]
  },
  {
   "database": "npm",
   "table": "vite",
   "about": "Frontend build tool and dev server.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/vite"
    },
    {
     "name": "Install",
     "desc": "npm install vite"
    }
   ]
  },
  {
   "database": "npm",
   "table": "chart.js",
   "about": "Simple charts for the web.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/chart.js"
    },
    {
     "name": "Install",
     "desc": "npm install chart.js"
    }
   ]
  },
  {
   "database": "npm",
   "table": "lodash",
   "about": "Utility functions for JavaScript.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/lodash"
    },
    {
     "name": "Install",
     "desc": "npm install lodash"
    }
   ]
  },
  {
   "database": "npm",
   "table": "prettier",
   "about": "Opinionated code formatter.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/prettier"
    },
    {
     "name": "Install",
     "desc": "npm install prettier"
    }
   ]
  },
  {
   "database": "npm",
   "table": "eslint",
   "about": "Linter for JavaScript and TypeScript.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/eslint"
    },
    {
     "name": "Install",
     "desc": "npm install eslint"
    }
   ]
  },
  {
   "database": "npm",
   "table": "tsx",
   "about": "Run TypeScript files directly in Node.",
   "fields": [
    {
     "name": "Kind",
     "desc": "NPM"
    },
    {
     "name": "Link",
     "desc": "https://www.npmjs.com/package/tsx"
    },
    {
     "name": "Install",
     "desc": "npm install tsx"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "requests",
   "about": "HTTP library for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/requests/"
    },
    {
     "name": "Install",
     "desc": "pip install requests"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "NumPy",
   "about": "Array computing for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/numpy/"
    },
    {
     "name": "Install",
     "desc": "pip install numpy"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "Matplotlib",
   "about": "Plotting library for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/matplotlib/"
    },
    {
     "name": "Install",
     "desc": "pip install matplotlib"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "Plotly",
   "about": "Interactive charts for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/plotly/"
    },
    {
     "name": "Install",
     "desc": "pip install plotly"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "Playwright",
   "about": "Browser automation for Python.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/playwright/"
    },
    {
     "name": "Install",
     "desc": "pip install playwright"
    }
   ]
  },
  {
   "database": "PyPI",
   "table": "HTTPie",
   "about": "Command-line HTTP client.",
   "fields": [
    {
     "name": "Kind",
     "desc": "PYPI"
    },
    {
     "name": "Link",
     "desc": "https://pypi.org/project/httpie/"
    },
    {
     "name": "Install",
     "desc": "pip install httpie"
    }
   ]
  }
 ],
 "platforms": [
  {
   "database": "Original",
   "table": "Artificial Intelligence",
   "about": "Select patents, papers, and policies concerning AI, the research behind them, and related peer review records.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.d39b380ic58tna.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Childcare",
   "about": "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.d30k1ocuoke6r4.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Consensus",
   "about": "Gather opinion at scale; groups emerge from the votes, not the loudest voice.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://policy.nysgpt.com/consensus"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Energy",
   "about": "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://main.d2bart0mempmp5.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Gov",
   "about": "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://policy.nysgpt.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Healthcare",
   "about": "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.d3ekz2nd1zxars.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Insurance",
   "about": "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Science",
   "about": "Brookhaven's Nuclear Science References — indexed by nuclide, reaction, and measured quantity.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.duruug4qfhs29.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Tariffs",
   "about": "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://amplify.d2yna3j4fmb5io.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Original",
   "table": "Video",
   "about": "Make videos that change minds and move feet.",
   "fields": [
    {
     "name": "Link",
     "desc": "https://shell-nysgpt.daxlxk6y7cgzd.amplifyapp.com"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Hugging Face",
   "about": "Models, datasets and Spaces for machine learning.",
   "fields": [
    {
     "name": "Kind",
     "desc": "MODELS"
    },
    {
     "name": "Link",
     "desc": "https://huggingface.co"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Kaggle",
   "about": "Datasets, notebooks and data science competitions.",
   "fields": [
    {
     "name": "Kind",
     "desc": "DATA"
    },
    {
     "name": "Link",
     "desc": "https://www.kaggle.com"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "GitHub",
   "about": "Code hosting and collaboration.",
   "fields": [
    {
     "name": "Kind",
     "desc": "CODE"
    },
    {
     "name": "Link",
     "desc": "https://github.com"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "AWS Marketplace",
   "about": "Software and data listings sold through AWS.",
   "fields": [
    {
     "name": "Kind",
     "desc": "MARKETPLACE"
    },
    {
     "name": "Link",
     "desc": "https://aws.amazon.com/marketplace"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Data.gov",
   "about": "US federal open data catalog.",
   "fields": [
    {
     "name": "Kind",
     "desc": "DATA"
    },
    {
     "name": "Link",
     "desc": "https://data.gov"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Zenodo",
   "about": "Research data and software archive run by CERN.",
   "fields": [
    {
     "name": "Kind",
     "desc": "ARCHIVE"
    },
    {
     "name": "Link",
     "desc": "https://zenodo.org"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "OpenML",
   "about": "Open datasets and experiment records for machine learning.",
   "fields": [
    {
     "name": "Kind",
     "desc": "DATA"
    },
    {
     "name": "Link",
     "desc": "https://www.openml.org"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Replicate",
   "about": "Run and host machine learning models through an API.",
   "fields": [
    {
     "name": "Kind",
     "desc": "MODELS"
    },
    {
     "name": "Link",
     "desc": "https://replicate.com"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Weights & Biases",
   "about": "Experiment tracking and model evaluation.",
   "fields": [
    {
     "name": "Kind",
     "desc": "TRACKING"
    },
    {
     "name": "Link",
     "desc": "https://wandb.ai"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Google Dataset Search",
   "about": "Search engine for open datasets across the web.",
   "fields": [
    {
     "name": "Kind",
     "desc": "SEARCH"
    },
    {
     "name": "Link",
     "desc": "https://datasetsearch.research.google.com"
    }
   ]
  },
  {
   "database": "Outside",
   "table": "Registry of Open Data on AWS",
   "about": "Public datasets hosted on AWS.",
   "fields": [
    {
     "name": "Kind",
     "desc": "DATA"
    },
    {
     "name": "Link",
     "desc": "https://registry.opendata.aws"
    }
   ]
  }
 ]
}

export const SET_INFO: Record<Exclude<BoxKind, 'data'>, SetEntry[]> = { ...OWN_INFO, tables: [], ...SOURCE_INFO }
