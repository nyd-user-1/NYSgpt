// The full universe of what a chat reply can draw (Brendan, 2026-11-03): one honest example of every
// block kind, each a canned assistant message appended locally — no model round trip, the same every
// time. The footer's menu (response-footer.tsx) offers them; the onboarding's gallery shows them in
// order. The video and chart ride the templates' own fixtures, each labeled simulated where its spec
// says so; the page block is a live read of /clips' partners card, verified against the box.

export type BlockExample = { id: string; label: string; content: string }

const SCRIPT = [
  'A script lands as a card with a Record button — the camera opens right here, the teleprompter scrolls the words.',
  '```pax-script',
  "Half the voters in this state can't vote in the election that matters. The primary decides it, and independents are locked out. Question 3 opens that door: one primary, every voter, top two advance. Your ballot shouldn't depend on your party. Vote yes.",
  '```',
  '```pax-cite',
  '[{"quote": "locked out", "note": "A sample citation: each line of a drafted script points at the evidence it leans on.", "ids": ["sample"]}]',
  '```',
].join('\n')

const FIELDS = [
  'Questions go out as real controls — tap an answer or type one; both land the same way.',
  '```pax-fields',
  '[{"key": "stance", "label": "Primaries paid for by taxpayers should be open to every registered voter.", "kind": "choice", "options": ["Agree", "Disagree", "Pass"]}]',
  '```',
].join('\n')

const VIDEO = [
  'A filled template becomes a live video: drawn on the page, saved as a version, opened in the Studio.',
  '```pax-video',
  JSON.stringify({
    templateId: 'lift-card',
    title: 'A lift card, from the template fixture',
    props: {
      treatment: { title: 'Dustin Cathcart', partner: '@pax' },
      segment: 'Everyone',
      metrics: [
        { name: 'Support', control: 48.6, lift: 15.7, significant: true },
        { name: 'Comprehension', control: 51.4, lift: -9.1, significant: true },
      ],
      rct: false,
      simulated: true,
      n: 347,
    },
  }),
  '```',
].join('\n')

const CHART = [
  'A chart is a template too — this one draws fifty years of one General Social Survey question.',
  '```pax-video',
  JSON.stringify({
    templateId: 'metric-trend',
    title: 'Abortion for any reason, 1977 to 2024',
    props: {
      title: 'Legal abortion if a woman wants it for any reason',
      series: [
        {
          name: 'Yes',
          points: [
            { label: '1977', value: 37.7 }, { label: '1980', value: 40.7 }, { label: '1985', value: 39.4 }, { label: '1990', value: 43.4 },
            { label: '1996', value: 43.9 }, { label: '2002', value: 41.0 }, { label: '2008', value: 41.7 }, { label: '2014', value: 45.3 },
            { label: '2018', value: 49.8 }, { label: '2021', value: 53.7 }, { label: '2022', value: 57.1 }, { label: '2024', value: 58.3 },
          ],
        },
      ],
      unit: '%',
      annotation: { atIndex: 11, text: '58.3%, the highest in 47 years' },
    },
  }),
  '```',
].join('\n')

const CHOICES = [
  'A fork in the conversation goes out as plain chips — tap one and it sends as your message.',
  '```pax-choices',
  '["Where America stands on a question", "Watch the tested clips", "I\'m set"]',
  '```',
].join('\n')

const PAGE_BLOCK = [
  "Any card on any page can stand in the chat, live — this one is the Clips page's partner rail, read the moment it renders.",
  '[[block:/clips#partners]]',
].join('\n')

const SURVEY = [
  'A survey question, ready to take — the same card a respondent sees, answered right here.',
  '```pax-fields',
  '[{"key": "q1", "label": "Independent voters are shut out of the only election that is actually competitive where they live.", "kind": "choice", "options": ["Agree", "Disagree", "Pass"]}, {"key": "why", "label": "One line on why, if you like", "kind": "text", "placeholder": "Optional"}]',
  '```',
].join('\n')

export const BLOCK_EXAMPLES: BlockExample[] = [
  { id: 'script', label: 'Script card', content: SCRIPT },
  { id: 'video', label: 'Video from a template', content: VIDEO },
  { id: 'chart', label: 'Chart', content: CHART },
  { id: 'choices', label: 'Choice chips', content: CHOICES },
  { id: 'fields', label: 'Question controls', content: FIELDS },
  { id: 'survey', label: 'Survey question', content: SURVEY },
  { id: 'block', label: 'A page block, live', content: PAGE_BLOCK },
]

/** The one that is a mode, not a message: the camera. The menu routes it to record mode. */
export const RECORDING_ITEM = { id: 'recording', label: 'Recording (camera)' }
