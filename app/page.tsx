import { AppLayout } from "@/components/AppLayout";
import { RevealFx } from "@/components/RevealFx";
import { PAPER_BRIDGE } from "@/components/editorial/PaperBridge";
import { HomeMasthead } from "./HomeMasthead";
import { HomePlate } from "./HomePlate";
import { CatalogOverlay } from "./CatalogOverlay";
import { LEDGER } from "@/lib/home-data";
import "./home.css";

export const metadata = {
  title: "NYSgpt",
  description:
    "The NYSgpt family of AI products — ten domains, one system. Artificial intelligence, childcare, health records, energy, insurance, policy, science, solar, sports, and tariffs.",
};

export default function HomePage() {
  return (
    <AppLayout paperMode>
      <div
        className="hm-scroll flex-1 overflow-y-auto no-scrollbar"
        style={{ backgroundColor: "var(--paper)", ...PAPER_BRIDGE }}
      >
        <div className="mx-auto w-full max-w-[1360px] px-6 sm:px-10 md:px-14 pt-8 pb-16">
          {/* Nameplate + ledger — a client island: the wordmark returns to the
              all view, a cell shows its set, and the figures count up on hover. */}
          <RevealFx delay={0.08} translateY={6}>
            <HomeMasthead ledger={LEDGER} />
          </RevealFx>

          {/* The contents plate (2026-11-19, brief 43, the option 3 sketch):
              one set's boxes or all of them, pinned first, then A to Z. The
              byline that sat under it (Contact, Data Library, copyright) is
              now the switchboard's footer. */}
          <RevealFx delay={0.22} translateY={5}>
            <HomePlate />
          </RevealFx>
        </div>
      </div>
      <CatalogOverlay />
    </AppLayout>
  );
}
