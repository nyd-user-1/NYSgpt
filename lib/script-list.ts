// Trinity's script library, as the /chat port needs it (2026-11-03): the + menu's Scripts drawer
// reads this list. Empty until NYSgpt has scripts of its own to offer there.

export type ListedScript = { id: string; title: string; framing: string; text: string }

export const SCRIPT_LIST: ListedScript[] = []
