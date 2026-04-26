"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/app/lib/wallet/context";
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
      <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
      <p className="text-4xl font-black leading-none text-black tabular-nums">{value}</p>
    </div>
  );
}

// ── Recent activity item ────────────────────────────────────────────────────
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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    work: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="2" y="7" width="20" height="14" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
    badge: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
    escrow: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="11" width="18" height="11" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b-2 border-black/10 last:border-0">
      <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shrink-0">
        {typeIcons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-black leading-none truncate">{label}</p>
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

  // Placeholder stats — wire to real on-chain data via useEscrow later
  const stats = [
    { label: "Tasks Posted", value: 0, tag: "CLIENT" },
    { label: "Tasks Completed", value: 0, tag: "WORKER" },
    { label: "USDC Earned", value: "0.00", accent: "#4ADE80" },
    { label: "SBT Badges", value: 0, tag: "ON-CHAIN" },
  ];

  const activity: React.ComponentProps<typeof ActivityRow>[] = [];

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
            Dashboard
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
            Overview
          </h1>
        </div>
        <Link
          href="/dashboard/tasks/new"
          id="overview-post-task"
          className="brutalist-button px-8 py-3 bg-primary text-white border-black text-sm self-start"
        >
          Post New Task
        </Link>
      </div>

      {/* Wallet address strip */}
      <div className="brutalist-card bg-black text-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
            Your Wallet
          </p>
          <p className="font-mono text-sm break-all text-white/80">
            {address ?? "Not connected"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-black text-lg tabular-nums">
            {balance.lamports != null ? lamportsToSolString(balance.lamports) : "—"}
            <span className="text-xs font-bold text-white/50 ml-1">SOL</span>
          </span>
          <button
            id="overview-copy-address"
            onClick={handleCopy}
            className={`flex items-center gap-2 border-2 px-4 py-2 text-xs font-black uppercase transition-all duration-150
              ${copied
                ? "bg-[#4ADE80] border-[#4ADE80] text-black scale-95"
                : "border-white text-white hover:bg-white hover:text-black"
              }`}
            style={{ boxShadow: copied ? "none" : "3px 3px 0px 0px rgba(255,255,255,0.2)" }}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy Address
              </>
            )}
          </button>
          {address && (
            <a
              href={getExplorerUrl(`/address/${address}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white/40 px-3 py-2 text-xs font-black uppercase text-white/60 hover:border-white hover:text-white transition-all"
            >
              Explorer
            </a>
          )}
        </div>
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
            <h2 className="font-black text-xl uppercase tracking-tight">Recent Activity</h2>
            <div className="brutalist-tape text-[10px] px-2 py-0.5" style={{ transform: "rotate(2deg)" }}>
              LIVE
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="border-2 border-dashed border-black/20 p-10 text-center">
              <p className="font-black text-black/40 uppercase text-sm">No activity yet</p>
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
            <h2 className="font-black text-xl uppercase tracking-tight mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/tasks/new"
                id="quick-post-task"
                className="brutalist-button text-center px-4 py-3 text-sm bg-primary text-white border-black"
              >
                Post a Task
              </Link>
              <Link
                href="/dashboard/tasks"
                id="quick-browse-tasks"
                className="brutalist-button text-center px-4 py-3 text-sm bg-black text-white border-black"
              >
                Browse Tasks
              </Link>
              <Link
                href="/dashboard/profile"
                id="quick-view-profile"
                className="brutalist-button text-center px-4 py-3 text-sm bg-background text-black border-black"
              >
                View Profile
              </Link>
            </div>
          </div>

          {/* Status guide */}
          <div className="brutalist-card bg-black text-white p-6">
            <h2 className="font-black text-base uppercase tracking-tight mb-4 text-white">
              Status Guide
            </h2>
            {[
              { label: "Open", color: "#4ADE80", desc: "Awaiting a worker" },
              { label: "In Progress", color: "#FFD700", desc: "Work underway" },
              { label: "Completed", color: "#fff", desc: "Escrow released" },
              { label: "Disputed", color: "#FF4500", desc: "Under review" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 mb-3 last:mb-0">
                <div
                  className="w-3 h-3 border-2 border-white/30 shrink-0"
                  style={{ background: s.color }}
                />
                <span className="font-black text-xs uppercase text-white/80">{s.label}</span>
                <span className="text-xs text-white/40 font-bold ml-auto">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
