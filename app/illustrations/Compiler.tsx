"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Compare, MONO, Pane, Seg, SERIF, useStage, type Staged } from "./parts";

// 15 U.S.C. § 261, the standard time zones, as the compiler holds it. The
// omissions are marked ". . ." on the page and "…" in the output.

/** A citation: plain on the printed page, marked once compiled. */
function Cite({ marked, children }: { marked: boolean; children: ReactNode }) {
  return <span className={cn(marked && "bg-[color-mix(in_oklab,var(--cite)_16%,transparent)] underline decoration-[var(--cite)] underline-offset-2")}>{children}</span>;
}

function Row({ marked, id, children }: { marked: boolean; id: string; children: ReactNode }) {
  return (
    <>
      <p className={cn("m-0 border-l-2 pl-2.5", marked ? "border-[var(--ink)]" : "border-transparent")}>{children}</p>
      <span className={cn("hidden self-start justify-self-start rounded-sm px-1.5 py-0.5 text-[10px] leading-4 sm:block", marked ? "bg-[color-mix(in_oklab,var(--ink)_10%,transparent)] text-[var(--ink)]" : "opacity-0")} style={MONO}>{id}</span>
    </>
  );
}

/** The page, drawn twice at the same measure: as printed, and with what the compiler found. */
function Page({ marked }: { marked: boolean }) {
  return (
    <div className="relative grid gap-x-3 gap-y-2 px-4 pt-3 pb-8 text-[12px] leading-[1.5] sm:grid-cols-[1fr_8.5rem]" style={SERIF}>
      <Row marked={marked} id="/us/usc/t15/s261">
        <b>§ 261. Zones for standard time; interstate or foreign commerce</b>
      </Row>
      <Row marked={marked} id="/us/usc/t15/s261/a">
        <b>(a) In general.</b> For the purpose of establishing the standard time of the United States, the territory of the United States shall be divided into nine zones in the manner provided in this section. Except as provided in{" "}
        <Cite marked={marked}>section 260a(a) of this title</Cite>, the standard time of the first zone shall be Coordinated Universal Time retarded by 4 hours; that of the second zone retarded by 5 hours; . . .
      </Row>
      <Row marked={marked} id="/us/usc/t15/s261/b">
        <b>(b) Coordinated Universal Time defined.</b> In this section, the term “Coordinated Universal Time” means the time scale maintained through the General Conference of Weights and Measures . . .
      </Row>
      <Row marked={marked} id="sourceCredit">
        (<Cite marked={marked}>Mar. 19, 1918, ch. 24, § 1</Cite>, <Cite marked={marked}>40 Stat. 450</Cite>; <Cite marked={marked}>Pub. L. 89–387, § 4(a)</Cite>, Apr. 13, 1966, <Cite marked={marked}>80 Stat. 108</Cite>; . . . <Cite marked={marked}>Pub. L. 110–69, title III, § 3013(c)(3)</Cite>, Aug. 9, 2007, <Cite marked={marked}>121 Stat. 598</Cite>.)
      </Row>
      <span className={cn("absolute bottom-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground", marked ? "right-3" : "left-3")} style={MONO}>{marked ? "Compiled" : "As printed"}</span>
    </div>
  );
}

const OUTPUT = {
  xml: `<section identifier="/us/usc/t15/s261">
  <num value="261">§ 261.</num>
  <heading>Zones for standard time; interstate or foreign commerce</heading>
  <subsection identifier="/us/usc/t15/s261/a">
    <num value="a">(a)</num>
    <heading>In general</heading>
    <content>For the purpose of establishing the standard time of the
      United States, … Except as provided in
      <ref href="/us/usc/t15/s260a/a">section 260a(a) of this title</ref>,
      the standard time of the first zone shall be …</content>
  </subsection>
  <subsection identifier="/us/usc/t15/s261/b"> … </subsection>
  <sourceCredit>(<ref href="/us/act/1918-03-19/ch24/s1">Mar. 19, 1918, ch. 24, § 1</ref>,
    <ref href="/us/stat/40/450">40 Stat. 450</ref>; …
    <ref href="/us/pl/110/69/tIII/s3013/c/3">Pub. L. 110–69, title III, § 3013(c)(3)</ref>,
    <date date="2007-08-09">Aug. 9, 2007</date>, <ref href="/us/stat/121/598">121 Stat. 598</ref>.)</sourceCredit>
</section>`,
  json: `{
  "id": "/us/usc/t15/s261",
  "num": "§ 261.",
  "heading": "Zones for standard time; interstate or foreign commerce",
  "children": [
    {
      "id": "/us/usc/t15/s261/a",
      "num": "(a)",
      "heading": "In general",
      "text": "For the purpose of establishing the standard time of the United States, …",
      "refs": ["/us/usc/t15/s260a/a"]
    },
    {
      "id": "/us/usc/t15/s261/b",
      "num": "(b)",
      "heading": "Coordinated Universal Time defined",
      "text": "In this section, the term “Coordinated Universal Time” means …"
    }
  ],
  "sourceCredit": [
    "/us/act/1918-03-19/ch24/s1",
    "/us/stat/40/450",
    "/us/pl/89/387/s4/a",
    "/us/stat/80/108",
    "/us/pl/110/69/tIII/s3013/c/3",
    "/us/stat/121/598"
  ]
}`,
  md: `## § 261. Zones for standard time; interstate or foreign commerce

**(a) In general.** For the purpose of establishing the standard time
of the United States, … Except as provided in
[section 260a(a) of this title](/us/usc/t15/s260a/a), the standard time
of the first zone shall be Coordinated Universal Time retarded by
4 hours; …

**(b) Coordinated Universal Time defined.** In this section, the term
“Coordinated Universal Time” means the time scale maintained through
the General Conference of Weights and Measures …

([Mar. 19, 1918, ch. 24, § 1](/us/act/1918-03-19/ch24/s1),
[40 Stat. 450](/us/stat/40/450); …
[Pub. L. 110–69, title III, § 3013(c)(3)](/us/pl/110/69/tIII/s3013/c/3),
Aug. 9, 2007, [121 Stat. 598](/us/stat/121/598).)`,
} as const;

type Format = keyof typeof OUTPUT;

/** This section's own addresses, then every other address: the citations. */
const ADDRESS = /(\/us\/usc\/t15\/s261(?:\/[ab])?(?![A-Za-z0-9]))|(\/us\/[A-Za-z0-9/-]+)/g;

function Code({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(ADDRESS)) {
    const at = m.index ?? 0;
    out.push(text.slice(last, at));
    out.push(<span key={at} style={{ color: m[1] ? "var(--ink)" : "var(--cite)" }}>{m[0]}</span>);
    last = at + m[0].length;
  }
  out.push(text.slice(last));
  return <pre className="m-0 px-3 py-2.5 text-[11px] leading-[1.55] whitespace-pre text-muted-foreground" style={MONO}>{out}</pre>;
}

export function Compiler({ onStage }: Staged) {
  const [format, setFormat] = useState<Format>("xml");
  /** Whether the handle has been drawn past the middle, so most of the page shows compiled. */
  const [compiled, setCompiled] = useState(false);
  const moved = useCallback((at: number) => setCompiled(at < 50), []);
  useStage(onStage, compiled);
  return (
    <div className="flex min-h-0 flex-col gap-3 [--cite:#c1670c] lg:flex-1 dark:[--cite:#e0a35a]">
      <Compare label="Printed page against compiled page" start={72} onMove={moved} className="shrink-0" before={<Page marked={false} />} after={<Page marked />} />
      <Pane
        className="min-h-40 lg:flex-1"
        bodyClassName="overflow-auto"
        head={
          <span className="flex items-center gap-3">
            <Swatch colour="var(--ink)" name="Section" />
            <Swatch colour="var(--cite)" name="Citation" />
          </span>
        }
        aside={<Seg label="Output format" value={format} onChange={setFormat} options={[["xml", "XML"], ["json", "JSON"], ["md", "Markdown"]]} />}
      >
        <Code text={OUTPUT[format]} />
      </Pane>
    </div>
  );
}

function Swatch({ colour, name }: { colour: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-[2px]" style={{ background: colour }} aria-hidden />
      {name}
    </span>
  );
}
