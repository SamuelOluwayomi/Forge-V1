"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { ellipsify } from "@/app/lib/explorer";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import Image from "next/image";
import { XLogo, GithubLogo, DiscordLogo, TelegramLogo } from "@phosphor-icons/react";

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

  const { program, sbtProgram } = useEscrow();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  const [stats, setStats] = useState([
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ]);

  const [sbtMint, setSbtMint] = useState<string | null>(null);
  const [hasPioneer, setHasPioneer] = useState(false);
  const [hasFounder, setHasFounder] = useState(false);
  const [selectedNft, setSelectedNft] = useState<{ type: 'founder' | 'pioneer' | 'sbt', uri?: string } | null>(null);
  const [badges, setBadges] = useState<number[]>([]);

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
          setSbtMint(data.profile_sbt_mint || null);
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
        
        if (sbtProgram) {
          try {
            const allBadges = await (sbtProgram.account as any).badgeRecord.all();
            const userBadges = allBadges.filter((b: any) => b.account.owner.toBase58() === address);
            setBadges(Array.from({ length: userBadges.length }).map((_, i) => i));
          } catch (err) {
            console.error("Failed to fetch SBT badges:", err);
            setBadges([]);
          }
        } else {
          setBadges([]);
        }

        // Fetch Achievements (Pioneer & Founder NFTs)
        try {
          if (sbtProgram) {
            const userPubkey = new PublicKey(address);
            
            // Check Pioneer
            const [pioneerPda] = PublicKey.findProgramAddressSync(
              [Buffer.from("pioneer_nft"), userPubkey.toBuffer()],
              sbtProgram.programId
            );
            try {
              await (sbtProgram.account as any).specialNft.fetch(pioneerPda);
              setHasPioneer(true);
            } catch (e) {
              setHasPioneer(false);
            }
            
            // Check Founder
            const [founderPda] = PublicKey.findProgramAddressSync(
              [Buffer.from("founder_nft"), userPubkey.toBuffer()],
              sbtProgram.programId
            );
            try {
              await (sbtProgram.account as any).specialNft.fetch(founderPda);
              setHasFounder(true);
            } catch (e) {
              setHasFounder(false);
            }
          }
        } catch (e) {
          console.error("Failed to fetch special NFTs:", e);
        }
      } catch (err) {
        console.error("Failed to fetch on-chain stats:", err);
      }
    };

    fetchOnChainStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.programId.toBase58(), sbtProgram?.programId.toBase58(), address]);

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

      <div className="flex flex-col gap-8">
        {/* Top — Identity Card */}
        <div className="w-full flex flex-col gap-6">
          <div className="brutalist-card bg-primary p-6 md:p-8 border-[3px] border-black relative overflow-hidden">
            {/* Background texture/noise */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
              
              {/* Left Side: Photo */}
              <div className="flex flex-col gap-4 items-center shrink-0 w-full md:w-auto">
                <div className="w-32 h-32 bg-white border-[3px] border-black flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-4xl text-black/20">?</span>
                  )}
                </div>
              </div>

              {/* Middle Side: Identity & Achievements */}
              <div className="flex-1 flex flex-col w-full">
                <h2 className="font-black text-4xl uppercase italic text-black leading-none mb-1">
                  {profile.name || "Anonymous Dev"}
                </h2>
                <p className="font-bold text-sm uppercase text-black/60 mb-6">
                  {profile.title || "Forge Developer"}
                </p>

                {/* Achievements Section */}
                <div className="mb-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-3">Achievements</p>
                  {(!sbtMint && !hasPioneer && !hasFounder) ? (
                    <div className="border-2 border-dashed border-black/10 p-3 text-center w-full md:w-64">
                      <p className="font-bold text-[10px] text-black/30 uppercase tracking-widest">None</p>
                    </div>
                  ) : (
                    <div className="flex gap-3 flex-wrap">
                      {hasFounder && (
                        <div onClick={() => setSelectedNft({ type: 'founder' })} className="border-2 border-black bg-white p-1.5 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(255,69,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(255,69,0,1)] transition-all cursor-pointer" style={{ width: 80 }} title="Forge Founder (1 of 1)">
                          <div className="relative w-full border border-black overflow-hidden" style={{ height: 50 }}>
                            <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i" alt="Founder" fill className="object-cover" unoptimized />
                            <div className="absolute top-0 right-0 bg-black text-white text-[6px] font-black px-1 border-l border-b border-black">1/1</div>
                          </div>
                          <p className="font-black text-[7px] uppercase text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Genesis</p>
                        </div>
                      )}
                      
                      {hasPioneer && (
                        <div onClick={() => setSelectedNft({ type: 'pioneer' })} className="border-2 border-black bg-white p-1.5 flex flex-col gap-1 shadow-[2px_2px_0px_0px_rgba(255,215,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(255,215,0,1)] transition-all cursor-pointer" style={{ width: 80 }} title="Forge Pioneer (Early Adopter)">
                          <div className="relative w-full border border-black overflow-hidden" style={{ height: 50 }}>
                            <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi" alt="Pioneer" fill className="object-cover" unoptimized />
                            <div className="absolute top-0 right-0 bg-[#FFD700] text-black text-[6px] font-black px-1 border-l border-b border-black">RARE</div>
                          </div>
                          <p className="font-black text-[7px] uppercase text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Pioneer</p>
                        </div>
                      )}

                      {sbtMint && (
                        <div onClick={() => setSelectedNft({ type: 'sbt', uri: sbtMint })} className="border-2 border-black bg-white px-3 py-2 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-[81px] cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all">
                          <span className="font-black text-[10px] uppercase tracking-widest text-black flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                            </svg>
                            Soulbound
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Wallet Details */}
                <div className="border-t-2 border-dashed border-black/10 pt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-2">Authenticated Wallet</p>
                  <p className="font-mono text-[10px] font-black text-black bg-white/20 border-2 border-black/10 px-3 py-1.5 inline-block truncate w-full md:max-w-md mb-3">
                    {address}
                  </p>

                  <div className="flex gap-2 flex-wrap items-center">
                    <a href={`https://solscan.io/account/${address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-black uppercase border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                      Solscan
                    </a>
                    <a href={`https://explorer.solana.com/address/${address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-black uppercase border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                      Explorer
                    </a>
                    {sbtMint && (
                      <a href={`https://explorer.solana.com/address/${sbtMint}?cluster=devnet`} target="_blank" className="flex items-center gap-2 text-[9px] font-black uppercase text-black hover:underline ml-2">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                        On-Chain Identity
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Badges */}
              <div className="flex flex-row md:flex-col gap-3 shrink-0 mt-6 md:mt-0 items-end">
                {profile.rank > 0 && (
                  <div className="bg-[#FFD700] text-black px-4 py-3 border-[3px] border-black flex flex-col items-center" style={{ transform: "rotate(-2deg)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Rank</span>
                    <span className="font-black text-3xl leading-none">#{profile.rank}</span>
                  </div>
                )}
                <div className="bg-black text-white px-4 py-3 border-[3px] border-black flex flex-col items-center" style={{ transform: "rotate(2deg)" }}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Score</span>
                  <span className="font-black text-3xl leading-none">{stats[3].value}</span>
                </div>
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
              {profile.twitter && (
                <a
                  href={`https://x.com/${profile.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                >
                  <XLogo className="w-5 h-5 group-hover:text-[#1DA1F2]" weight="bold" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                      X (Twitter)
                    </p>
                    <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                      {profile.twitter}
                    </p>
                  </div>
                </a>
              )}
              {profile.github && (
                <a
                  href={`https://github.com/${profile.github.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                >
                  <GithubLogo className="w-5 h-5 group-hover:text-[#333]" weight="bold" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                      GitHub
                    </p>
                    <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                      {profile.github}
                    </p>
                  </div>
                </a>
              )}
              {profile.discord && (
                <div
                  className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(profile.discord);
                  }}
                >
                  <DiscordLogo className="w-5 h-5 group-hover:text-[#5865F2]" weight="bold" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                      Discord
                    </p>
                    <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                      {profile.discord}
                    </p>
                  </div>
                </div>
              )}
              {profile.telegram && (
                <a
                  href={`https://t.me/${profile.telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                >
                  <TelegramLogo className="w-5 h-5 group-hover:text-[#0088cc]" weight="bold" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                      Telegram
                    </p>
                    <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                      {profile.telegram}
                    </p>
                  </div>
                </a>
              )}
              {!profile.twitter && !profile.github && !profile.discord && !profile.telegram && (
                <p className="text-xs font-bold text-black/40 italic">No social accounts linked.</p>
              )}
            </div>
          </div>

          {/* Tech Stack */}
          {profile.tech_stack && (
            <div className="brutalist-card bg-white p-6">
              <h3 className="font-black text-sm uppercase tracking-widest text-black/40 mb-1 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                Verified Tech Stack
              </h3>
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-4">AI-verified via GitHub</p>
              <div className="flex flex-wrap gap-2">
                {profile.tech_stack.split("|").map((t: string) => t.trim()).filter(Boolean).map((tech: string, i: number) => (
                  <span
                    key={i}
                    className="border-2 border-black px-3 py-1.5 text-xs font-black uppercase bg-black/5 hover:bg-black hover:text-white transition-colors cursor-default"
                    style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
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
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4" style={{ minWidth: "max-content" }}>
                  {badges.map((b, i) => (
                    <BadgeCard key={i} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* NFT details modal */}
      {selectedNft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedNft(null)}>
          <div className="bg-white border-4 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(255,69,0,1)] animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-2xl uppercase italic">Achievement</h3>
              <button onClick={() => setSelectedNft(null)} className="font-black text-2xl hover:text-[#FF4500]">×</button>
            </div>
            
            {selectedNft.type === 'founder' && (
              <div className="flex flex-col gap-4">
                <div className="w-full aspect-square relative border-4 border-black">
                  <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeiaaxfuvglz5is7pmn5m2lthoyyit7rjzlt6irabyrgd5byy3esg5i" alt="Founder" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase text-[#FF4500]">Forge Founder</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest">1 of 1 — Genesis</p>
                  <p className="mt-4 font-bold text-sm text-black/80 border-l-4 border-black pl-3 py-1">The original builder of Forge — the trustless freelance marketplace on Solana. Permanent, non-transferable, held by exactly one wallet.</p>
                </div>
              </div>
            )}

            {selectedNft.type === 'pioneer' && (
              <div className="flex flex-col gap-4">
                <div className="w-full aspect-square relative border-4 border-black">
                  <Image src="https://amber-important-primate-357.mypinata.cloud/ipfs/bafybeigjn3cdrocvxavacumjnz6ic6mdzghuxvzvzojkrxilijsnzzlqyi" alt="Pioneer" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase text-[#FFD700] drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">Forge Pioneer</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest">Early Adopter</p>
                  <p className="mt-4 font-bold text-sm text-black/80 border-l-4 border-black pl-3 py-1">Awarded to the first 100 developers who forged their identity on the platform. A symbol of early belief and commitment to trustless work.</p>
                </div>
              </div>
            )}

            {selectedNft.type === 'sbt' && (
              <div className="flex flex-col gap-4 items-center text-center py-8">
                <div className="w-24 h-24 bg-black text-white flex items-center justify-center rounded-full mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-black text-2xl uppercase">Soulbound Identity</h4>
                  <p className="font-bold text-sm text-black/60 uppercase tracking-widest mb-4">On-Chain Profile</p>
                  <p className="font-bold text-sm text-black/80 max-w-sm mx-auto">This developer has minted their core identity to the Solana blockchain. Their reputation, completed tasks, and score are permanently anchored on-chain.</p>
                  <a href={`https://explorer.solana.com/address/${selectedNft.uri}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-black text-white font-black text-xs uppercase hover:bg-primary transition-colors border-2 border-black hover:text-black">
                    View on Explorer
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                  </a>
                </div>
              </div>
            )}
            
            <button onClick={() => setSelectedNft(null)} className="w-full mt-6 py-3 border-2 border-black font-black uppercase text-xs hover:bg-black hover:text-white transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
