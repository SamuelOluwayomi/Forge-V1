"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { ellipsify } from "@/app/lib/explorer";

interface Developer {
  wallet_address: string;
  name: string | null;
  title: string | null;
  avatar_url: string | null;
  forge_score: number | null;
  rank: number | null;
}

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const { program } = useEscrow();

  useEffect(() => {
    const fetchDevs = async () => {
      if (!program) return;
      setLoading(true);
      
      try {
        let dbProfiles: any[] = [];
        if (supabase) {
          const { data, error } = await supabase
            .from("profiles")
            .select("wallet_address, name, title, avatar_url");

          if (!error && data) {
            dbProfiles = data;
          } else if (error) {
            console.error("Supabase profiles fetch error:", error);
          }
        }

        // Fetch on-chain escrows to calculate stats
        const allEscrows = await (program.account as any).escrowAccount.all();
        const activeEscrows = allEscrows.filter((e: any) => !Object.keys(e.account.status).includes("cancelled"));

        // Build a map of wallet_address -> forge_score
        const workerScores: Record<string, number> = {};
        
        for (const escrow of activeEscrows) {
          if (escrow.account.worker && Object.keys(escrow.account.status).includes("completed")) {
            const workerAddr = escrow.account.worker.toBase58();
            // Ignore the default system program address
            if (workerAddr !== "11111111111111111111111111111111") {
              workerScores[workerAddr] = (workerScores[workerAddr] || 0) + 100; // 100 points per completion
            }
          }
        }

        const combined: Developer[] = dbProfiles.map(p => ({
          wallet_address: p.wallet_address,
          name: p.name,
          title: p.title,
          avatar_url: p.avatar_url,
          forge_score: workerScores[p.wallet_address] || 0,
          rank: null
        }));

        // Sort descending by score
        combined.sort((a, b) => (b.forge_score || 0) - (a.forge_score || 0));

        // Assign ranks (1-based)
        combined.forEach((dev, idx) => {
          dev.rank = idx + 1;
        });

        setDevelopers(combined);
      } catch (err) {
        console.error("Failed to fetch developers:", err);
      }
      setLoading(false);
    };

    fetchDevs();
  }, [program]);

  return (
    <div className="w-full max-w-6xl mx-auto pb-20">
      <div className="mb-10">
        <div className="brutalist-tape text-xs px-3 py-1 inline-block mb-3" style={{ transform: "rotate(-1deg)" }}>
          Network
        </div>
        <h1 className="text-5xl md:text-6xl font-black uppercase leading-none text-black italic tracking-tighter">
          Developers
        </h1>
        <p className="font-bold text-sm text-black/50 mt-2">
          Discover and review the top talent on the Forge marketplace.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ForgeLoader />
        </div>
      ) : developers.length === 0 ? (
        <div className="brutalist-card bg-white p-16 text-center border-2 border-black">
          <p className="font-black text-2xl uppercase text-black/30 mb-3">No Developers Found</p>
          <p className="font-bold text-sm text-black/40">It's a little quiet here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.map((dev, index) => (
            <Link 
              key={dev.wallet_address} 
              href={`/dashboard/developers/${dev.wallet_address}`}
              className="brutalist-card bg-white p-6 hover:bg-black/5 transition-colors border-2 border-black flex flex-col items-center text-center relative group"
            >
              {dev.rank && dev.rank <= 3 && (
                <div className="brutalist-tape absolute -top-3 -right-2 text-[10px] px-2 py-0.5 bg-[#FFD700] text-black border-2 border-black" style={{ transform: "rotate(3deg)" }}>
                  Top Ranked
                </div>
              )}
              
              <div className="w-20 h-20 bg-background border-4 border-black shrink-0 overflow-hidden mb-4">
                {dev.avatar_url ? (
                  <img src={dev.avatar_url} alt={dev.name || "Avatar"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-2xl uppercase text-black/30">
                    {dev.name ? dev.name.charAt(0) : "?"}
                  </div>
                )}
              </div>
              
              <h3 className="font-black text-xl uppercase truncate w-full group-hover:text-primary transition-colors">
                {dev.name || "Anonymous Dev"}
              </h3>
              <p className="font-bold text-xs text-black/50 mb-4">{dev.title || "Forge Developer"}</p>
              
              <div className="flex gap-2 w-full justify-center mt-auto">
                <div className="bg-black text-white px-3 py-1 border-2 border-black">
                  <span className="font-black text-sm">{dev.forge_score || 0}</span>
                  <span className="text-[10px] font-black text-white/60 ml-1">SCORE</span>
                </div>
                {dev.rank && (
                  <div className="bg-primary text-white px-3 py-1 border-2 border-black">
                    <span className="font-black text-sm">#{dev.rank}</span>
                    <span className="text-[10px] font-black text-white/60 ml-1">RANK</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-black/10 w-full text-xs font-mono text-black/40 truncate">
                {ellipsify(dev.wallet_address, 8)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
