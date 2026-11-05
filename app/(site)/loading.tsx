import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";

// Shown at once, inside the shell, while a server-rendered page (the account pages) renders — the click
// navigates immediately instead of waiting on the server. Static pages arrive prefetched and skip it.
export default function Loading() {
  return <div className="flex-1" style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }} />;
}
