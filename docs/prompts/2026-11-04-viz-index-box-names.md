# /viz index: name the boxes after their charts — fast task, ~5 min budget

Repo `/Users/brendanstanton/Code/NYSgpt`, work on `main`. Brendan's words: the /viz index was supposed to be an exact duplicate of the root page with the charts replacing the boxes and no hover animation — "it fucked that up. simply rename the boxes by their chart name, rewrite the box descriptions according to the chart description...super simple."

## Task

`app/viz/page.tsx` (133 lines) is the index: the home page's plate with twelve boxes linking to the chart pages. Right now the boxes carry the wrong titles/descriptions. Fix exactly that:

- Each box's title = its chart's name as the chart page states it (each `app/viz/<slug>/page.tsx` passes `title` to VizShell, e.g. nebula's is "The nuclide nebula").
- Each box's description = written from that page's `note` text — condensed to box length, not pasted wholesale. Keep the register of the existing home boxes.
- Confirm no hover animation remains on the boxes. Change NOTHING else — layout, masthead, byline, links, order all stay.

## Ship

Commit to `main` in the repo's narrative commit voice and push `main` immediately — another window (opus 5.5) is reworking the chart pages' shell in parallel and will carry your commit into the `cloudflare` deploy. Do not touch `components/viz/VizShell.tsx` or any `app/viz/<slug>/` file. When your push lands, message BOTH `opus 5.5` and `lead-agent` one line (SendMessage tool). Speed over polish; no scope additions.
