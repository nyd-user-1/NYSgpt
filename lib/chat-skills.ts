// The chat's skills, from trinity: picked from the top of the + menu, a skill rides the
// conversation as a chip in the composer, and its instructions go out with every message after it
// in the system context. A skill with a prompt also puts that request in the composer, ready to
// send or to edit first. The entries below are placeholders — swap in NYSgpt's real skills.

export type ChatSkill = { id: string; name: string; about: string; instructions: string; prompt?: string }

export const CHAT_SKILLS: ChatSkill[] = [
  {
    id: "example-skill",
    name: "Example skill",
    about: "A placeholder skill — swap in a real one",
    instructions:
      "SKILL — EXAMPLE. Lorem ipsum dolor sit amet, consectetur adipiscing elit: answer the user's request plainly, in the first person singular, and say when something is outside what this placeholder covers.",
  },
  {
    id: "sample-skill",
    name: "Sample skill",
    about: "Another placeholder — swap in a real one",
    prompt: "Show me what this skill does.",
    instructions:
      "SKILL — SAMPLE. Sed do eiusmod tempor incididunt: explain in one short paragraph that this is a placeholder skill waiting on real instructions, then answer the request as well as the conversation allows.",
  },
]
