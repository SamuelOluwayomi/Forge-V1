import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Work",
  description:
    "View tasks you have been accepted for on Forge. Submit your deliverables and earn SOL upon client approval — with automatic release protection built into every smart contract.",
};

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
