"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
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

  useEffect(() => {
    const fetchDevs = async () => {
      setLoading(true);
      if (supabase) {
        // Fetch all profiles, ordered by forge_score
        const { data, error } = await supabase
          .from("profiles")
          .select("wallet_address, name, title, avatar_url, forge_score, rank")
          .order("forge_score", { ascending: false });

        if (!error && data) {
          setDevelopers(data);
        }
      }
      setLoading(false);
    };

    fetchDevs();
  }, []);

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
