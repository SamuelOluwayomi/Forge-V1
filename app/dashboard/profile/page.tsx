"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useBalance } from "@/app/lib/hooks/use-balance";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { ForgeLoader } from "@/app/components/ForgeLoader";

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
  const address = wallet?.account.address ?? "";
  
  const [displayPhoto, setDisplayPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { program } = useEscrow();
  const balance = useBalance(address || undefined);

  // Social accounts
  const [socials, setSocials] = useState({ twitter: "", github: "", discord: "", telegram: "" });
  const [savingSocials, setSavingSocials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number>(0);

  const [stats, setStats] = useState([
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ]);

  const badges: number[] = []; // replace with on-chain SBT fetch
  const achievements: string[] = []; // Example: ["First Task Completed", "Top Rated Developer"]

  // Fetch profile on load
  useEffect(() => {
    if (!address || !supabase) return;
    
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from("profiles")
        .select("avatar_url, twitter, github, discord, telegram, rank")
        .eq("wallet_address", address)
        .single();
        
      if (data) {
        if (data.avatar_url) setDisplayPhoto(data.avatar_url);
        setSocials({
          twitter: data.twitter || "",
          github: data.github || "",
          discord: data.discord || "",
          telegram: data.telegram || "",
        });
        if (data.rank) setRank(data.rank);
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
        
        const posted = allEscrows.filter((e: any) => e.account.client.toBase58() === address).length;
        
        const completedEscrows = allEscrows.filter((e: any) => 
          e.account.worker && 
          e.account.worker.toBase58() === address && 
          Object.keys(e.account.status).includes("completed")
        );
        
        const completedCount = completedEscrows.length;
        const earned = completedEscrows.reduce((acc: number, e: any) => acc + Number(e.account.amount), 0) / 1_000_000_000;
        
        // Simple Forge Score formula for now: 100 points per completed task
        const forgeScore = completedCount * 100;

        setStats([
          { label: "Tasks Completed", value: completedCount },
          { label: "Tasks Posted", value: posted },
          { label: "SOL Earned", value: earned.toFixed(2) },
          { label: "Forge Score", value: forgeScore },
        ]);

        // Sync forge_score to Supabase for rankings
        if (supabase && forgeScore > 0) {
          supabase.from("profiles").upsert({
            wallet_address: address,
            forge_score: forgeScore,
            updated_at: new Date().toISOString(),
          }).then(() => {});
        }
      } catch (err) {
        console.error("Failed to fetch profile stats:", err);
      }
    };

    fetchOnChainStats();
  }, [program, address]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address || !supabase) return;

    try {
      toast.loading("Uploading photo...", { id: "upload" });

      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${address}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase!.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: dbError } = await supabase!
        .from('profiles')
        .upsert({ 
          wallet_address: address, 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setDisplayPhoto(publicUrl);
      toast.success("Profile photo updated successfully!", { id: "upload" });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload photo: " + err.message, { id: "upload" });
    }
  };

  const handleDownloadCard = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const card = document.getElementById("profile-card-export");
      if (!card) return;

      toast.loading("Rendering card...", { id: "download" });
      
      const canvas = await html2canvas(card, {
        backgroundColor: "#FF4500", 
        scale: 3, // Even higher for "premium" feel
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Force standard colors on the cloned element to prevent html2canvas oklab crash
          const el = clonedDoc.getElementById("profile-card-export");
          if (el) el.style.display = "block";
        }
      });

      const link = document.createElement("a");
      link.download = `forge-profile-${address.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Profile card downloaded!", { id: "download" });
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to render card. Try again.", { id: "download" });
    }
  };

  const handleShareCard = async () => {
    const shareText = `Check out my Forge Developer Profile! 🛠️\n\nForge Score: ${stats[3].value}\nWallet: ${address.slice(0, 4)}...${address.slice(-4)}\n\nBuilt on @Solana #ForgeProtocol`;
    const shareUrl = window.location.href;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    
    window.open(twitterUrl, "_blank");
  };

  const handleSaveSocials = async () => {
    if (!address || !supabase) return;
    setSavingSocials(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          wallet_address: address,
          twitter: socials.twitter,
          github: socials.github,
          discord: socials.discord,
          telegram: socials.telegram,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      toast.success("Social accounts saved!");
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSavingSocials(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <ForgeLoader />
      </div>
    );
  }

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
        {/* Left — Interactive Profile Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div 
            id="profile-card"
            className="brutalist-card bg-primary p-6 border-[3px] border-black relative overflow-hidden"
          >
            {/* Background texture/noise */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="relative z-10 flex items-start justify-between">
              {/* Display Photo */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 bg-white border-[3px] border-black flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden group"
              >
                {displayPhoto ? (
                  <>
                    <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">Change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-black text-3xl text-black/20 group-hover:text-black/50 transition-colors">+</span>
                    <span className="text-[10px] font-black uppercase text-black/40 mt-1">Photo</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />

              {/* Forge Score Badge inside Card */}
              <div className="flex gap-2">
                {rank > 0 && (
                  <div className="bg-[#FFD700] text-black px-3 py-2 border-2 border-black flex flex-col items-center" style={{ transform: "rotate(-2deg)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Rank</span>
                    <span className="font-black text-2xl leading-none">#{rank}</span>
                  </div>
                )}
                <div className="bg-black text-white px-3 py-2 border-2 border-black flex flex-col items-end" style={{ transform: "rotate(2deg)" }}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Score</span>
                  <span className="font-black text-2xl leading-none">{stats[3].value}</span>
                </div>
              </div>
            </div>

            {/* Wallet Address in Card */}
            <div className="relative z-10 mt-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Authenticated Wallet</p>
               <p className="font-mono text-xs font-black text-black bg-white/20 border-2 border-black/10 px-2 py-1 inline-block truncate max-w-full">
                {address || "Not Connected"}
               </p>
            </div>

            {/* Achievements List */}
            <div className="relative z-10 mt-8">
              <h3 className="font-black text-sm uppercase tracking-widest text-black/80 border-b-2 border-black/20 pb-2 mb-4">
                Achievements
              </h3>
              {achievements.length === 0 ? (
                <div className="bg-black/5 border-2 border-dashed border-black/20 py-4 text-center">
                  <p className="font-black text-xs uppercase text-black/40">None</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {achievements.map((ach, idx) => (
                    <li key={idx} className="font-bold text-xs uppercase bg-white border-2 border-black px-3 py-2 flex items-center gap-2">
                      <span className="text-primary text-base leading-none">★</span> {ach}
                    </li>
                  ))}
                </ul>
              )}
            </div>


          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadCard}
              className="flex-1 bg-white border-2 border-black py-3 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
              style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
            >
              Download Card
            </button>
            <button 
              onClick={handleShareCard}
              className="flex-1 bg-black text-white border-2 border-black py-3 font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-black transition-colors"
              style={{ boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" }}
            >
              Share Profile
            </button>
          </div>

          {/* HIDDEN EXPORTABLE CARD (Standard Hex only for html2canvas compatibility) */}
          <div className="hidden">
            <div 
              id="profile-card-export"
              className="w-[450px] bg-[#FF4500] p-10 border-[6px] border-black relative overflow-hidden"
              style={{ color: "black", fontFamily: "sans-serif" }}
            >
              {/* Header with Logo */}
              <div className="flex justify-between items-center mb-10">
                <div className="bg-black text-white px-4 py-1 font-black text-2xl italic tracking-tighter uppercase border-2 border-black">
                  FORGE
                </div>
                <div className="bg-white px-3 py-1 border-2 border-black font-black text-[10px] uppercase tracking-widest">
                  Identity Card
                </div>
              </div>

              <div className="flex gap-8 items-start mb-8">
                {/* Photo */}
                <div className="w-32 h-32 bg-white border-[4px] border-black shrink-0 overflow-hidden">
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-4xl text-black/10">?</div>
                  )}
                </div>

                {/* Main Identity */}
                <div className="flex-1">
                  <h2 className="font-black text-3xl uppercase leading-none mb-4 italic">Dev Profile</h2>
                  <div className="flex gap-2">
                    {rank > 0 && (
                      <div className="bg-[#FFD700] text-black px-3 py-2 border-2 border-black inline-block">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Rank</p>
                        <p className="font-black text-3xl leading-none">#{rank}</p>
                      </div>
                    )}
                    <div className="bg-black text-white px-3 py-2 border-2 border-black inline-block">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-1">Forge Score</p>
                      <p className="font-black text-3xl leading-none">{stats[3].value}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Section */}
              <div className="bg-white/90 border-[3px] border-black p-4 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-1">Authenticated Wallet</p>
                <p className="font-mono text-xs font-black text-black break-all">
                  {address || "Not Connected"}
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/10 border-2 border-black p-3">
                  <p className="text-[10px] font-black uppercase text-black/40">Tasks Posted</p>
                  <p className="font-black text-2xl text-black">{stats[1].value}</p>
                </div>
                <div className="bg-black/10 border-2 border-black p-3">
                  <p className="text-[10px] font-black uppercase text-black/40">Tasks Done</p>
                  <p className="font-black text-2xl text-black">{stats[0].value}</p>
                </div>
              </div>

              {/* Footer Tape */}
              <div className="absolute -bottom-4 -right-10 bg-black text-white px-20 py-4 font-black uppercase text-sm tracking-widest rotate-[-15deg] border-y-4 border-black">
                FORGE PROTOCOL
              </div>
            </div>
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

          {/* Social Accounts */}
          <div className="brutalist-card bg-white p-6">
            <h2 className="font-black text-xl uppercase tracking-tight mb-4">Social Accounts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/50">X (Twitter)</label>
                <input
                  type="text"
                  value={socials.twitter}
                  onChange={(e) => setSocials({ ...socials, twitter: e.target.value })}
                  placeholder="@username"
                  className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/50">GitHub</label>
                <input
                  type="text"
                  value={socials.github}
                  onChange={(e) => setSocials({ ...socials, github: e.target.value })}
                  placeholder="username"
                  className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/50">Discord</label>
                <input
                  type="text"
                  value={socials.discord}
                  onChange={(e) => setSocials({ ...socials, discord: e.target.value })}
                  placeholder="username#1234"
                  className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/50">Telegram</label>
                <input
                  type="text"
                  value={socials.telegram}
                  onChange={(e) => setSocials({ ...socials, telegram: e.target.value })}
                  placeholder="@username"
                  className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                />
              </div>
            </div>
            <button
              onClick={handleSaveSocials}
              disabled={savingSocials}
              className="brutalist-button px-6 py-2 bg-black text-white border-black text-xs disabled:opacity-50"
            >
              {savingSocials ? "Saving..." : "Save Social Accounts"}
            </button>
          </div>



          {/* SBT Badges */}
          <div className="bg-[#e0e0e0] border-4 border-black p-8 relative overflow-hidden">
          {Number(balance) < 0.005 && (
            <div className="bg-primary text-white border-2 border-black px-4 py-2 mb-6 font-black uppercase text-xs animate-pulse">
               ⚠️ Insufficient Funds: You need at least 0.01 SOL to initialize your on-chain reputation.
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
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
        </div>
      </div>
    </div>
  );
}
