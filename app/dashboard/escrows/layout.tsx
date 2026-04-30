import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Active Escrows",
  description:
    "Track all your active Solana escrow accounts on Forge. Monitor SOL locked in smart contracts, check task status, and manage payments transparently onchain.",
};

export default function EscrowsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
