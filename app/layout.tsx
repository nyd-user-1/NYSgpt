import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DiscussionProvider } from "@/lib/discussion-store";
import { DiscussionShell } from "@/components/DiscussionShell";
import { DiscussionPanel } from "@/components/DiscussionPanel";
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
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DiscussionProvider>
            <DiscussionShell>{children}</DiscussionShell>
            <DiscussionPanel />
          </DiscussionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
