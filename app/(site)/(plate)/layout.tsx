import { PlateFrame } from "@/app/PlateFrame";

// / and /viz share the masthead, the column and the byline (app/PlateFrame.tsx); only the plate changes.
export default function PlateLayout({ children }: { children: React.ReactNode }) {
  return <PlateFrame>{children}</PlateFrame>;
}
