"use client";

import { usePathname } from "next/navigation";
import { HomeGrid } from "@/components/home-grid";

/** The background grid behind the masthead and the plate — on / alone, as before the layout was shared. */
export function PlateBackground() {
  return usePathname() === "/" ? <HomeGrid /> : null;
}
