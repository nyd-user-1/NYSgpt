import { RevealFx } from "@/components/RevealFx";
import { HomeContents } from "@/app/HomeContents";
import { CARDS } from "@/lib/home-data";

export const metadata = {
  title: "NYSgpt",
  description:
    "The NYSgpt family of AI products — ten domains, one system. Artificial intelligence, childcare, health records, energy, insurance, policy, science, solar, sports, and tariffs.",
};

// The masthead, the background grid and the byline are the (plate) layout's; the page is the plate.
export default function HomePage() {
  return (
    /* Contents plate: heading + Refresh + the 5×2 grid, one client island
       so Refresh can swap the ten products for the ten newest papers.
       The column's leftover height is the plate's — nothing scrolls. */
    <RevealFx className="flex min-h-0 flex-1 flex-col" delay={0.22} translateY={5}>
      <HomeContents initial={CARDS} />
    </RevealFx>
  );
}
