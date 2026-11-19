// The chat's skills (Brendan, 2026-10-29): picked from the top of the + menu, a skill rides the
// conversation as a chip in the composer, and its instructions go out with every message after it, in
// the system context beside the record and the platform guide. Each is one job done the house's way. A
// skill with a prompt also puts that request in the composer, ready to send or to edit first.

export type ChatSkill = { id: string; name: string; about: string; instructions: string; prompt?: string }

export const CHAT_SKILLS: ChatSkill[] = [
  {
    id: "script-doctor",
    name: "Script doctor",
    about: "Tighten a script to the house rules",
    instructions:
      "SKILL — SCRIPT DOCTOR. Take the script the user gives or the last one in this chat and return a revision that keeps their voice: a hook under 12 words, first person throughout, exactly one concrete number taken from FACTS as written there, 50 to 60 words (about 25 seconds spoken), ending with what the viewer should do. Put the revision alone in a ```pax-script block followed by its ```pax-cite block, citing only listed evidence ids. Under it, list each change in one short line apiece: what changed and why. Change nothing that already meets a rule.",
  },
  {
    id: "read-a-test",
    name: "Read a test",
    about: "Explain a message test's result in plain words",
    instructions:
      "SKILL — READ A TEST. Explain the message test or report the user names (or the one on the page they attached) to someone who has never read one. In this order: what each respondent saw; each video's lift against its own wave's placebo in percentage points, and whether it was detectable at the wave's criterion; the one or two subgroup results that matter most, said as levels against the placebo inside that subgroup; and what the result cannot establish (no head-to-head between videos, no multiplicity adjustment, simulated respondents where the report says so). Use only numbers in your context; where one is missing, say so.",
  },
  {
    id: "pick-the-audience",
    name: "Pick the audience",
    about: "Match videos to the audiences they moved",
    instructions:
      "SKILL — PICK THE AUDIENCE. From the wave's subgroup results and its printed pairings, propose up to three video-to-audience pairings to test next. For each: the video, the audience, the figure behind it (the video's level against the placebo's inside that subgroup), and the caveat that applies (small cell, chance across many comparisons, a self-selected group). Frame every pairing as a hypothesis for the next test, never as a targeting plan, and never compare two videos with each other.",
  },
  {
    id: "survey-question",
    name: "Draft a survey question",
    about: "Write a neutral question, matched to America Thinks",
    instructions:
      "SKILL — DRAFT A SURVEY QUESTION. Write the question the user is after as a neutral item: a stem a respondent can answer without guessing, balanced options in a natural order, and a pass or don't-know option where it fits. Then say which America Thinks construct or source question it matches (GSS, ANES, CES, a public poll) so its answers can be read against the national figures, quoting that question's wording if it is in your context. Flag any word in the user's draft that leads the answer, and offer the neutral one.",
  },
  {
    id: "brief-a-partner",
    name: "Brief a partner",
    about: "Turn findings into a short partner update",
    instructions:
      "SKILL — BRIEF A PARTNER. Write a short update for a partner organization from what this chat has established: a subject line on the first line, then four to six sentences in the first person singular. Lead with the one finding that matters, give the single number that carries it, say what it does not show, and end with the next step and who takes it. Plain words, no jargon the partner would need explained, no figure not in your context. When a MENTION in your context names a partner organization, the brief is for that organization alone: read its record through your data tools — its surveys and tests and where each stands, its measured results — and write only what the tools returned.",
  },
  {
    // Chat makes videos (Brendan, 2026-10-30): src/video's templates, saved as versions, opened in the Studio.
    id: "make-a-video",
    name: "Make a video",
    about: "Turn a result into a video from a template",
    prompt: "Make a lift card for the best-tested video.",
    instructions:
      'SKILL — MAKE A VIDEO. Answer with one video made from a template, as VIDEO TEMPLATES says: one sentence naming what it shows and where its figures come from, then one ```pax-video block whose props fit the template\'s schema, every figure taken as written from your context (LIFT RESULTS for a lift card or a leaderboard). Where a figure the template needs is missing, say which one and ask for it; write no block. When the user asks for a change, write the whole block again with only that change and "parent" set to the version it revises.',
  },
]

/** NYSgpt (brief 49): the skills above are pax-trinity's own work, so the + menu hides them until NYSgpt's are
 *  written. They stay here, listed, rather than deleted. */
export const HIDDEN_SKILLS = new Set(["script-doctor", "read-a-test", "pick-the-audience", "survey-question", "brief-a-partner", "make-a-video"])

/** The skills the + menu shows. */
export const SHOWN_SKILLS = CHAT_SKILLS.filter((k) => !HIDDEN_SKILLS.has(k.id))
