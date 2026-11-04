// Every term the chat underlines on screen: the short label used in tables, its full name, and
// what it means (term-tip.tsx draws the hover definitions). Placeholders until NYSgpt has a
// glossary of its own.

export type Term = { id: string; short: string; full: string; definition: string; group: "Score" | "Delivery" | "Engagement" | "Campaigns" | "Graph" | "Script" }

export const GLOSSARY: Term[] = [
  { id: "example-term", short: "Example", full: "Example term", group: "Score", definition: "Lorem ipsum dolor sit amet, consectetur adipiscing elit: a placeholder definition, shown on hover wherever the term appears." },
  { id: "sample-term", short: "Sample", full: "Sample term", group: "Script", definition: "Sed do eiusmod tempor incididunt ut labore: another placeholder definition, waiting on the real glossary." },
]

export const termById = (id: string) => GLOSSARY.find((t) => t.id === id)
