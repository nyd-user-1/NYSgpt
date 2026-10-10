/**
 * The homepage's two data plates, shared between the page (masthead + contents
 * grid) and the switchboard panel (which lives in the root layout so it can
 * follow the reader across routes). One copy, or the panel and the page drift.
 */

import { API_SAMPLES } from "./api-samples";

export type HomeCardData = {
  /** Empty for a tool with no public page: the cell renders, but goes nowhere. */
  href: string;
  /**
   * The name the panel prints as its header. Set where `href` is the
   * password-protected Amplify address (2026-10-01), so the header still reads
   * as the product's own domain rather than a build hostname.
   */
  domain?: string;
  title: string;
  /** What kind of thing the box is (Model, Data, Tool), printed bottom-left as a chip; platforms print Platform. */
  tag?: string;
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
  /** The resting bottom line. Products: where the data comes from. Tools: what kind of tool. */
  sources?: string;
  /** The card dialog: Problem, Agitate, Solution. */
  pas?: { problem: string; agitate: string; solution: string };
  /**
   * The dialog's headline: the ordinary way against this tool. One sentence, or
   * a pair: the ordinary way first, then the tool's answer once the reader has
   * pressed the illustration's button (the headline changes with it).
   */
  statement?: string | [string, string];
  /** The dialog's title, where it differs from the card's. */
  dialogTitle?: string;
  /**
   * The dialog's copy for a card with a paired statement: what it says before
   * and after the reader presses the illustration's button. The first line of
   * each is its lead.
   */
  story?: { before: string[]; after: string[] };
  /**
   * The dialog's screenshots. More than one and the browser frame grows a
   * Prev · Next pager. Unset, the frame shows /products/<slug>.png. Shots
   * listed here are full pages carrying their own framing, so they draw
   * contained on the shot's own ground instead of cover-cropped.
   */
  shots?: string[];
  /**
   * The dialog's API reference: the base URL, an example call, and the
   * endpoints with the records behind each (exact counts of 2026-09-30 and
   * 2026-10-01, databases and S3 alike; docs/TASK-SWITCHBOARD-COUNTS.md).
   */
  api?: { base: string; example: string; endpoints: [path: string, records: number][] };
  /** An API box's real response to `api.example`, from API_SAMPLES; drawn where a product shows its screenshot. */
  sample?: string;
  /** The same response read aloud: one row per fact, with the source it came from. */
  readout?: { title: string; rows: [label: string, value: string, source: string][] };
  /** An API box's dataset in aws/api/catalog: every table it publishes, listed and sampled in the dialog. */
  catalog?: string;
};

const TOOL_INK = "#033882";
const HF = "https://huggingface.co/NYSgpt";
const GOV = "https://policy.nysgpt.com";

/** The second plate — the tooling under the products, stated generally. The
 *  figures are approximate (~), measured or summed on 2026-10-02.
 *
 *  Each tool's story is what its dialog says: "before" while the
 *  illustration shows the ordinary way, "after" once the reader has pressed
 *  its button. The first line of each is the lead. The evidence is from the
 *  projects' own evaluation reports and counts (2026-10-03), one vertical per
 *  tool so nothing is told twice, with the institutions' names left out. */
export const TOOLS: HomeCardData[] = [
  { href: HF, title: "Encoder", dialogTitle: "Custom Encoder", accent: "#0e7490", tag: "Model",
    statement: ["Regular Search lists a popular answer.", "Custom Encoding surfaces the best answer."],
    sources: "Model", value: 1_200_000_000, unit: "~ parameters",
    body: "A custom embedding model trained on your own data, so search understands your data.",
    story: {
      before: [
        "A researcher types a question the way a colleague would ask it. Ordinary search reads it as a bag of words and hands back anything that shares them. General-purpose AI search does better, but it learned language from the open web, not from your field.",
        "In a specialised archive that gap is wide. Most papers in a physics reference library have a title and nothing else, and older work uses older terms. The phrase an expert types is rarely the phrase the author wrote, so the right paper sits in the archive and never comes up.",
        "People stop trusting search and fall back on memory and colleagues. New staff never find what the veterans know is there. And every query sent to an outside model sends your documents along with it."
      ],
      after: [
        "A custom encoder learns your field from your own documents. In biomedicine, its practice questions came from the subject headings and keywords already attached to the papers; in physics, from the summaries expert indexers write for every paper. No labelling project, no click logs.",
        "In a physics library of 277,000 papers, the right paper landed in the first ten results 49% of the time, up from 17% for the general model it started from, with the largest gains on title-only papers and work from before 1970. Across 433,000 biomedical papers, it beat the leading biomedical search model, which learned from 255 million real search clicks, using just 100,000 examples.",
        "It runs on your own servers and arrives with an embedding for every record, so search by meaning works on day one and your documents never leave."
      ],
    } },
  { href: HF, title: "Reranker", accent: "#c026d3", tag: "Model",
    statement: ["Regular search leaves the correct answer off the page.", "Custom Reranking puts it first."],
    sources: "Model", value: 323_000_000, unit: "~ parameters",
    body: "Put the best answer first, trained on how your field judges relevance.",
    story: {
      before: [
        "Search is built for speed. It pulls back a few hundred candidates in milliseconds and sorts them by a rough score. The right answer is usually somewhere in that list. It is rarely at the top.",
        "Readers do not dig. They read the first few results, decide the answer is not there, and leave. An AI assistant does worse: it answers from the top handful of results, so when the ranking is wrong the answer is wrong, stated with confidence and citing the wrong sources.",
        "In research, law or medicine, the cost is not a slow search. It is a decision made on the second-best evidence, because the best evidence was on page two and nobody went there. Better first-stage search alone cannot fix the order."
      ],
      after: [
        "A reranker reads each candidate side by side with the question, the way a specialist would, and puts the one that answers it first. It learns what relevant means from your field's own judgments: in AI research, from peer reviewers' summaries of the papers they reviewed.",
        "Tested on 3,157 questions it had never seen, each with nine closely related papers to choose from, it put the correct paper first 93% of the time and in the top three 98% of the time. A leading general-purpose embedding model managed 68%. Over a physics library, it more than doubled how often the right paper came first.",
        "It makes 57% fewer ranking errors than the open model it started from, answers in about 41 milliseconds, and is small enough to run on your own hardware. Your readers, and your AI, start from the best evidence."
      ],
    } },
  { href: "", title: "Classifier", accent: "#be185d", tag: "Model",
    statement: ["Manual Tagging never catches up.", "Custom Classification sorts every item as it arrives."],
    sources: "Model", value: 303_100_000, unit: "~ parameters",
    body: "Sort a field's documents into its own categories, automatically.",
    story: {
      before: [
        "Every archive runs on labels. A paper needs its field, a bill needs its committee, a support email needs its team. Someone has to read each one and decide, and new ones arrive every day.",
        "Tagging by hand falls behind within a week, and no two people tag the same way. A preprint server takes in thousands of papers a month across dozens of subject areas; a legislature files thousands of bills a session, each waiting for someone to work out where it goes. Untagged items pile up where nobody can filter, route or count them.",
        "The archive keeps growing and gets harder to use. Simple questions, like how much of this do we have, go unanswered, and the backlog becomes a project nobody has time to start."
      ],
      after: [
        "A custom classifier learns your categories from the items you have already sorted, then labels every new one the moment it arrives. There is no new labelling work: it trains on decisions your organisation has already made.",
        "Trained on one state legislature's bills, it names the committee a newly filed bill will be sent to, and is right 85.6% of the time. Across 325,000 biomedical preprints, it files each paper into one of 76 subject areas from its title and abstract, beating a similarity-search baseline by seven points overall and by fifteen on the small subjects, where help is needed most.",
        "Where an item honestly belongs in two places, it offers two or three choices instead of forcing one. Everything is filterable, routable and countable from the day it lands."
      ],
    } },
  { href: GOV, title: "Compiler", accent: "#4d7c0f", tag: "Data",
    statement: ["Regular Documents are laid out for printing.", "Compiled Documents are structured for AI to read."],
    sources: "Data", value: 2_200_000, unit: "~ sections compiled",
    body: "Turn any document into its field's standard structure, then into AI-ready Markdown and JSON.",
    story: {
      before: [
        "Documents are made for printers. A statute, a contract or a regulation tells a human reader where each section starts, what it cites and what changed, through numbering, indentation and footnotes. Software sees none of that. It sees one long run of characters.",
        "Hand that page to an AI and it guesses. It merges two subsections into one, loses the footnote that changes the meaning, and cannot tell this year's version from last year's. Ask which clause was amended, and by what, and the answer is invented.",
        "So teams copy and paste. Analysts rebuild the same document by hand for every new tool, every search index and every chatbot, and the structure the author put there is lost each time the file is opened."
      ],
      after: [
        "The compiler reads a document the way its field defines it and writes that structure down. Every section gets its own address, every citation becomes a link to the thing it cites, and every amendment is recorded against the text it changed. The result is the field's own standard format, plus clean Markdown and JSON.",
        "It has compiled the statutes of all fifty states and the federal code, about 2.2 million sections, into the legal profession's standard XML. A lawyer, a search index or an AI can now ask for one subsection of one title as it stood on one date, and get exactly that.",
        "Your documents become data an AI can quote, compare and track, without anyone retyping them."
      ],
    } },
  { href: "", title: "Loaders", accent: "#b91c1c", tag: "Data",
    statement: ["Resold Data arrives late, with someone else's errors.", "Custom Loaders pull it from the original source."],
    sources: "Data", value: 12_000_000_000, unit: "~ records loaded",
    body: "Pull records straight from the original source, on a schedule, at any scale.",
    story: {
      before: [
        "The data worth having belongs to someone else. Agencies, insurers and regulators publish it on their own schedules and in their own formats: a web page here, a PDF there, a spreadsheet, an API that changes without notice.",
        "Buying it from a reseller is faster, but the copies arrive weeks late, with someone else's errors and no way to check them against the original. Collecting it in-house means a team writing and repairing scrapers forever, and the files keep getting bigger. Some are too large to open on a desktop at all.",
        "Every new source starts the work again from nothing, so the data you need for the next decision is always the data you do not have yet."
      ],
      after: [
        "Loaders go straight to the original source, whatever form it takes, and bring every record back in one consistent shape. Each record is checked on arrival and keeps a link to the file it came from, so any number can be traced back to where it was published.",
        "In health care, loaders brought in 16.4 million published insurer rates and 9.7 million provider records directly from the transparency files insurers and federal agencies publish, files measured in hundreds of gigabytes. Across every vertical, the same loaders have brought in about twelve billion records.",
        "Point a loader at a website, a PDF, a spreadsheet or an API, and it runs on a schedule from then on. Your data comes from the source, not from a reseller."
      ],
    } },
  { href: "", title: "Lake", accent: "#a16207", tag: "Data",
    statement: ["Regular Files need a new script for every question.", "A Custom Lake answers the question as you ask it."],
    sources: "Data", value: 852_000_000, unit: "~ rows queryable",
    body: "Ask every record held a question, and pay only when you ask.",
    story: {
      before: [
        "Large datasets end up as files. Billions of rows sit in folders that nothing can read without custom code, so every question starts with an engineer writing a new script.",
        "Loading it all into a database solves that and creates a bill. A database big enough to hold everything costs money every hour it is switched on, whether anyone asks it anything or not. Most organisations pick one: keep the data cheap and unusable, or usable and expensive.",
        "Meanwhile nobody can answer the simplest question about the collection itself: how many records do we actually hold? The answer depends on which copy you count, and the copies disagree."
      ],
      after: [
        "A lake turns your files into tables you can question in plain words or in SQL, with nothing running between questions. Every file carries a manifest, so every record can be counted, and you pay only for the data each question reads, usually a fraction of a cent.",
        "In elections and campaign finance, forty-six years of federal campaign-finance filings, more than five billion lines, were converted into queryable tables for less than a dollar. Beside them sit 120 million precinct returns and 46 million ranked-choice ballots, ready to join.",
        "Ask which candidate raised the most in a district, or how a precinct voted across six elections, and the answer comes back in seconds. The data stays cheap to keep and stops being expensive to use."
      ],
    } },
  { href: "", title: "Pipeline", accent: "#475569", tag: "Data",
    statement: ["Regular Data is stale the day after it loads.", "A Custom Pipeline keeps every source current."],
    sources: "Data", value: 168_000_000, unit: "~ records kept fresh",
    body: "Load, structure, store and refresh every source: the loaders, the compiler, the lake and the pipeline, on one switch.",
    story: {
      before: [
        "Data starts going stale the day after it is loaded. Every source updates on its own schedule and in its own way: one posts nightly, one weekly, one whenever a clerk gets to it.",
        "Fifty-two sources means fifty-two schedules, fifty-two ways to fail and no single view of which ones did. A broken feed looks exactly like a quiet week. Duplicates slip in, records arrive without their identifiers, and bad rows reach the dashboard before anyone notices.",
        "The first person to spot the problem is usually a customer, a reporter or an executive in a meeting, which is the worst possible person to spot it."
      ],
      after: [
        "One pipeline runs every source the same way. It discovers what changed at the source, fetches only that, checks it, and publishes what passes. A record that fails a check, a duplicate or a missing identifier, is held back with the reason attached instead of published.",
        "For legislation, one pipeline keeps all fifty states, the District of Columbia and Congress current, about 168 million records of bills, votes, sponsors and actions. Every jurisdiction's status sits on one board, so a stalled source is visible the morning it stalls, not the week someone complains.",
        "You get one switch for every source, one place to look and data you can trust on the day you use it."
      ],
    } },
  { href: `${GOV}/consensus`, title: "Consensus", accent: "#ea580c", tag: "Tool",
    statement: ["A Regular Poll picks a winning side.", "Consensus finds what both sides agree on."],
    sources: "Civic", value: 0, unit: "",
    body: "Gather opinion at scale; groups emerge from the votes, not the loudest voice.",
    story: {
      before: [
        "A poll asks one question and reports who won. Fifty-one to forty-nine makes a headline, but it gives a decision-maker nothing to act on: half the room is told it lost, and the other half that it barely won. Neither side learns anything about the other.",
        "Public comment is worse. Hearings and comment boxes fill with whoever has the time and the strongest feelings. Officials hear the same voices at every meeting, the extremes on both ends, and conclude the public is hopelessly split.",
        "Most people never weigh in, so the common ground they share never shows up anywhere. Every issue looks like a fight between two camps, positions harden, and the proposals most people would accept never reach the table."
      ],
      after: [
        "Consensus asks the room many short questions instead of one. People vote agree, disagree or pass on statements their neighbours wrote, and the groups form from the voting itself, not from party labels or who spoke loudest. A statement only counts as common ground when every group agrees, so a large group cannot outvote a small one.",
        "In one mid-sized city, 2,031 residents cast about 225,000 votes on 896 statements. Two groups emerged that stood 75 points apart on a single ordinance. The same two groups agreed, about four in five, that new developments must account for traffic, that officials with a stake in a project should not vote on it, and that the city needed more competition among cable providers.",
        "Each agreed statement becomes a policy starting point, ready for a legislator, an agency or a campaign to act on."
      ],
    } },
  { href: "", title: "Agentic Inbox", accent: "#7c3aed", tag: "Tool",
    statement: ["Regular Chat keeps you at the screen while the text streams in.", "An Agentic Inbox takes the task while you go to lunch."],
    sources: "Agent", value: 6_200_000_000, unit: "~ records",
    body: "Email an agent a task and get on with your day; the finished work arrives in your inbox.",
    story: {
      before: [
        "Chat assistants only work while you watch them. You ask a question, and the answer streams in a line at a time while you sit and wait.",
        "Step away and the work stops. Close the tab and it is gone. A serious question, the kind that means checking fifty sources and writing up what they say, takes an hour of that, and the hour is yours: you cannot take a call, go to a meeting or start something else.",
        "So the big questions do not get asked. People settle for the quick answer that fits in the time they can spare, and the report that would have changed the decision never gets written."
      ],
      after: [
        "An agentic inbox gives the agent its own email address. You send it a task the way you send a colleague an email, then go to your meeting, to lunch or home. It works on its own, and the finished report, with its sources, is waiting in your inbox when you get back.",
        "In one test, an agent was asked by email for a report on an election reform across every state and Congress back to 2009. It found 947 bills, identified the 13 that became law and delivered a 16-page report 41 minutes later, with nobody watching. A shorter question, where one federal bill stands, came back in 95 seconds.",
        "Send the task. Get on with your day."
      ],
    } },
  /* Not a tool of its own: the door to the Dev Tools plate (HQ and the
     Inspector). It opens no dialog; clicking it slides the rail there
     (app/HomeContents). */
  { href: "", title: "Dev Tools", accent: TOOL_INK, value: 0, unit: "",
    body: "HQ and the Inspector: the instruments the platforms and tools are built with." },
];

/** The third plate — the in-house instruments. */
export const IN_HOUSE: HomeCardData[] = [
  { href: "https://hq.nysgpt.com", title: "HQ", accent: TOOL_INK,
    statement: "A Regular Terminal shows one session, HQ shows the whole fleet — live, priced and searchable.",
    sources: "Development", value: 1_500_000_000, unit: "~ tokens accounted",
    body: "The workspace that replaces the bare terminal for working with coding agents.",
    shots: ["/products/hq.png", "/products/hq-analytics.png", "/products/hq-states.png"],
    // HQ has no illustration button to flip the stage, so `after` mirrors
    // `before` and the write-up stands as one piece.
    story: {
      before: [
        "HQ is the workspace that replaces the bare terminal for working with coding agents. Every live session runs in a state-colored panel — working, waiting, done, interrupted — under a daemon whose warm processes outlive the server, with up to four panes side by side. Replies and permission prompts come back from the dashboard, policy-checked, and components drag into the prompt as the file paths they live at.",
        "Nothing ages out silently. Every session ever run stays searchable — transcripts, memory, notes, source, down to whether Claude wrote the line — and a ledger prices each one in tokens and dollars, per session and per turn, with caching savings counted. Weekly caps and a live burn alarm watch the spend. The metrics are computed from disk, no API required, and HQ is its own telemetry receiver, so there is no collector to run.",
        "A local gateway sits in the request path from a session's birth, so a live session can flip onto AWS Bedrock mid-conversation with no restart — fail-open, a broken backstop never breaking the session, and passthrough, never inspecting a request or response body. HQ is the tool this site was built with.",
      ],
      after: [
        "HQ is the workspace that replaces the bare terminal for working with coding agents. Every live session runs in a state-colored panel — working, waiting, done, interrupted — under a daemon whose warm processes outlive the server, with up to four panes side by side. Replies and permission prompts come back from the dashboard, policy-checked, and components drag into the prompt as the file paths they live at.",
        "Nothing ages out silently. Every session ever run stays searchable — transcripts, memory, notes, source, down to whether Claude wrote the line — and a ledger prices each one in tokens and dollars, per session and per turn, with caching savings counted. Weekly caps and a live burn alarm watch the spend. The metrics are computed from disk, no API required, and HQ is its own telemetry receiver, so there is no collector to run.",
        "A local gateway sits in the request path from a session's birth, so a live session can flip onto AWS Bedrock mid-conversation with no restart — fail-open, a broken backstop never breaking the session, and passthrough, never inspecting a request or response body. HQ is the tool this site was built with.",
      ],
    } },
  { href: "", title: "Inspector", accent: TOOL_INK,
    statement: ["A Screenshot costs about 2,700 tokens, on every turn.", "The Inspector saves about 2,680 of those tokens, on every turn."],
    sources: "Development", value: 852, unit: "~ components mapped",
    body: "Point at anything on a page and hand its exact location to an AI.",
    story: {
      before: [
        "To ask an AI to change something on a page, you first have to show it which thing you mean. Most people take a screenshot and describe the rest.",
        "A full-screen screenshot costs about 2,700 tokens. The whole conversation, picture included, is sent again on every turn, so twenty turns of back-and-forth spends about 54,000 tokens on one image. The AI still has to guess which of a hundred elements you were pointing at.",
        "It often guesses wrong. It edits the wrong button, restyles the wrong card or changes a component used in forty places, and the next twenty turns go to undoing it."
      ],
      after: [
        "The Inspector lets you point instead of describe. Turn it on, move over the page and click the element you mean. It copies a short brief — the component, the file and the exact line where it is written — ready to paste into any AI chat.",
        "The brief is about twenty tokens: a saving of about 2,680 on every turn it replaces a screenshot. A twenty-turn conversation drops from 54,000 tokens to about 360 — 99 percent of the spend gone, and a quarter of a 200,000-token context window handed back to the actual work. Multiply by every conversation and every seat, and the saving reads on the API bill.",
        "It also removes the guess: the AI goes straight to the line that draws the thing you clicked. In house, it maps 852 components across the product family. Try it on this page — turn it on, click anything, and see exactly what an AI would be told."
      ],
    } },
];

const MODEL_INK = "#7c3aed"

/**
 * The six public NYSgpt models on Hugging Face (2026-10-10).
 * Two private classifiers (cshl-MESH-tagger, cshl-category) are omitted.
 * Each card links directly to its HF model page.
 */
export const HF_MODELS: HomeCardData[] = [
  {
    href: 'https://huggingface.co/NYSgpt/nsr-encoder',
    title: 'NSR Encoder',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 0.6B bge-m3 encoder fine-tuned on Nuclear Science References — papers, nuclides and reactions — for semantic search by meaning.',
    value: 567_800_000,
    unit: 'Parameters',
    sources: 'NNDC · ENSDF · EXFOR',
  },
  {
    href: 'https://huggingface.co/NYSgpt/nsr-reranker',
    title: 'NSR Reranker',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 0.1B ModernBERT reranker that scores candidate nuclear-science passages for precision retrieval on top of the encoder.',
    value: 149_600_000,
    unit: 'Parameters',
    sources: 'NNDC · ENSDF · EXFOR',
  },
  {
    href: 'https://huggingface.co/NYSgpt/biomed-encoder',
    title: 'Biomed Encoder',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 0.6B bge-m3 encoder fine-tuned on biomedical literature for semantic search across health and pharmaceutical datasets.',
    value: 567_800_000,
    unit: 'Parameters',
    sources: 'PubMed · ClinicalTrials',
  },
  {
    href: 'https://huggingface.co/NYSgpt/biomed-reranker',
    title: 'Biomed Reranker',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 0.1B ModernBERT reranker for biomedical passage ranking, pairing with the Biomed Encoder in a two-stage retrieval pipeline.',
    value: 149_600_000,
    unit: 'Parameters',
    sources: 'PubMed · ClinicalTrials',
  },
  {
    href: 'https://huggingface.co/NYSgpt/44b-reranker',
    title: '44b Reranker',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 0.1B ModernBERT reranker trained on the 44B corpus — bills, votes, filings and law — for cross-domain legislative retrieval.',
    value: 149_600_000,
    unit: 'Parameters',
    sources: 'Congress · 50 states · LDA',
  },
  {
    href: 'https://huggingface.co/NYSgpt/44b-reranker-mini',
    title: '44b Reranker Mini',
    tag: 'Model',
    accent: MODEL_INK,
    body: 'A 22.7M MiniLM reranker — fast and lightweight — for low-latency legislative re-ranking where the full reranker is too slow.',
    value: 22_700_000,
    unit: 'Parameters',
    sources: 'Congress · 50 states · LDA',
  },
]

/** The products' bottom lines and dialogs, by title. A product's dialog also
 *  shows its screenshot, read from public/products/<title as a slug>.png. */
export const PRODUCT_EXTRAS: Record<string, Pick<HomeCardData, "sources" | "pas" | "statement" | "api">> = {
  "Artificial Intelligence": { statement: "Papers here, patents there, models somewhere else, or one search.", sources: "arXiv · USPTO · Hugging Face", pas: { problem: "AI research is scattered across papers, patents, model hubs and policy documents that don't link to each other.", agitate: "Anyone tracking what a model is built on, who holds the patent or what the reviewers said searches five places and reconciles them by hand, and still misses the connections.", solution: "One linked corpus of papers, citations, patents, models, datasets, peer reviews and AI regulations, searchable by meaning, with a chat that answers from the sources." }, api: { base: "https://api.nysgpt.com/v1/ai", example: "/papers?q=mixture+of+experts", endpoints: [["/uspto/bulk", 232_660_122], ["/citations", 32_412_085], ["/patents/fees", 27_182_181], ["/papers", 3_568_937], ["/embeddings", 3_559_781], ["/patents/assignments", 2_710_936], ["/papers/full-text", 1_616_772], ["/patents", 1_405_557], ["/repositories", 999_534], ["/funding-awards", 683_769], ["/models", 658_283], ["/peer-reviews", 354_821]] } },
  "Childcare": { statement: "Twenty-eight pages, one evening, or one conversation.", sources: "NY OCFS · US DOL", pas: { problem: "New York's childcare subsidy application is a 28-page PDF.", agitate: "The parents who most need help are the least able to spend an evening on eligibility rules, and one wrong box sends the form back.", solution: "A guided conversation finds licensed care nearby, estimates the real cost, checks eligibility and fills in the official form, ready to file." }, api: { base: "https://api.nysgpt.com/v1/childcare", example: "/facilities?zip=11201", endpoints: [["/facilities", 17_285], ["/locations", 16_542], ["/providers", 16_439], ["/zip-codes", 1_572], ["/cities", 1_333], ["/zip-codes/demographics", 1_169], ["/counties/costs", 930], ["/school-districts", 657], ["/legislative-districts", 213], ["/counties", 62]] } },
  "Healthcare": { statement: "Set prices by guesswork, or by what payers actually pay.", sources: "CMS · NPPES · DOL Form 5500", pas: { problem: "Small practices run scheduling, notes and billing in separate tools, and set prices without seeing what payers actually pay.", agitate: "Every disconnected system means double entry and missed revenue, and the published insurer rates sit in files too large to open.", solution: "One practice-management system and EHR with millions of published rates and every provider built in, so billing starts from real numbers." }, api: { base: "https://api.nysgpt.com/v1/ehr", example: "/rates?code=99213&state=NY", endpoints: [["/directory/aetna", 502_922_127], ["/rates", 16_452_641], ["/npis", 9_671_888], ["/network-listings", 2_441_556], ["/provider-aliases", 719_947], ["/schedule-a", 588_640], ["/nppes/endpoints", 556_512], ["/form-5500", 203_010], ["/directory/providers", 124_163], ["/organizations", 105_557], ["/plans", 20_542], ["/hcpcs", 8_725]] } },
  "Energy": { statement: "Every grid operator, every power plant, every hour, one API.", sources: "EIA · NYISO · NREL", pas: { problem: "Data on every power plant in the country is public, but it ships as dozens of EIA, NYISO and NREL releases, each with its own keys, years and formats.", agitate: "A simple question, such as what runs this grid, what it emits and what an hour of power costs, means joining spreadsheets by hand before the first answer.", solution: "One keyed REST and MCP API over 16,132 plants and 34,855 generators: 4.3 billion MWh of reported generation, 7.7 million grid observations, 6.6 million nodal prices, 246,764 outage records, and every utility, service territory and balancing authority." }, api: { base: "https://api.nysgpt.com/v1/energy", example: "/markets/nyiso?zone=N.Y.C.&start=2026-07-01", endpoints: [["/bulk/nyiso", 1_606_729_873], ["/markets/nyiso", 1_326_455_588], ["/bulk/ercot", 977_739_078], ["/markets/ercot", 604_020_070], ["/eia/series", 83_422_633], ["/markets/spp", 48_934_031], ["/markets/caiso", 45_960_808], ["/grid/observations", 7_660_306], ["/prices/nodal", 6_562_227], ["/markets/miso", 6_292_922], ["/generators", 34_855], ["/plants", 16_132]] } },
  "Insurance": { statement: "A price on one site, a crash rating on another, or both in one chat.", sources: "NHTSA", pas: { problem: "Buying auto coverage means comparing prices without knowing how safe the car is.", agitate: "Safety ratings live on one government site and prices on another, and nothing puts them side by side.", solution: "Compare and buy coverage inside a chat that knows the NHTSA crash rating of every make and model." }, api: { base: "https://api.nysgpt.com/v1/insurance", example: "/vehicles?make=Toyota&year=2025", endpoints: [["/vehicles", 17_306], ["/ratings/frontal-driver", 9_572], ["/crash-tests/frontal", 8_479], ["/ratings/rollover", 8_192], ["/crash-tests/side", 7_634], ["/ratings/side-pole", 5_875], ["/ratings/overall", 5_468], ["/models", 2_524], ["/makes", 64]] } },
  "Gov": { statement: "Fifty-two legislatures, fifty-two websites, or one API.", sources: "Congress · 50 states · LDA", pas: { problem: "What legislatures do, their bills, votes, sponsors and lobbying, is published in fifty-two different formats.", agitate: "Following one issue across states means fifty-two websites, and the lobbying behind a bill sits in a separate federal database.", solution: "One keyed REST and MCP API over Congress and all fifty states: 2.1 million bills with 3.5 million texts, 89 million member votes, 1.7 million roll calls, 22,726 legislators, 2.2 million sections of law and 357,379 lobbying filings." }, api: { base: "https://api.nysgpt.com/v1/policy", example: "/bills?state=NY&q=housing", endpoints: [["/fec/transactions", 5_146_250_962], ["/votes", 89_135_777], ["/bills/actions", 18_122_066], ["/sponsorships", 12_084_763], ["/bills/xml", 5_032_103], ["/bills/texts", 3_489_901], ["/laws/sections", 2_218_042], ["/bills", 2_129_901], ["/roll-calls", 1_730_826], ["/bills/pdf", 1_233_996], ["/lobbying/filings", 357_379], ["/members", 22_726]] } },
  "Science": { statement: "Seventy years of nuclear physics, searched by keyword or by reaction.", sources: "NNDC · ENSDF · EXFOR", pas: { problem: "Seventy years of nuclear-physics literature is indexed, but only by keyword.", agitate: "A researcher looking for every measurement of one reaction on one nuclide wades through references that only match on words.", solution: "One keyed REST and MCP API over Brookhaven's Nuclear Science References: 303,568 references linked to 10,043 nuclides and 229,143 reactions, 20,120 ENSDF datasets, 27,070 EXFOR entries, and 277,068 embeddings for search by meaning." }, api: { base: "https://api.nysgpt.com/v1/science", example: "/references?nuclide=208Pb", endpoints: [["/references/authors", 1_404_442], ["/references/nuclides", 1_210_113], ["/references/subjects", 686_880], ["/embeddings", 554_136], ["/references", 303_568], ["/references/reactions", 229_143], ["/ensdf/references", 198_295], ["/papers/pdf", 37_689], ["/exfor/entries", 27_070], ["/ensdf/datasets", 20_120], ["/nuclides", 10_043]] } },
  "Solar": { statement: "A sales pitch, or every roof's numbers by ZIP code.", sources: "Project Sunroof · LBNL · NREL", pas: { problem: "Whether a roof is worth solar depends on data scattered across satellite imagery, utility tariffs and installer records.", agitate: "Homeowners get a sales pitch instead of the numbers, and planners can't see the potential street by street.", solution: "One keyed REST and MCP API from state to census tract: 1.1 million MW of rooftop potential, 787 million tons of carbon offset, 3.4 million installed systems, and 486,436 utility rate rows across 52,589 tracts and 11,512 ZIP codes." }, api: { base: "https://api.nysgpt.com/v1/solar", example: "/rooftops/zips?zip=11968", endpoints: [["/open-energy-data", 37_247_721], ["/rates/zip", 486_436], ["/cambium/hourly", 248_832], ["/installs/installers", 55_260], ["/rooftops/tracts", 52_589], ["/roof-orientation", 45_116], ["/cambium/zips", 40_462], ["/rooftops/zips", 11_512], ["/rooftops/cities", 8_194], ["/rooftops/counties", 1_029]] } },
  "Sports": { statement: "Box scores in team notebooks, or every yard on one ledger.", sources: "Box scores · NYSED", pas: { problem: "High-school football statistics disappear into team notebooks and local papers.", agitate: "Recruits, scouts and families have no single record of what happened on the field.", solution: "A live ledger of every game, player and yard in New York high-school football, with box scores and season leaders." }, api: { base: "https://api.nysgpt.com/v1/sports", example: "/games?season=2025", endpoints: [["/stat-lines", 14_615], ["/rosters", 8_168], ["/players", 4_722], ["/seasons/stat-lines", 4_639], ["/schools/regents", 2_219], ["/games", 1_123], ["/box-scores", 1_108], ["/schools", 52]] } },
  "Video": { statement: "See how a video will do before you post it, and what would make it better.", sources: "Wesleyan Media Project · Swayable · Upworthy", pas: { problem: "Advocacy groups put real money into videos without knowing which ones will spread or change anyone's mind.", agitate: "By the time the numbers come in, the moment has passed, and the next video starts from the same guess.", solution: "Hermes watches how videos from influential and reform channels spread in their first 72 hours, and reads each one through every lens it can: audio, transcript, public reach, paid support. Record yours, from a provided script or your own, and it scores the cut as Likely Performance, suggests changes, and scores the improved version as Enhanced Performance. Once it's posted, Hermes tracks how it actually does and feeds that back into its model, so every video sharpens the next forecast." } },
  "Tariffs": { statement: "A broker and a few weeks, or one upload of the 7501.", sources: "CBP CROSS · USITC HTS", pas: { problem: "Importers routinely overpay duties because classification turns on thousands of rulings.", agitate: "Refunds are available, but finding the ruling that applies and doing the duty math takes a broker and weeks.", solution: "Upload a CBP 7501, and the chat finds the matching rulings and HTS codes, computes the duty and shows the refund owed." }, api: { base: "https://api.nysgpt.com/v1/tariffs", example: "/rulings?hts=8471.30", endpoints: [["/rulings", 221_605], ["/search", 221_603], ["/rulings/documents", 221_306], ["/rulings/terms", 41_301], ["/hts", 35_795], ["/hts/codes", 19_949], ["/duties", 7_950], ["/rulings/refund-eligible", 6_637], ["/brokers", 2_515], ["/countries", 150]] } },
};

/**
 * The live API (2026-10-08): one key, one base, the same three kinds of call
 * on every dataset (a search, a record by id, and that record joined to what
 * no single public source connects it to). Read-only, behind API Gateway keys
 * and usage plans (Free 1,000 calls a month, Pro 100,000); the function is
 * aws/api/index.mjs. Records are what each dataset's calls reach, from the
 * 2026-09-30 counts above.
 */
const API = "https://api.nysgpt.com/v1";
export const APIS: HomeCardData[] = [
  { href: "", title: "Gov API", tag: "Data", accent: "", value: 168_850_728, unit: "records",
    body: "133 tables: bills, texts, sponsors, roll calls and every member's vote, laws, lobbying and campaign finance, from all fifty states and Congress.",
    statement: "A bill, who sponsored it and how each member voted, in one call.",
    readout: { title: "S03822 · New York Senate, 2025", rows: [
      ["Bill", "Lets nurse practitioners make the determinations physicians already can", "Bill record"],
      ["Status", "Signed by the Governor, Chapter 159", "Bill record"],
      ["Sponsors", "8: 4 Democrats, 4 Republicans", "Sponsorships"],
      ["Senate vote", "59 yes, 1 no", "Roll calls"],
      ["Assembly vote", "133 yes, 1 no", "Roll calls"],
      ["Committee votes", "6, all unanimous", "Roll calls"],
    ] },
    sample: API_SAMPLES.gov, catalog: "gov",
    api: { base: `${API}/gov`, example: "/bills/1948255", endpoints: [["/rollcalls/{id}", 89_135_777], ["/bills/{id}", 12_084_763], ["/bills?q=", 2_129_901], ["/people?q=", 22_726]] } },
  { href: "", title: "Energy API", tag: "Data", accent: "", value: 27_884_715, unit: "records",
    body: "93 tables: every US power plant and generator, grid operations by the hour, prices, outages and emissions.",
    statement: "A plant, its generators and its output by fuel, in one call.",
    readout: { title: "Robert Moses Niagara · Lewiston, NY", rows: [
      ["Owner", "New York Power Authority", "EIA-860 plant"],
      ["Grid", "New York ISO", "EIA-860 plant"],
      ["Capacity", "2,429 MW across 13 generators", "EIA-860 generators"],
      ["Fuel", "Hydro, from the Niagara River", "EIA-860 generators"],
      ["Generated", "15.6 million MWh in 2024", "EIA-923 generation"],
    ] },
    sample: API_SAMPLES.energy, catalog: "energy",
    api: { base: `${API}/energy`, example: "/plants/2693", endpoints: [["/plants/{id}", 51_268], ["/plants?q=&state=", 16_132]] } },
  { href: "", title: "Health API", tag: "Data", accent: "", value: 36_948_025, unit: "records",
    body: "50 tables: every NPI, the insurer networks it sits in, the rates insurers publish, plans, employers and Form 5500 filings.",
    statement: "A provider, its networks and its negotiated rates, in one call.",
    readout: { title: "Middletown Medical PC · Middletown, NY", rows: [
      ["Provider", "Group practice, NPI 1902855828", "NPPES"],
      ["Networks", "11 Humana networks", "Insurer directories"],
      ["Published rates", "3,540 negotiated rates", "Insurer price files"],
      ["Example", "Psychiatric evaluation (90791): $124 to $194 with Aetna", "Insurer price files"],
    ] },
    sample: API_SAMPLES.health, catalog: "health",
    api: { base: `${API}/health`, example: "/providers/1902855828", endpoints: [["/providers/{npi}", 28_566_085], ["/providers?zip=", 1_947_004]] } },
  { href: "", title: "Tariffs API", tag: "Data", accent: "", value: 534_818, unit: "records",
    body: "11 tables: every CBP customs ruling, the full tariff schedule, import duties, trade flows and licensed brokers.",
    statement: "A customs ruling and the duty it points to, in one call.",
    readout: { title: "Ruling M80185 · February 15, 2006", rows: [
      ["Goods", "Women's pullovers from China", "CBP ruling"],
      ["Classified under", "6110.20.20.77", "CBP ruling"],
      ["Tariff line", "Sweaters and pullovers, of cotton", "Tariff schedule"],
      ["Duty", "16.5%", "Tariff schedule"],
    ] },
    sample: API_SAMPLES.tariffs, catalog: "tariffs",
    api: { base: `${API}/tariffs`, example: "/rulings/M80185", endpoints: [["/rulings/{id}", 257_400], ["/rulings?q=", 221_605], ["/hts/{code}", 35_795]] } },
  { href: "", title: "AI API", tag: "Data", accent: "", value: 61_783_655, unit: "records",
    body: "85 tables: AI papers and citations, patents and assignments, Hugging Face models, benchmarks, chips, data centers and funding.",
    statement: "Papers, patents, models and the benchmarks that rank them, in one API.",
    sample: "", catalog: "ai",
    api: { base: `${API}/ai`, example: "/document-citations?limit=1", endpoints: [] } },
  { href: "", title: "Science API", tag: "Data", accent: "", value: 5_322_648, unit: "records",
    body: "33 tables: Brookhaven's Nuclear Science References by nuclide, reaction and author, with ENSDF and EXFOR.",
    statement: "Seventy years of nuclear physics, searchable by nuclide and reaction.",
    sample: "", catalog: "science",
    api: { base: `${API}/science`, example: "/nsr-authors?limit=1", endpoints: [] } },
  { href: "", title: "Solar API", tag: "Data", accent: "", value: 1_437_085, unit: "records",
    body: "27 tables: rooftop solar potential by tract and ZIP, installs and installers, utility rates and hourly emissions.",
    statement: "Every roof's solar potential and every installed system, by ZIP.",
    sample: "", catalog: "solar",
    api: { base: `${API}/solar`, example: "/urdb-zip-rates?limit=1", endpoints: [] } },
  { href: "", title: "Childcare API", tag: "Data", accent: "", value: 19_659, unit: "records",
    body: "5 tables: every licensed childcare facility in New York with capacity, plus costs and demographics by county and ZIP.",
    statement: "Every licensed childcare seat in New York, by ZIP.",
    sample: "", catalog: "childcare",
    api: { base: `${API}/childcare`, example: "/facilities?limit=1", endpoints: [] } },
  { href: "", title: "Insurance API", tag: "Data", accent: "", value: 17_306, unit: "records",
    body: "NHTSA crash tests and star ratings for every rated make, model and year.",
    statement: "The crash rating of every rated car, in one call.",
    sample: "", catalog: "insurance",
    api: { base: `${API}/insurance`, example: "/safercar-data?limit=1", endpoints: [] } },
  { href: "", title: "Sports API", tag: "Data", accent: "", value: 37_265, unit: "records",
    body: "11 tables: New York high-school football games, box scores, rosters, players and season stats.",
    statement: "Every game, player and yard of New York high-school football.",
    sample: "", catalog: "sports",
    api: { base: `${API}/sports`, example: "/player-game-stats?limit=1", endpoints: [] } },
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
    shots: ["/products/ai-home.avif", "/products/ai-search.avif", "/products/ai-paper.avif", "/products/ai-lab.avif", "/products/ai-dashboard.avif", "/products/ai-discussion.avif"],
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
  { href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com", domain: "childcare.nysgpt.com", title: "Childcare", accent: "#2f6d6a", body: "New York's 28-page childcare-subsidy PDF, rebuilt as a guided form that files itself.", value: 19_663, unit: "records",
    shots: ["/products/childcare-1.avif", "/products/childcare-2.avif", "/products/childcare-3.avif", "/products/childcare-4.avif", "/products/childcare-5.avif", "/products/childcare-6.avif", "/products/childcare-7.avif", "/products/childcare-8.avif"],
    // Measured 2026-09-30 from the childcare DB (Neon childcaregpt): exact
    // count(*) and sums over all 6 tables, 19,663 rows.
    stats: [
      { value: 729_502, unit: "seats", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 429_556, unit: "school-age seats", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 114_220, unit: "preschool seats", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 36_656, unit: "toddler seats", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 17_179, unit: "infant seats", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 17_285, unit: "facilities", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 16_439, unit: "providers", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/search" },
      { value: 16_542, unit: "mapped locations", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/maps" },
      { value: 9_905, unit: "group family day cares", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 2_935, unit: "school-age programs", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 2_334, unit: "family day cares", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 2_109, unit: "day care centers", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/facility" },
      { value: 1_278_617, unit: "children under six", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/county" },
      { value: 1_572, unit: "ZIP codes", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/zip-code" },
      { value: 1_169, unit: "ZIP demographic profiles", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/zip-code" },
      { value: 1_333, unit: "cities", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/city" },
      { value: 930, unit: "county cost rows", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/county" },
      { value: 657, unit: "school districts", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/search" },
      { value: 213, unit: "legislative districts", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/officials" },
      { value: 62, unit: "counties", href: "https://amplify.d30k1ocuoke6r4.amplifyapp.com/county" },
    ],
  },
  { href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com", domain: "leuk.nysgpt.com", title: "Healthcare", accent: "#3f8290", body: "All-in-one practice management and EHR — scheduling, notes, and billing over millions of published rates.", value: 592_386_952, unit: "records",
    shots: ["/products/ehr-home.jpg", "/products/ehr-directory-search.jpg", "/products/ehr-calendar.jpg", "/products/ehr-telehealth-scribe.jpg", "/products/ehr-billing.jpg", "/products/ehr-provider-marketing.jpg", "/products/ehr-therapist-landing.jpg"],
    // Measured 2026-09-30 from the Leuk public DB (Neon leuk-public): exact
    // count(*) of all 88 tables, 31,527,931 rows. Form 5500 filings = full +
    // short-form. /rates sits behind sign-in, so rate layers link the directory.
    stats: [
      { value: 16_452_641, unit: "rates", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 9_671_888, unit: "NPIs", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 2_441_556, unit: "network listings", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 719_947, unit: "provider aliases", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 588_640, unit: "Schedule A rows", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 556_512, unit: "NPPES endpoints", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 203_010, unit: "Form 5500 filings", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 163_523, unit: "organization affiliations", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 124_163, unit: "directory providers", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 105_557, unit: "organizations", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 99_511, unit: "provider qualifications", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/specialty" },
      { value: 67_111, unit: "employer census rows", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 56_646, unit: "FHIR services", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 44_916, unit: "FHIR locations", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 29_795, unit: "tax IDs", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 20_542, unit: "plans", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 19_356, unit: "relative value units", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 8_725, unit: "HCPCS codes", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/specialty" },
      { value: 883, unit: "taxonomy codes", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/specialty" },
      { value: 72, unit: "networks", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
      { value: 48, unit: "insurers", href: "https://amplify.d3ekz2nd1zxars.amplifyapp.com/providers" },
    ],
  },
  { href: "https://main.d2bart0mempmp5.amplifyapp.com", domain: "solar.nysgpt.com", title: "Energy", accent: "#d97706", body: "Every generator in the EIA inventory — capacity, fuel, emissions, and actual net generation across the grid.", value: 4_867_679_100, unit: "records",
    shots: ["/products/energy-power-plants.png", "/products/energy-utilities.png", "/products/solar-gea-regions.avif", "/products/solar-suffolk-county.png"],
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
  { href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com", domain: "insurance.nysgpt.com", title: "Insurance", accent: "#16a34a", body: "Compare and buy auto coverage inside the chat, over NHTSA safety ratings for every make and model.", value: 21_406, unit: "records",
    shots: ["/products/insurance-1.avif", "/products/insurance-2.avif", "/products/insurance-3.avif"],
    // Measured 2026-09-30 from the insurance DB (Neon insurance): exact count(*)
    // of all 23 tables, 21,406 rows; rating cells count non-empty NHTSA fields.
    stats: [
      { value: 17_306, unit: "vehicles rated", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 9_572, unit: "frontal driver ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 8_479, unit: "frontal crash tests", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 8_192, unit: "rollover ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 8_159, unit: "stability factors", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 7_634, unit: "side crash tests", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 5_875, unit: "side pole ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 5_846, unit: "frontal star ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 5_831, unit: "side star ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 5_468, unit: "overall star ratings", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 3_497, unit: "five-star vehicles", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 2_524, unit: "models", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/makes" },
      { value: 129, unit: "body styles", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
      { value: 64, unit: "makes", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/makes" },
      { value: 37, unit: "model years", href: "https://amplify.d1xhvbmv1jbfz9.amplifyapp.com/explore" },
    ],
  },
  { href: "https://policy.nysgpt.com", title: "Gov", accent: "#3d63dd", body: "The New York legislature as data — bills, votes, sponsors, contracts, and the full lobbying record.", value: 6_170_256_205, unit: "records",
    shots: ["/products/policy-home.png"],
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
    shots: ["/products/science-nuclide-chart.png", "/products/science-recipes.png"],
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
  { href: "https://main.d2bart0mempmp5.amplifyapp.com", domain: "solar.nysgpt.com", title: "Solar", accent: "#f59e0b", body: "State-to-ZIP drill-down over rooftop solar potential and reprojected satellite flux rasters.", value: 56_295_190, unit: "records",
    shots: ["/products/solar-gea-regions.avif", "/products/solar-suffolk-county.png"],
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
  { href: "https://amplify.d3nv15140uwc0s.amplifyapp.com", domain: "sports.nysgpt.com", title: "Sports", accent: "#033882", body: "New York high-school football as a live stat ledger — players, box scores, and every yard logged.", value: 37_270, unit: "records",
    shots: ["/products/sports-1.avif", "/products/sports-2.avif", "/products/sports-3.avif", "/products/sports-4.avif"],
    // Measured 2026-09-30 from the sports DB (Neon sports): exact count(*) of all
    // 23 tables, 37,270 rows; yardage and scoring are sums over player_game_stats
    // and games. hrefs unverified: deployment disabled 2026-09-30.
    stats: [
      { value: 309_762, unit: "rushing yards", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 192_044, unit: "passing yards", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 183_536, unit: "receiving yards", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 53_029, unit: "points scored", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/game" },
      { value: 43_130, unit: "carries", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 14_615, unit: "stat lines", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/game" },
      { value: 12_940, unit: "completions", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 11_404, unit: "receptions", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 8_168, unit: "roster rows", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/team" },
      { value: 8_003, unit: "touchdowns", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 4_722, unit: "players", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/player" },
      { value: 4_639, unit: "season stat lines", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/player" },
      { value: 2_219, unit: "Regents results", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/school" },
      { value: 1_123, unit: "games", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/game" },
      { value: 1_108, unit: "box scores", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/game" },
      { value: 970, unit: "sacks", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 584, unit: "interceptions", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/leaderboard" },
      { value: 52, unit: "schools", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/school" },
      { value: 5, unit: "seasons", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/board" },
      { value: 4, unit: "divisions", href: "https://amplify.d3nv15140uwc0s.amplifyapp.com/division" },
    ],
  },
  { href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com", domain: "tariffs.nysgpt.com", title: "Tariffs", accent: "#c9a961", body: "Read a CBP 7501 and get the refund you're owed — customs rulings, HTS codes, and the duty math.", value: 977_537, unit: "records",
    shots: ["/products/tariffs-1.avif", "/products/tariffs-2.avif", "/products/tariffs-3.avif", "/products/tariffs-4.avif"],
    // Measured 2026-09-30 from the tariffs DB (Neon tariffs): exact count(*) of
    // all 33 tables, 756,231 rows (CBP CROSS + HTS + USITC DataWeb).
    stats: [
      { value: 221_605, unit: "CROSS rulings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 221_603, unit: "embeddings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/search" },
      { value: 221_306, unit: "ruling PDFs indexed", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 215_917, unit: "ruling documents", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 184_071, unit: "New York rulings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 37_533, unit: "headquarters rulings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 41_301, unit: "ruling terms", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/search" },
      { value: 35_795, unit: "HTS lines", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/codes" },
      { value: 19_949, unit: "ten-digit HTS codes", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/codes" },
      { value: 7_950, unit: "import duty rows", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/duties" },
      { value: 6_637, unit: "refund-relevant rulings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/eligibility" },
      { value: 3_323, unit: "NAFTA rulings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/rulings" },
      { value: 3_103, unit: "tariff codes", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/codes" },
      { value: 2_515, unit: "customs brokers", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/data" },
      { value: 1_262, unit: "HTS headings", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/codes" },
      { value: 150, unit: "countries", href: "https://amplify.d2yna3j4fmb5io.amplifyapp.com/duties" },
    ],
  },
  // Hermes (2026-10-08): the persuasion-video platform. Public on Amplify with
  // its own sign-in, not behind the site password. Records: the pax bucket and
  // pax-ledger, counted 2026-10-08.
  { href: "https://shell-nysgpt.daxlxk6y7cgzd.amplifyapp.com", domain: "hermes", title: "Video", accent: "#033882",
    body: "Make videos that change minds and move feet.",
    value: 99_866_123, unit: "records",
    shots: ["/products/video-feed.png"] },
];

/**
 * The four kinds of box, which are also the masthead's four words, and the
 * one colour each wears (2026-10-08): on a box's hover and tag chip, and on
 * its masthead word's hover.
 */
export const KINDS = { Platform: "#033882", Data: "#0e7490", Model: "#7c3aed", Tool: "#ea580c" } as const;
export type Kind = keyof typeof KINDS;

/**
 * The masthead: the four layers, one figure each (2026-10-08).
 *  - Data: every record held, in every database and inside every file: the
 *    full count of 2026-10-01 (12,021,607,502, docs/TASK-SWITCHBOARD-COUNTS.md)
 *    plus Hermes, counted 2026-10-08 (pax bucket 99,865,808 + pax-ledger 315).
 *    A floor: Stata and R files are unread, and the lake and FEC files added
 *    since Oct 1 are still being counted.
 *  - Models: parameters across the eight NYSgpt models on Hugging Face, all
 *    fine-tuned from open bases (2 × 567.8M bge-m3 encoders, 3 × 149.6M
 *    ModernBERT rerankers, 149.7M + 153.4M ModernBERT classifiers, 22.7M
 *    MiniLM reranker). The Hub rounds each to 0.1M; the figure sums the
 *    bases' published counts plus heads, so it is close, not audited.
 *  - Platforms: requests served across the platforms, the visitor log's figure.
 *  - Tools: the boxes tagged Tool plus the two dev tools.
 * Each cell shows its word at rest and counts its figure on hover; `exact`
 * marks a figure measured to the unit, which a wide cell spells out.
 */
export const LEDGER: { word: string; value: number; unit: string; exact?: boolean; color: string }[] = [
  { word: "Data", value: 12_121_473_625, unit: "Records", exact: true, color: KINDS.Data },
  { word: "Models", value: 1_910_089_220, unit: "Parameters", exact: true, color: KINDS.Model },
  { word: "Platforms", value: 3_125_952, unit: "Requests", exact: true, color: KINDS.Platform },
  { word: "Tools", value: TOOLS.filter((t) => t.tag === "Tool").length + IN_HOUSE.length, unit: "AI tools", color: KINDS.Tool },
];

/**
 * The switchboard's products (2026-10-08): every box on the homepage (the
 * platforms, the tools and models, the dev tools and the ten APIs) A–Z, so the
 * masthead's Data cell opens onto all of it. Each wears its kind's colour; an
 * API lists every endpoint, ticked into a plan (components/SwitchboardApiList).
 * A box with no site of its own has no Visit footer.
 */
export const SWITCHBOARD: HomeCardData[] = [
  ...CARDS,
  ...TOOLS.map((c) => ({ ...c, accent: KINDS[(c.tag ?? "Tool") as Kind] })),
  ...IN_HOUSE.map((c) => ({ ...c, accent: KINDS.Tool })),
  ...APIS.map((a) => ({ ...a, accent: KINDS.Data })),
].sort((a, b) => a.title.localeCompare(b.title));
