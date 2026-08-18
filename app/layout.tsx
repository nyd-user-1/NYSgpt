import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SwitchboardProvider, SwitchboardShell } from "@/components/SwitchboardPanel";
import { getDigest } from "@/lib/digest";
import { CARDS } from "@/lib/home-data";
import { siteConfig } from "@/lib/site";
import { metadataKeywords } from "./metadata";
import "@/app/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* The provider mounts the panel itself (portaled to <body>), so the
              shell wrapper and the drawer stay in one system. */}
          <SwitchboardProvider cards={CARDS} digest={digest}>
            <SwitchboardShell>{children}</SwitchboardShell>
          </SwitchboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
