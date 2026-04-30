import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Explore the Forge developer leaderboard. See the top-ranked developers by Forge score — a verifiable, onchain metric built from completed tasks, quality of work, and consistency.",
  keywords: [
    "developer leaderboard",
    "Forge score",
    "onchain reputation",
    "web3 developers",
    "Solana developers",
    "developer rankings",
  ],
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
