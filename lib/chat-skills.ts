// The chat's skills, from trinity's pattern: picked from the top of the + menu, a skill rides the
// conversation as a chip in the composer, and its instructions go out with every message after it
// in the system context. A skill with a prompt also puts that request in the composer, ready to
// send or to edit first. Five NYSgpt jobs (2026-11-04).

export type ChatSkill = { id: string; name: string; about: string; instructions: string; prompt?: string }

export const CHAT_SKILLS: ChatSkill[] = [
  {
    id: "summarize-a-bill",
    name: "Summarize a bill",
    about: "A bill in plain words",
    instructions:
      "SKILL — SUMMARIZE A BILL. Take the bill the user names or attaches and give, in plain words: what it does, who sponsors it, where it stands, and what changes if it passes. Numbers and statuses come only from the record in my context — a bill I don't hold gets \"I don't hold that bill\" and the api.nysgpt.com request that would fetch it, never a guess.",
  },
  {
    id: "trace-a-paper",
    name: "Trace a paper",
    about: "A paper and its neighbors in the corpus",
    instructions:
      "SKILL — TRACE A PAPER. Given a title, DOI, arXiv id or NSR key number: look it up with my data tools (nsr_search, then nsr_record on the best match), say what the corpus holds on it — reference, year, citations, nuclides, reactions, subjects — and search out its nearest neighbors by topic. When the corpus doesn't hold it, say so and name which encoder/reranker pair would retrieve work like it.",
  },
  {
    id: "draft-an-api-call",
    name: "Draft an API call",
    about: "From question to request",
    instructions:
      "SKILL — DRAFT AN API CALL. Turn the user's question into an api.nysgpt.com request: the endpoint, the parameters, a representative sample of the response shape, and what the call costs at the posted pricing. Put the request in a fenced code block. Where the question doesn't map to a covered dataset, say which datasets are covered instead.",
  },
  {
    id: "pick-a-model",
    name: "Pick a model",
    about: "Which of the 24 fits the task",
    instructions:
      "SKILL — PICK A MODEL. Match the user's task to one model from NYSgpt's catalog (the Models slide: the NSR pair, the RXIV pair, the AI Reranker pair, the CSHL pair, the Alpha Class). Two sentences on why it fits, then name the runner-up and the one-line reason it lost. Encoders retrieve by meaning; rerankers re-score a candidate list; say which stage the task actually needs.",
  },
  {
    id: "read-the-numbers",
    name: "Read the numbers",
    about: "Every count with its scope",
    instructions:
      "SKILL — READ THE NUMBERS. Any figure I state carries what it counts and where it is from: 12.1 billion records is every product together, roughly 6.17 billion is Policy alone, 169 million is the Gov API's reach, 303,568 is the NSR corpus. Never a bare number, never a scope picked silently; where two scopes could answer, name both and ask which one the user means.",
  },
]
