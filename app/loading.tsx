import { AtomSpinner } from "@/components/AtomSpinner";

// The page loading animation from nsrgpt (its app/(site)/viz/loading.tsx and components/viz/VizLoading.tsx; Brendan,
// 2026-11-19): the atom, centred on the paper ground, while a page is on its way.
export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center" style={{ backgroundColor: "var(--paper)" }}>
      <AtomSpinner size={40} label="Loading page" />
    </div>
  );
}
