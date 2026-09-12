import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polyglot Cards — AI flashcards for language learners",
  description:
    "FSRS-5 spaced repetition flashcards with phonetic annotations, cloze deletion, multiple study modes, and AI generation. Built for multi-language learners.",
  keywords: [
    "flashcards",
    "spaced repetition",
    "FSRS",
    "language learning",
    "SRS",
    "polyglot",
  ],
  authors: [{ name: "Polyglot Cards" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Polyglot Cards",
    description:
      "AI-powered flashcards for multi-language learners. FSRS-5 SRS, phonetic annotations, cloze deletion.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Always load the Netlify Identity widget. It auto-detects the site
            URL and handles all GoTrue API calls (signup/login/logout/recover)
            automatically. Only active when Netlify Identity is enabled on the
            site. */}
        <script src="https://identity.netlify.com/v1/netlify-identity-widget.js" async />
      </head>
      <body
        className={`${dmSans.variable} ${playfair.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
