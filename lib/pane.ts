// The second panel (Brendan, 2026-10-31): a page opened beside the main one, each navigating on its own.
// The address holds both, /agentic-inbox?pane=/data-dictionary, so a reload or a shared link brings back the pair.
// The panel is this app in a frame: its links, tabs and filters move only the panel, as the main page's
// move only the main page. Framed, the app shows only the page (EMBED_SCRIPT marks <html>; pax2.css hides
// the shell's chrome) and tells the shell around it where it has gone (PANE_MESSAGE), which keeps ?pane.

export const PANE_PARAM = "pane"
export const PANE_MESSAGE = "pax:pane"
/** The panel's frame asking the shell around it to open a page in the main container (the Nav's other side). */
export const PANE_MAIN = "pax:main"

/** Runs in <head> before paint: a framed load marks <html> data-embed, so the shell's chrome never shows. */
export const EMBED_SCRIPT = `(function(){var r=document.documentElement;try{if(window.self!==window.top)r.setAttribute("data-embed","")}catch(e){r.setAttribute("data-embed","")}})()`

export const isEmbedded = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-embed")

/** Only this app's own pages open in the panel. */
export const isPanePath = (href: string) => href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api/")
