import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Profile",
  description:
    "View and manage your Forge developer profile. Showcase your onchain reputation, Forge score, rank, Soulbound Token badges, and linked social accounts.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
