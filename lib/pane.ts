// The second panel, ported from pax-trinity (2026-11-04; trinity's src/lib/pane.ts): a page opened beside
// the main one, each navigating on its own. The address holds both, /viz?pane=/viz/nebula, so a reload or a
// shared link brings back the pair. The panel is this app in a frame: its links move only the panel, as the
// main page's move only the main page. Framed, the app shows only the page (EMBED_SCRIPT marks <html>;
// globals.css hides [data-chrome]) and tells the shell around it where it has gone (PANE_MESSAGE).

export const PANE_PARAM = "pane"
export const PANE_MESSAGE = "nysgpt:pane"
/** The panel's frame asking the shell around it to open a page in the main container (the Nav's other side). */
export const PANE_MAIN = "nysgpt:main"
/** A pane asking the shell for ANOTHER panel beside it — the third panel (Brendan, 2026-11-04):
 *  a chart pressed inside panel 2 opens its data table in panel 3, and the page collapses to the slim bar. */
export const PANE_SECOND = "nysgpt:pane-second"

/** Runs at the top of <body> before paint: a framed load marks <html> data-embed, so the shell's chrome never shows. */
export const EMBED_SCRIPT = `(function(){var r=document.documentElement;try{if(window.self!==window.top)r.setAttribute("data-embed","")}catch(e){r.setAttribute("data-embed","")}})()`

export const isEmbedded = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-embed")

/** Only this app's own pages open in the panel. */
export const isPanePath = (href: string) => href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/")

/** A box's page, /box/<slug>, from its title: what a box opens in the panel. */
export const boxSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** A data-table row pointing at its datum (Brendan, 2026-11-04): the table says which row was
 *  pressed; the chart answers by walking its crosshair to the point. Crosses frames via the shell. */
export const VIZ_POINT = "nysgpt:viz-point"

/** What askAbout hands the chat it opens: the context, kept under a key the chat's ?seed= names. */
export const SEED_PREFIX = "nysgpt:chat-seed:"
