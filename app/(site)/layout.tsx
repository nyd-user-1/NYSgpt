import { AppLayout } from "@/components/AppLayout";

// The app's shell — header, sidebar — for every page in this group (2026-11-04). As a layout it mounts once
// and stays mounted across navigation (the sidebar keeps its state, nothing re-renders); each page used to
// render its own AppLayout. The group's parentheses keep it out of the URL.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout paperMode>{children}</AppLayout>;
}
