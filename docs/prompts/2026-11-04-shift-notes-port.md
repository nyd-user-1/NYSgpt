# Port pax-trinity's shift-draw notes with Chat and Comment actions

Repo `/Users/brendanstanton/Code/NYSgpt`, work on `main`. Source repo to port FROM: `/Users/brendanstanton/Code/pax-trinity` (read-only — change nothing there).

Brendan's direction: bring shift-click-draw notes over, and the note card must carry a **Chat** action and a **Comment** action wired to Slack and Discord — "if it's not wired up yet, take the wiring from pax-trinity and get it done."

## Source map (all under pax-trinity/src)

- `components/notes/draw-notes.tsx` — Shift-click-drag on an empty surface draws the note's shape; drawing starts only once the pointer moves (so shift-click selection still works); Escape lets go; skeleton holds the drawn shape while the editor loads.
- `components/notes/floating-note.tsx` — the card. Line 294: "Ask PAX" calls `askAbout({ context: ... })` from the shell context — that's the Chat action to port.
- `components/notes/note-team.tsx` + `app/api/notes/team/route.ts` — the note posted to the team: Dev Comments, **Slack and Discord**. That's the Comment action and its fan-out wiring.
- `lib/drawn-notes.ts` and the rest of `components/notes/` as needed — port what the card needs, skip trinity-only freight (video notes, PAX reply) unless it comes free.

## Land in NYSgpt, paper dress

1. Shift-click-drag anywhere → note card, trinity-faithful behavior, mounted in the app frame beside ShiftNav.
2. Card action **Chat**: opens NYSgpt's chat seeded with the note's text — use the shell context's askAbout/openPane that opus 5.5 is making real RIGHT NOW (it's porting the pane system in parallel; message it early and agree the contract so your card plugs into its shell, not a second one).
3. Card action **Comment**: port the team-post route; fan out to Slack and Discord. Webhook/token config: find how trinity feeds that route (env names, secrets) and mirror it. If NYSgpt lacks the secret values, wire the code to env, name the exact vars in your report, and leave them unset — do NOT invent endpoints or paste secrets anywhere.
4. No trinity content: any PAX naming becomes NYSgpt's own (the chat action label can be plain "Chat").

## Ship

Commit `main` (narrative voice; no local builds — hook-banned, CI is the check). opus 5.5 owns the merge to `cloudflare` and the deploy; message opus 5.5 and lead-agent one line when your commit is pushed.
