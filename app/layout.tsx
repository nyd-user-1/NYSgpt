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
import { HousekeepingTool, LiveEditMode } from "@/components/dev/devkit-lazy";
import { DevInspector } from "@/components/dev/inspector-lazy";
import { EMBED_SCRIPT } from "@/lib/pane";
import { THEME_KEY, THEME_SCRIPT } from "@/lib/theme";
import { ThemeSync } from "@/components/theme/theme-sync";
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

// Fully static (2026-11-04): the root layout no longer reads the corpus digest (its DATABASE_URL is set on no
// deployment, so it always came back empty) or revalidates. Every prerendered page is served as a file —
// on Cloudflare through open-next.config.ts's static-assets cache — instead of rendering per request.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${dmSans.variable} ${fraunces.variable} ${mono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Marks a framed load (the second panel, lib/pane.ts) before paint, so its chrome never shows. */}
        <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
        {/* Trinity's theme script (lib/theme.ts), before paint — only once a theme has been picked in the
            Theme view, so NYSgpt's own light/dark stands for everyone who hasn't. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)}))${THEME_SCRIPT}}catch(e){}` }} />
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
          <ProductStatusProvider>
            <SwitchboardProvider>
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
                <ThemeSync />
              </Shell>
            </SwitchboardProvider>
          </ProductStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
