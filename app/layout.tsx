import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { ProductStatusProvider } from "@/components/ProductStatus";
import { SwitchboardProvider, SwitchboardShell } from "@/components/SwitchboardPanel";
import { ShiftNotes } from "@/components/ShiftNotes";
import { ShiftNav } from "@/components/ShiftNav";
import { Shell } from "@/components/shell";
import { HousekeepingTool } from "@/components/housekeeping/tool";
import { DevInspector } from "@/components/dev/inspector-lazy";
import { LiveEditMode } from "@/components/housekeeping/live-edit";
import { EMBED_SCRIPT } from "@/lib/pane";
import { getDigest } from "@/lib/digest";
import { CARDS, SWITCHBOARD } from "@/lib/home-data";
import { siteConfig } from "@/lib/site";
import { metadataKeywords } from "./metadata";
import "@/app/globals.css";

const dmSans = localFont({
  src: [
    { path: "./fonts/dm-sans-latin-wght-normal.woff2", weight: "300 700", style: "normal" },
    { path: "./fonts/dm-sans-latin-wght-italic.woff2", weight: "300 700", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-wght-normal.woff2", weight: "300 600", style: "normal" },
    { path: "./fonts/fraunces-latin-wght-italic.woff2", weight: "300 600", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

const mono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "400 600",
  style: "normal",
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  // Tints mobile browser chrome (iOS Safari address/status bar, Android Chrome
  // status bar). Must track --paper, or light mode gets a black bar up top.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15120d" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,  
  },
  description: siteConfig.description,
  keywords: metadataKeywords,
  icons: {
    // SVG first so modern browsers take the theme-adaptive mark; .ico is the
    // legacy fallback. Sources live in public/ — see public/favicon.svg.
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

// The switchboard's Discord drill-down reads live figures from the corpus
// database. ISR keeps every page statically servable while re-reading the
// digest at most every five minutes — fresh enough for a nightly-harvest feed,
// and the site never blocks on (or 500s from) the database.
export const revalidate = 300;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const digest = await getDigest();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${dmSans.variable} ${fraunces.variable} ${mono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Marks a framed load (the second panel, lib/pane.ts) before paint, so its chrome never shows. */}
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* The provider mounts the panel itself (portaled to <body>), so the
              shell wrapper and the drawer stay in one system. */}
          <ProductStatusProvider cards={CARDS}>
            <SwitchboardProvider cards={SWITCHBOARD} digest={digest}>
              {/* The shell (components/shell.tsx): the second panel beside the page, and the contract the
                  chat, the notes and the Nav call — so all three sit inside it. */}
              <Shell>
                <SwitchboardShell>{children}</SwitchboardShell>
                {/* The two global gestures, ported from pax-trinity (2026-11-03):
                    Shift-drag draws a note; Shift and a right-click opens the Nav.
                    Inside the provider so the Nav can open a box in the panel. */}
                <ShiftNotes />
                <ShiftNav />
                {/* Trinity's dev kit (2026-11-04): the housekeeping pointer, the inspector
                    dock, and Live edit's armed mode — all inert until the panel's Dev tools
                    rows switch them on. */}
                <HousekeepingTool />
                <DevInspector />
                <LiveEditMode />
              </Shell>
            </SwitchboardProvider>
          </ProductStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
