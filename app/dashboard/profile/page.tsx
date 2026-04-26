"use client";

import { useState } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { ellipsify } from "@/app/lib/explorer";
import { useCluster } from "@/app/components/cluster-context";

function CopyButton({ text, id, label = "Copy" }: { text: string; id: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      id={id}
      onClick={handleCopy}
      className={`flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-all duration-150
        ${copied ? "bg-[#4ADE80] border-[#4ADE80] text-black scale-95" : "bg-white text-black hover:bg-black hover:text-white"}`}
      style={{ boxShadow: copied ? "none" : "2px 2px 0px 0px rgba(0,0,0,1)" }}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="9" y="9" width="13" height="13" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// Placeholder badge card — wire to forge_sbt program later
function BadgeCard({ index }: { index: number }) {
  const colors = ["#FF4500", "#FFD700", "#4ADE80", "#60A5FA", "#FF90E8"];
  const color = colors[index % colors.length];
  return (
    <div
      className="brutalist-card bg-white p-5 flex flex-col items-center gap-3 relative"
      style={{ borderColor: "black" }}
    >
      <div
        className="w-16 h-16 border-4 border-black flex items-center justify-center font-black text-2xl"
        style={{ background: color }}
      >
        #{index + 1}
      </div>
      <p className="font-black text-sm uppercase text-center">SBT Badge</p>
      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">On-chain</p>
    </div>
  );
}

export default function ProfilePage() {
  const { wallet } = useWallet();
  const { getExplorerUrl } = useCluster();
  const address = wallet?.account.address ?? "";

  // Placeholder stats — wire to forge_sbt ReputationAccount later
  const stats = [
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "USDC Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ];

  const badges: number[] = []; // replace with on-chain SBT fetch

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
          Identity
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Profile
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — identity card */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="brutalist-card bg-black text-white p-6 flex flex-col gap-4">
            {/* Avatar placeholder */}
            <div className="w-20 h-20 border-4 border-white bg-primary flex items-center justify-center font-black text-3xl text-white">
              {address ? address.slice(0, 2).toUpperCase() : "?"}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Wallet Address</p>
              <p className="font-mono text-xs break-all text-white/80 mb-3">
                {address || "Not connected"}
              </p>
              <div className="flex items-center gap-2">
                {address && <CopyButton text={address} id="profile-copy-address" label="Copy Address" />}
                {address && (
                  <a
                    href={getExplorerUrl(`/address/${address}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-white/40 px-3 py-1.5 text-xs font-black uppercase text-white/60 hover:border-white hover:text-white transition-all"
                  >
                    Explorer
                  </a>
                )}
              </div>
            </div>

            {/* Civic status */}
            <div className="border-t-2 border-white/10 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Civic Verification</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#4ADE80] border border-white/20" />
                <span className="font-black text-sm text-[#4ADE80] uppercase">Verified Human</span>
              </div>
            </div>

            {/* Reputation status */}
            <div className="border-t-2 border-white/10 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Reputation Account</p>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#4ADE80] border border-white/20" />
                <span className="font-black text-sm text-[#4ADE80] uppercase">Initialized</span>
              </div>
            </div>
          </div>

          {/* Short address card for sharing */}
          <div className="brutalist-card bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-2">Shareable Address</p>
            <div className="border-2 border-black bg-background px-3 py-2 mb-3">
              <p className="font-mono text-sm font-bold break-all text-black">
                {address ? ellipsify(address, 8) : "—"}
              </p>
            </div>
            {address && <CopyButton text={address} id="profile-copy-short" label="Copy" />}
          </div>
        </div>

        {/* Right — stats + badges */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="brutalist-card bg-white p-5 flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/50">{s.label}</p>
                <p className="font-black text-4xl text-black tabular-nums leading-none">{s.value}</p>
              </div>
            ))}
          </div>

          {/* SBT Badges */}
          <div className="brutalist-card bg-white p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-xl uppercase tracking-tight">Soulbound Badges</h2>
              <div className="brutalist-tape text-[10px] px-2 py-0.5" style={{ transform: "rotate(2deg)" }}>
                Non-transferable
              </div>
            </div>

            {badges.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 p-10 text-center">
                <p className="font-black text-black/30 uppercase text-sm">No badges yet</p>
                <p className="font-bold text-xs text-black/30 mt-2">
                  Complete tasks to earn permanent on-chain SBT badges.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {badges.map((_, i) => <BadgeCard key={i} index={i} />)}
              </div>
            )}
          </div>

          {/* Forge Score breakdown */}
          <div className="brutalist-card bg-black text-white p-6">
            <h2 className="font-black text-xl uppercase tracking-tight mb-4">Forge Score</h2>
            <div className="text-5xl font-black tabular-nums mb-4">0</div>
            <p className="text-sm font-bold text-white/50 leading-relaxed">
              Your Forge Score increases each time you complete a task, earn a badge, or receive a positive review.
              It is stored permanently on-chain and visible to potential clients.
            </p>
            {[
              { label: "Tasks Completed", pts: 0, max: 50 },
              { label: "Average Rating", pts: 0, max: 30 },
              { label: "Badges Earned", pts: 0, max: 20 },
            ].map((row) => (
              <div key={row.label} className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-xs uppercase tracking-widest text-white/60">{row.label}</span>
                  <span className="font-black text-xs text-white/60">{row.pts} / {row.max}</span>
                </div>
                <div className="h-2 border-2 border-white/20 bg-white/5">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(row.pts / row.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
