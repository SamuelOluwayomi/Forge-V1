"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useBalance } from "@/app/lib/hooks/use-balance";
import { lamportsToSolString } from "@/app/lib/lamports";
import { ellipsify } from "@/app/lib/explorer";
import { useCluster } from "@/app/components/cluster-context";

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent,
  tag,
}: {
  label: string;
  value: string | number;
  accent?: string;
  tag?: string;
}) {
  return (
    <div
      className="brutalist-card bg-white p-6 flex flex-col gap-2 relative"
      style={{ "--accent-color": accent } as React.CSSProperties}
    >
      {tag && (
        <div
          className="brutalist-tape absolute -top-3 -right-2 text-[10px] px-2 py-0.5"
          style={{ transform: "rotate(4deg)" }}
        >
          {tag}
        </div>
      )}
      <p className="text-xs font-black uppercase tracking-widest text-black/50">
        {label}
      </p>
      <p className="text-4xl font-black leading-none text-black tabular-nums">
        {value}
      </p>
    </div>
  );
}

// ── Recent activity item
function ActivityRow({
  type,
  label,
  sub,
  status,
  amount,
}: {
  type: "task" | "work" | "badge" | "escrow";
  label: string;
  sub: string;
  status: string;
  amount?: string;
}) {
  const statusColors: Record<string, string> = {
    Open: "bg-[#4ADE80] text-black",
    "In Progress": "bg-[#FFD700] text-black",
    Completed: "bg-black text-white",
    Disputed: "bg-[#FF4500] text-white",
    Pending: "bg-[#60A5FA] text-black",
  };
  const typeIcons: Record<string, React.ReactNode> = {
    task: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    work: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <rect x="2" y="7" width="20" height="14" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
    badge: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
    escrow: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <rect x="3" y="11" width="18" height="11" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b-2 border-black/10 last:border-0">
      <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shrink-0">
        {typeIcons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-black leading-none truncate">
          {label}
        </p>
        <p className="text-xs text-black/50 font-bold mt-0.5">{sub}</p>
      </div>
      {amount && (
        <span className="font-black text-sm text-black shrink-0">{amount}</span>
      )}
      <span
        className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 border-2 border-black ${statusColors[status] ?? "bg-white text-black"}`}
      >
        {status}
      </span>
    </div>
  );
}

// ── Main overview page ──────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { wallet } = useWallet();
  const address = wallet?.account.address;
  const balance = useBalance(address);
  const { getExplorerUrl } = useCluster();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { program } = useEscrow();
  const [stats, setStats] = useState([
    { label: "Tasks Posted", value: 0, tag: "CLIENT" },
    { label: "Tasks Completed", value: 0, tag: "WORKER" },
    { label: "SOL Earned", value: "0.00", accent: "#4ADE80" },
    { label: "SBT Badges", value: 0, tag: "ON-CHAIN" },
  ]);

  const [activity, setActivity] = useState<
    React.ComponentProps<typeof ActivityRow>[]
  >([]);

  useEffect(() => {
    if (!program || !address) return;

    const fetchDashboardData = async () => {
      try {
        const allEscrows = await (program.account as any).escrowAccount.all();
        const activeEscrows = allEscrows.filter((e: any) => !Object.keys(e.account.status).includes("cancelled"));

        // 1. Stats
        const posted = activeEscrows.filter(
          (e: any) => e.account.client.toBase58() === address
        ).length;
        const completedEscrows = activeEscrows.filter(
          (e: any) =>
            e.account.worker &&
            e.account.worker.toBase58() === address &&
            Object.keys(e.account.status).includes("completed")
        );
        const earned =
          completedEscrows.reduce(
            (acc: number, e: any) => acc + Number(e.account.amount),
            0
          ) / 1_000_000_000;

        setStats([
          { label: "Tasks Posted", value: posted, tag: "CLIENT" },
          {
            label: "Tasks Completed",
            value: completedEscrows.length,
            tag: "WORKER",
          },
          { label: "SOL Earned", value: earned.toFixed(2), accent: "#4ADE80" },
          { label: "SBT Badges", value: 0, tag: "ON-CHAIN" },
        ]);

        // 2. Activity (Take last 5)
        const recent = activeEscrows
          .filter(
            (e: any) =>
              e.account.client.toBase58() === address ||
              (e.account.worker && e.account.worker.toBase58() === address)
          )
          .slice(-5)
          .map((e: any) => {
            const isClient = e.account.client.toBase58() === address;
            const statusKeys = Object.keys(e.account.status);
            let status = "Open";
            if (statusKeys.includes("active")) status = "In Progress";
            if (statusKeys.includes("completed")) status = "Completed";

            return {
              type: isClient ? "task" : "work",
              label: "On-Chain Task",
              sub: isClient ? `You posted a task` : `Assigned to you`,
              status,
              amount: `${(Number(e.account.amount) / 1_000_000_000).toFixed(1)} SOL`,
            };
          });

        setActivity(recent.reverse() as any);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchDashboardData();
  }, [program, address]);

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div
            className="brutalist-tape text-xs px-3 py-1 inline-block mb-3"
            style={{ transform: "rotate(-1deg)" }}
          >
            Dashboard
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
            Overview
          </h1>
        </div>
        <Link
          href="/dashboard/tasks/new"
          id="overview-post-task"
          className="brutalist-button px-8 py-3 bg-primary text-white border-black text-sm self-start transition-colors"
        >
          Post New Task
        </Link>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Two columns: activity + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 brutalist-card bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-xl uppercase tracking-tight">
              Recent Activity
            </h2>
            <div
              className="brutalist-tape text-[10px] px-2 py-0.5"
              style={{ transform: "rotate(2deg)" }}
            >
              LIVE
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="border-2 border-dashed border-black/20 p-10 text-center">
              <p className="font-black text-black/40 uppercase text-sm">
                No activity yet
              </p>
              <p className="font-bold text-xs text-black/30 mt-2">
                Post a task or accept work to get started.
              </p>
            </div>
          ) : (
            activity.map((a, i) => <ActivityRow key={i} {...a} />)
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-4">
          <div className="brutalist-card bg-white p-6">
            <h2 className="font-black text-xl uppercase tracking-tight mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/tasks/new"
                id="quick-post-task"
                className="brutalist-button text-center px-4 py-3 text-sm bg-primary text-white border-black transition-colors"
              >
                Post a Task
              </Link>
              <Link
                href="/dashboard/browse"
                id="quick-browse-tasks"
                className="brutalist-button text-center px-4 py-3 text-sm bg-black text-white border-black transition-colors"
              >
                Browse Tasks
              </Link>
              <Link
                href="/dashboard/profile"
                id="quick-view-profile"
                className="brutalist-button text-center px-4 py-3 text-sm bg-white text-black border-black transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>

          {/* Reputation Breakdown */}
          <div className="brutalist-card bg-primary text-white p-6 border-4 border-black">
            <h2 className="font-black text-2xl uppercase tracking-tight mb-4 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              Reputation
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-black uppercase text-white">
                  <span>Trust Score</span>
                  <span>0 / 1000</span>
                </div>
                <div className="h-6 border-4 border-black bg-white/20 overflow-hidden p-1">
                  <div className="h-full bg-[#FFD700] w-0 transition-all duration-500" />
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-black/20 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-12 h-12 border-4 border-black bg-white flex items-center justify-center shrink-0">
                  <svg
                    className="text-primary"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="black"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-black text-sm uppercase text-white">
                    No Badges Yet
                  </p>
                  <p className="text-[10px] font-bold text-white/80 uppercase">
                    Complete your first task to earn a badge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
