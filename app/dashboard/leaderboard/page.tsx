"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useWallet } from "@/app/lib/wallet/context";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import Link from "next/link";

interface RankedDev {
  wallet_address: string;
  name: string | null;
  title: string | null;
  avatar_url: string | null;
  twitter: string | null;
  github: string | null;
  rank: number;
  forge_score: number;
  tech_stack?: string | null;
  bio?: string | null;
}

function DevModal({ dev, onClose }: { dev: RankedDev; onClose: () => void }) {
  const techItems = dev.tech_stack
    ? dev.tech_stack.split("|").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-black w-full max-w-md animate-in zoom-in-95 duration-200"
        style={{ boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary p-6 relative overflow-hidden border-b-4 border-black">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm hover:bg-white hover:text-black transition-colors z-10"
          >
            ✕
          </button>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-20 h-20 border-[3px] border-black overflow-hidden bg-white shrink-0">
              {dev.avatar_url ? (
                <img src={dev.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-3xl text-black/10">
                  {dev.name?.charAt(0) ?? "?"}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-black text-2xl uppercase italic leading-none text-black">
                {dev.name || "Anonymous Dev"}
              </h3>
              <p className="font-bold text-xs text-black/60 uppercase mt-1">
                {dev.title || "Forge Developer"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[10px] font-black border border-black">
                  RANK #{dev.rank}
                </span>
                <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black border border-black">
                  {dev.forge_score} PTS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Bio */}
          {dev.bio && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">Bio</p>
              <p className="font-bold text-sm text-black/70 leading-relaxed">{dev.bio}</p>
            </div>
          )}

          {/* Tech Stack */}
          {techItems.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">
                Verified Tech Stack
              </p>
              <div className="flex flex-wrap gap-1.5">
                {techItems.map((tech, i) => (
                  <span
                    key={i}
                    className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase bg-black/5"
                    style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Socials */}
          <div className="flex flex-wrap gap-2">
            {dev.twitter && (
              <a
                href={`https://x.com/${dev.twitter.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
                style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
              >
                𝕏 {dev.twitter}
              </a>
            )}
            {dev.github && (
              <a
                href={`https://github.com/${dev.github}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white transition-all"
                style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
              >
                GH {dev.github}
              </a>
            )}
          </div>

          {/* Wallet */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Wallet</p>
            <p className="font-mono text-xs text-black/60 bg-black/5 border-2 border-black/10 px-3 py-2">
              {dev.wallet_address}
            </p>
          </div>

          {/* CTA */}
          <Link
            href={`/dashboard/developers/${dev.wallet_address}`}
            className="brutalist-button w-full py-3 text-xs bg-black text-white border-black text-center font-black uppercase"
          >
            View Full Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [devs, setDevs] = useState<RankedDev[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDev, setSelectedDev] = useState<RankedDev | null>(null);
  const { wallet } = useWallet();
  const address = wallet?.account.address;

  // Countdown to midnight UTC
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!supabase) return;
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("wallet_address, name, title, avatar_url, twitter, github, rank, forge_score, tech_stack, bio")
        .gt("forge_score", 0)
        .order("forge_score", { ascending: false })
        .limit(50);

      if (data) {
        const ranked = data.map((d, i) => ({ ...d, rank: d.rank || i + 1 }));
        setDevs(ranked);
      }
      setLoading(false);
    };
    fetchLeaderboard();
  }, []);

  const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
          Competition
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Leaderboard
        </h1>
        <div className="flex items-center gap-3 mt-3">
          <p className="font-bold text-sm text-black/50">Global developer rankings by Forge Score</p>
          <div className="flex items-center gap-1.5 bg-black text-white px-3 py-1 border-2 border-black text-[10px] font-black uppercase">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            Refreshes in {countdown}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <ForgeLoader />
        </div>
      ) : devs.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No rankings yet</p>
          <p className="font-bold text-sm text-black/40">Complete tasks to appear on the leaderboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex items-center gap-4 px-6 py-2">
            <span className="w-12 text-[10px] font-black uppercase tracking-widest text-black/40">Rank</span>
            <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-black/40">Developer</span>
            <span className="w-24 text-right text-[10px] font-black uppercase tracking-widest text-black/40">Score</span>
          </div>

          {devs.map((dev, i) => {
            const isYou = dev.wallet_address === address;
            return (
              <button
                key={dev.wallet_address}
                onClick={() => setSelectedDev(dev)}
                className={`w-full flex items-center gap-4 p-4 border-2 border-black transition-all text-left hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                  isYou ? "bg-primary/10 border-primary" : "bg-white"
                }`}
                style={{ boxShadow: i < 3 ? "4px 4px 0px 0px rgba(0,0,0,1)" : "3px 3px 0px 0px rgba(0,0,0,1)" }}
              >
                {/* Rank */}
                <div className="w-12 shrink-0">
                  {i < 3 ? (
                    <div
                      className="w-10 h-10 flex items-center justify-center font-black text-lg border-2 border-black"
                      style={{ background: MEDAL_COLORS[i] }}
                    >
                      {i + 1}
                    </div>
                  ) : (
                    <span className="font-black text-lg text-black/40 pl-2">#{i + 1}</span>
                  )}
                </div>

                {/* Avatar + Info */}
                <div className="w-10 h-10 bg-background border-[3px] border-black shrink-0 overflow-hidden">
                  {dev.avatar_url ? (
                    <img src={dev.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-black/10">?</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm uppercase truncate">
                      {dev.name || "Anonymous Dev"}
                    </p>
                    {isYou && (
                      <span className="bg-primary text-white px-2 py-0.5 text-[10px] font-black border border-black">YOU</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] text-black/40 border border-black/10 bg-black/5 px-1.5 py-0.5">
                      {dev.wallet_address.slice(0, 4)}...{dev.wallet_address.slice(-4)}
                    </span>
                    {dev.twitter && (
                      <span className="text-[10px] font-bold text-black/30">{dev.twitter}</span>
                    )}
                    {dev.github && (
                      <span className="text-[10px] font-bold text-black/30">{dev.github}</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="w-24 text-right">
                  <span className="font-black text-xl tabular-nums">{dev.forge_score}</span>
                  <p className="text-[10px] font-black uppercase text-black/30">Points</p>
                </div>

                {/* Click hint */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-black/20">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {/* Dev Profile Modal */}
      {selectedDev && (
        <DevModal dev={selectedDev} onClose={() => setSelectedDev(null)} />
      )}
    </div>
  );
}
