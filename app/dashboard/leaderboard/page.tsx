"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useWallet } from "@/app/lib/wallet/context";
import { ForgeLoader } from "@/app/components/ForgeLoader";

interface RankedDev {
  wallet_address: string;
  avatar_url: string | null;
  twitter: string | null;
  github: string | null;
  rank: number;
  forge_score: number;
}

export default function LeaderboardPage() {
  const [devs, setDevs] = useState<RankedDev[]>([]);
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address, avatar_url, twitter, github, rank, forge_score")
        .gt("forge_score", 0)
        .order("forge_score", { ascending: false })
        .limit(50);
      
      if (data) {
        // Assign ranks client-side based on score order
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
              <div
                key={dev.wallet_address}
                className={`flex items-center gap-4 p-4 border-2 border-black transition-all ${
                  isYou ? "bg-primary/10 border-primary" : i < 3 ? "bg-white" : "bg-white"
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
                    <p className="font-mono text-xs text-black/60 truncate">
                      {dev.wallet_address.slice(0, 4)}...{dev.wallet_address.slice(-4)}
                    </p>
                    {isYou && (
                      <span className="bg-primary text-white px-2 py-0.5 text-[10px] font-black border border-black">YOU</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {dev.twitter && (
                      <a href={`https://x.com/${dev.twitter.replace("@","")}`} target="_blank" className="text-[10px] font-bold text-black/30 hover:text-black transition-colors">
                        {dev.twitter}
                      </a>
                    )}
                    {dev.github && (
                      <a href={`https://github.com/${dev.github}`} target="_blank" className="text-[10px] font-bold text-black/30 hover:text-black transition-colors">
                        {dev.github}
                      </a>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="w-24 text-right">
                  <span className="font-black text-xl tabular-nums">{dev.forge_score}</span>
                  <p className="text-[10px] font-black uppercase text-black/30">Points</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
