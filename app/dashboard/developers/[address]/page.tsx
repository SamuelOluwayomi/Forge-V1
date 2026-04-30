"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { ellipsify } from "@/app/lib/explorer";

// Placeholder badge card
function BadgeCard({ index }: { index: number }) {
  const colors = ["#FF4500", "#FFD700", "#4ADE80", "#60A5FA", "#FF90E8"];
  const color = colors[index % colors.length];
  return (
    <div
      className="brutalist-card bg-white p-5 flex flex-col items-center gap-3 relative border-2 border-black"
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

export default function DeveloperProfilePage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const { program } = useEscrow();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [stats, setStats] = useState([
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ]);

  const badges: number[] = []; // Future SBT badges
  const achievements: string[] = ["Founding Developer", "Top 100 Rank"]; // Example

  useEffect(() => {
    if (!address) return;
    
    const fetchProfile = async () => {
      setLoading(true);
      if (supabase) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("wallet_address", address)
          .single();
          
        if (data) {
          setProfile(data);
        }
      }
      setLoading(false);
    };
    
    fetchProfile();
  }, [address]);

  // Fetch real on-chain stats
  useEffect(() => {
    if (!program || !address) return;

    const fetchOnChainStats = async () => {
      try {
        const allEscrows = await (program.account as any).escrowAccount.all();
        const activeEscrows = allEscrows.filter((e: any) => !Object.keys(e.account.status).includes("cancelled"));
        
        const posted = activeEscrows.filter((e: any) => e.account.client.toBase58() === address).length;
        
        const completedEscrows = activeEscrows.filter((e: any) => 
          e.account.worker && 
          e.account.worker.toBase58() === address && 
          Object.keys(e.account.status).includes("completed")
        );
        
        const completedCount = completedEscrows.length;
        const earned = completedEscrows.reduce((acc: number, e: any) => acc + Number(e.account.amount), 0) / 1_000_000_000;
        
        const forgeScore = completedCount * 100;

        setStats([
          { label: "Tasks Completed", value: completedCount },
          { label: "Tasks Posted", value: posted },
          { label: "SOL Earned", value: earned.toFixed(2) },
          { label: "Forge Score", value: forgeScore },
        ]);
      } catch (err) {
        console.error("Failed to fetch on-chain stats:", err);
      }
    };

    fetchOnChainStats();
  }, [program, address]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <ForgeLoader />
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Profile Not Found</h2>
        <button onClick={() => router.push("/dashboard/developers")} className="brutalist-button px-6 py-3 bg-primary text-white border-black">
          Back to Developers
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => router.push("/dashboard/developers")}
          className="text-xs font-black uppercase text-black/50 hover:text-black hover:underline mb-4 inline-flex items-center gap-2"
        >
          ← Back to Developers
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-background border-4 border-black shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-2xl uppercase text-black/30">
                {profile.name ? profile.name.charAt(0) : "?"}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase leading-none text-black italic tracking-tighter">
              {profile.name || "Anonymous Dev"}
            </h1>
            <p className="font-bold text-sm text-black/50">{profile.title || "Forge Developer"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Identity Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="brutalist-card bg-primary p-6 border-[3px] border-black relative overflow-hidden">
            {/* Background texture/noise */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div className="w-20 h-20 bg-white border-[3px] border-black flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-black/20">?</span>
                )}
              </div>

              {/* Badges */}
              <div className="flex gap-2">
                {profile.rank > 0 && (
                  <div className="bg-[#FFD700] text-black px-3 py-2 border-2 border-black flex flex-col items-center" style={{ transform: "rotate(-2deg)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Rank</span>
                    <span className="font-black text-2xl leading-none">#{profile.rank}</span>
                  </div>
                )}
                <div className="bg-black text-white px-3 py-2 border-2 border-black flex flex-col items-end" style={{ transform: "rotate(2deg)" }}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Score</span>
                  <span className="font-black text-2xl leading-none">{stats[3].value}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Authenticated Wallet</p>
               <p className="font-mono text-xs font-black text-black bg-white/20 border-2 border-black/10 px-2 py-1 inline-block truncate max-w-full">
                {address}
               </p>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t-4 border-black/10">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-3">Achievements</p>
               <div className="flex flex-wrap gap-2">
                 {achievements.map((ach, i) => (
                   <span key={i} className="bg-white/20 text-black px-2 py-1 text-[10px] font-black uppercase border-2 border-black/20 shrink-0">
                     ★ {ach}
                   </span>
                 ))}
               </div>
            </div>
            
            <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
              <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>

          {/* Socials */}
          <div className="brutalist-card bg-white p-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Social Accounts
            </h3>
            <div className="space-y-4">
              {['twitter', 'github', 'discord', 'telegram'].map(network => {
                const link = profile[network];
                if (!link) return null;
                return (
                  <div key={network}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">{network}</p>
                    <a href={link} target="_blank" rel="noreferrer" className="font-mono text-xs font-bold truncate block hover:text-primary hover:underline">
                      {link}
                    </a>
                  </div>
                );
              })}
              {!profile.twitter && !profile.github && !profile.discord && !profile.telegram && (
                <p className="text-xs font-bold text-black/40 italic">No social accounts linked.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — Stats & Badges */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="brutalist-card bg-white p-6">
            <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-6">Bio</h3>
            <p className="font-bold text-sm leading-relaxed whitespace-pre-wrap text-black/80">
              {profile.bio || "This developer hasn't added a bio yet."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="brutalist-card bg-white p-6 flex flex-col justify-between group">
                <p className="font-black text-[10px] uppercase tracking-widest text-black/40 mb-2">{stat.label}</p>
                <div className="flex items-end gap-1">
                  <span className="font-black text-4xl leading-none">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="brutalist-card bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-black/40">SBT Collection</h3>
              <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">
                {badges.length} Badges
              </span>
            </div>
            
            {badges.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 p-10 text-center flex flex-col items-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black/20 mb-3">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <p className="font-black text-black/30 uppercase text-sm">No badges earned yet</p>
                <p className="font-bold text-xs text-black/30 mt-1">Badges are automatically minted when tasks are completed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((b, i) => (
                  <BadgeCard key={i} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
