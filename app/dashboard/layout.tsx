import type { Metadata } from "next";
import { GridBackground } from "@/app/components/grid-background";
import { DashboardNav } from "@/app/components/dashboard/nav";
import { AuthGate } from "@/app/components/AuthGate";

export const metadata: Metadata = {
  title: "Dashboard — Forge",
  description: "Manage your tasks, escrows, reputation, and wallet on Forge.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="relative min-h-screen paper-texture text-foreground flex">
        {/* Subtle grid background — same as landing page */}
        <GridBackground />

        {/* Sidebar */}
        <DashboardNav />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen ml-0 lg:ml-64 transition-all">
          <main className="flex-1 p-6 md:p-10 relative z-10 max-w-[1400px] w-full">
            {children}
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
