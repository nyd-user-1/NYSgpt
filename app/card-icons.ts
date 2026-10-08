import {
  ArrowUpNarrowWide, Atom, Baby, Binary, BrainCircuit, Clapperboard, CloudDownload, Database, FileCode, Handshake, Inbox, Landmark, LayoutDashboard, ShieldCheck, Ship,
  SquareDashedMousePointer, Stethoscope, Sun, Tags, Trophy, Workflow, Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The icon set before each card dialog's title, by the card's title. Kept out
 * of lib/home-data.ts because that data crosses from the server page to the
 * client plate, and a component cannot.
 */
export const CARD_ICONS: Record<string, LucideIcon> = {
  // The tools
  Encoder: Binary,
  Reranker: ArrowUpNarrowWide,
  Classifier: Tags,
  Compiler: FileCode,
  Loaders: CloudDownload,
  Lake: Database,
  Pipeline: Workflow,
  Clips: Clapperboard,
  Consensus: Handshake,
  "Agentic Inbox": Inbox,
  // In house
  HQ: LayoutDashboard,
  Inspector: SquareDashedMousePointer,
  // The products
  "Artificial Intelligence": BrainCircuit,
  Childcare: Baby,
  Healthcare: Stethoscope,
  Energy: Zap,
  Insurance: ShieldCheck,
  Gov: Landmark,
  Science: Atom,
  Solar: Sun,
  Sports: Trophy,
  Tariffs: Ship,
  Video: Clapperboard,
};
