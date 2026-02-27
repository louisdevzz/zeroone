import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://zeroonec.xyz";
const TITLE = "ZeroOne — Deploy AI Agents in One Click";
const DESCRIPTION =
  "ZeroOne runs ZeroClaw AI agents inside isolated Docker containers. Built with Rust for maximum efficiency — run hundreds of agents";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | ZeroOne",
  },
  description: DESCRIPTION,
  keywords: [
    "AI agents",
    "deploy AI agents",
    "ZeroClaw",
    "AI agent hosting",
    "Docker AI",
    "LLM agents",
    "Telegram bot hosting",
    "Discord bot AI",
    "self-hosted AI",
    "ZCaaS",
    "AI agent platform",
  ],
  authors: [{ name: "Potluck Labs", url: "https://potlock.org" }],
  creator: "Potluck Labs",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "ZeroOne",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/meta.png", width: 1200, height: 630, alt: "ZeroOne — Deploy AI Agents in One Click" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@zeroonec",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/meta.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          {children}
          <Toaster position="bottom-right" />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
