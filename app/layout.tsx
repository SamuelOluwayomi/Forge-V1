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
    default: "Forge — Trustless Developer Marketplace on Solana",
    template: "%s | Forge",
  },
  description:
    "Forge is a trustless developer marketplace built on Solana. Get paid in SOL through escrow-secured tasks, earn Soulbound Tokens as permanent proof of your work, and build a verifiable onchain reputation that follows you everywhere.",

  keywords: [
    "Forge",
    "Solana",
    "developer marketplace",
    "trustless escrow",
    "SOL payment",
    "onchain reputation",
    "soulbound tokens",
    "SBT",
    "web3 jobs",
    "blockchain freelance",
    "decentralized marketplace",
    "Solana devnet",
    "smart contract escrow",
    "developer identity",
    "crypto bounties",
    "Solana Colosseum",
    "solana hackathon",
    "onchain work",
    "proof of work NFT",
    "open source bounties",
  ],

  authors: [{ name: "Samuel Oluwayomi", url: "https://github.com/SamuelOluwayomi" }],
  creator: "Samuel Oluwayomi",
  publisher: "Forge",

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "Forge",
    title: "Forge — Trustless Developer Marketplace on Solana",
    description:
      "Find work, get paid in SOL, and permanently forge your onchain reputation. Forge uses smart contract escrow to protect both clients and developers — no middlemen, no disputes, just code.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Forge — Trustless Developer Marketplace on Solana",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "Forge — Trustless Developer Marketplace on Solana",
    description:
      "Get paid in SOL. Prove your skills. Build a permanent onchain reputation with Soulbound Tokens — all secured by smart contract escrow on Solana.",
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
