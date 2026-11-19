// Switches for whole features, read at build time.

/** The Shift note (Shift and drag draws a note card), the right-click family (a right-click on one of the app's links
 *  opens it in the second panel, Shift and a right-click opens the Nav, Option and a right-click gathers a card into
 *  a note in Collect) and the home boxes' "Open in panel" (brief 61, ported from pax-trinity). On for every reader;
 *  NEXT_PUBLIC_NOTES_AND_RIGHT_CLICK=off turns all of it off. */
export const NOTES_AND_RIGHT_CLICK = process.env.NEXT_PUBLIC_NOTES_AND_RIGHT_CLICK !== "off"
