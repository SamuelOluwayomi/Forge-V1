import type { Metadata } from "next";
import { Geist_Mono, Inter, Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { MobileGuard } from "@/app/components/MobileGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = "https://forge-frontier.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "Forge — Permanent Pro Identity on Solana",
    template: "%s | Forge",
  },
  description:
    "Forge is an onchain professional identity network for developers. Earn USDC through escrow-secured tasks, mint Soulbound Tokens as permanent proof of your work, and build a verifiable reputation that no platform can take away.",

  keywords: [
    "Forge",
    "Solana",
    "onchain identity",
    "soulbound tokens",
    "SBT",
    "developer reputation",
    "USDC escrow",
    "web3 freelance",
    "decentralized marketplace",
    "Civic CAPTCHA",
    "Solana Frontier Hackathon",
    "blockchain developer",
  ],

  authors: [{ name: "Samuel Oluwayomi", url: "https://github.com/SamuelOluwayomi" }],
  creator: "Samuel Oluwayomi",
  publisher: "Forge",

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Forge",
    title: "Forge — Permanent Pro Identity on Solana",
    description:
      "You do the work. You get paid. Your reputation stays with you — forever. Forge puts USDC in escrow, releases it when work is done, and mints an onchain badge to both wallets.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forge — Permanent Pro Identity on Solana",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "Forge — Permanent Pro Identity on Solana",
    description:
      "Earn USDC. Prove your skills. Forge your permanent onchain reputation with Soulbound Tokens on Solana.",
    images: ["/og-image.png"],
    creator: "@The_devsam",
    site: "@The_devsam",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },

  icons: {
    icon: [
      { url: "/Favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/Favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/Favicon/favicon.ico" },
    ],
    apple: [
      { url: "/Favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/Favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} ${nunito.variable} antialiased`}>
        <Providers>
          <MobileGuard>
            {children}
          </MobileGuard>
        </Providers>
      </body>
    </html>
  );
}
