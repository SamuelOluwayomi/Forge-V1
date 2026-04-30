import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Tasks",
  description:
    "Explore open developer tasks and bounties on Forge. Filter by skill, difficulty, and reward — get paid in SOL, secured by smart contract escrow on Solana.",
  keywords: [
    "Forge tasks",
    "developer bounties",
    "Solana jobs",
    "SOL bounty",
    "web3 tasks",
    "smart contract work",
    "onchain tasks",
  ],
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
