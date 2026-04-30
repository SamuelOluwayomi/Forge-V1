import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Tasks",
  description:
    "Manage the tasks you have posted on Forge. Track applicants, accept workers, review submissions, and release SOL payments — all secured by Solana smart contracts.",
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
