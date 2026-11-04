// The full universe of what a chat reply can draw, from trinity: one example of every block kind,
// each a canned assistant message appended locally — no model round trip, the same every time. The
// footer's menu (response-footer.tsx) offers them; the onboarding's gallery shows them in order.
// The copy below is placeholder (lorem ipsum) until NYSgpt has examples of its own.

export type BlockExample = { id: string; label: string; content: string }

const SCRIPT = [
  'A script lands as a card with a Record button — the camera opens right here, the teleprompter scrolls the words.',
  '```pax-script',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  '```',
  '```pax-cite',
  '[{"quote": "lorem ipsum", "note": "A sample citation: each line of a drafted script points at the evidence it leans on.", "ids": ["sample"]}]',
  '```',
].join('\n')

const FIELDS = [
  'Questions go out as real controls — tap an answer or type one; both land the same way.',
  '```pax-fields',
  '[{"key": "stance", "label": "Lorem ipsum dolor sit amet, consectetur adipiscing elit?", "kind": "choice", "options": ["Agree", "Disagree", "Pass"]}]',
  '```',
].join('\n')

const VIDEO = [
  'A filled template becomes a live video: drawn on the page, saved as a version.',
  '```pax-video',
  JSON.stringify({
    templateId: 'sample-card',
    title: 'A sample card, from a placeholder fixture',
    props: { title: 'Lorem ipsum', simulated: true },
  }),
  '```',
].join('\n')

const CHART = [
  'A chart is a template too — this one is a placeholder.',
  '```pax-video',
  JSON.stringify({
    templateId: 'metric-trend',
    title: 'A placeholder trend',
    props: {
      title: 'Lorem ipsum dolor sit amet',
      series: [{ name: 'Sample', points: [{ label: '2020', value: 40 }, { label: '2022', value: 50 }, { label: '2024', value: 60 }] }],
      unit: '%',
    },
  }),
  '```',
].join('\n')

const CHOICES = [
  'A fork in the conversation goes out as plain chips — tap one and it sends as your message.',
  '```pax-choices',
  '["Lorem ipsum", "Dolor sit amet", "I\'m set"]',
  '```',
].join('\n')

const PAGE_BLOCK = [
  'Any card on any page can stand in the chat — this one is a placeholder reference.',
  '[[block:/sample#example]]',
].join('\n')

const SURVEY = [
  'A survey question, ready to take — the same card a respondent sees, answered right here.',
  '```pax-fields',
  '[{"key": "q1", "label": "Consectetur adipiscing elit, sed do eiusmod tempor incididunt?", "kind": "choice", "options": ["Agree", "Disagree", "Pass"]}, {"key": "why", "label": "One line on why, if you like", "kind": "text", "placeholder": "Optional"}]',
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
