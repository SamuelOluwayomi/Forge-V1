"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";

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

  // Placeholder stats — wire to forge_sbt ReputationAccount later
  const stats = [
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ];

  const badges: number[] = []; // replace with on-chain SBT fetch
  const achievements: string[] = []; // Example: ["First Task Completed", "Top Rated Developer"]

  // Fetch profile on load
  useEffect(() => {
    if (!address || !supabase) return;
    
    const fetchProfile = async () => {
      const { data, error } = await supabase!
        .from("profiles")
        .select("avatar_url")
        .eq("wallet_address", address)
        .single();
        
      if (data && data.avatar_url) {
        setDisplayPhoto(data.avatar_url);
      }
    };
    
    fetchProfile();
  }, [address]);

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

  const handleDownloadCard = () => {
    toast.success("Profile card download started!");
    // In production, use html2canvas or similar to render the #profile-card div to an image
  };

  const handleShareCard = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Forge Profile',
          text: `Check out my Forge Developer Profile! Forge Score: ${stats[3].value}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  };

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
              <div className="bg-black text-white px-3 py-2 border-2 border-black flex flex-col items-end" style={{ transform: "rotate(2deg)" }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">Score</span>
                <span className="font-black text-2xl leading-none">{stats[3].value}</span>
              </div>
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

            {/* Verifications inside Card */}
            <div className="relative z-10 mt-6 grid grid-cols-2 gap-2">
              <div className="bg-white/50 border-2 border-black p-2 flex flex-col items-center text-center">
                <div className="w-3 h-3 bg-[#4ADE80] border-2 border-black mb-1" />
                <span className="font-black text-[9px] uppercase">Civic Verified</span>
              </div>
              <div className="bg-white/50 border-2 border-black p-2 flex flex-col items-center text-center">
                <div className="w-3 h-3 bg-[#4ADE80] border-2 border-black mb-1" />
                <span className="font-black text-[9px] uppercase">Reputation Init</span>
              </div>
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

          {/* Forge Score breakdown */}
          <div className="brutalist-card bg-black text-white p-6">
            <h2 className="font-black text-xl uppercase tracking-tight mb-4">Forge Score Breakdown</h2>
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
        </div>
      </div>
    </div>
  );
}
