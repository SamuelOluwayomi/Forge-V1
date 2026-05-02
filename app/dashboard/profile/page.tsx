"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/app/lib/wallet/context";
import { useEscrow } from "@/app/lib/hooks/useEscrow";
import { useBalance } from "@/app/lib/hooks/use-balance";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { ForgeLoader } from "@/app/components/ForgeLoader";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { XLogo, GithubLogo, DiscordLogo, TelegramLogo } from "@phosphor-icons/react";
import { NFT_METADATA } from "@/app/lib/nft-metadata";

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
      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
        On-chain
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { wallet } = useWallet();
  const address = wallet?.account.address ?? "";

  const [displayPhoto, setDisplayPhoto] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { program, sbtProgram } = useEscrow();
  const balance = useBalance(address || undefined);

  // Profile details
  const [profileData, setProfileData] = useState({
    name: "",
    title: "",
    bio: "",
  });
  const [socials, setSocials] = useState({
    twitter: "",
    github: "",
    discord: "",
    telegram: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState<number>(0);
  const [totalDevs, setTotalDevs] = useState<number>(0);
  const [rankCountdown, setRankCountdown] = useState("");
  const [sbtMint, setSbtMint] = useState<string | null>(null);
  const [sbtMinting, setSbtMinting] = useState(false);

  const [stats, setStats] = useState([
    { label: "Tasks Completed", value: 0 },
    { label: "Tasks Posted", value: 0 },
    { label: "SOL Earned", value: "0.00" },
    { label: "Forge Score", value: 0 },
  ]);

  const [pioneerStats, setPioneerStats] = useState<{ minted: number; total: number }>({ minted: 0, total: 100 });
  const [userRewards, setUserRewards] = useState<{ hasPioneer: boolean; hasFounder: boolean }>({ hasPioneer: false, hasFounder: false });
  const [claimingReward, setClaimingReward] = useState(false);

  const { sbtProgram, mintPioneerNft, mintFounderNft, initializeMintTracker } = useEscrow();
  const FORGE_FOUNDER = "4taXpwcd3YA26w6BqrwRMgEoka33eFtEGQ3KiU41MS81";

  const badges: number[] = [];
  const achievements: string[] = [];

  // Fetch profile on load
  useEffect(() => {
    if (!address || !supabase) return;

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase!
        .from("profiles")
        .select(
          "avatar_url, twitter, github, discord, telegram, rank, name, title, bio, profile_sbt_mint"
        )
        .eq("wallet_address", address)
        .single();

      if (data) {
        if (data.avatar_url) setDisplayPhoto(data.avatar_url);
        setSbtMint(data.profile_sbt_mint || null);
        setProfileData({
          name: data.name || "",
          title: data.title || "",
          bio: data.bio || "",
        });
        if (!data.name) setIsEditing(true);
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

    // Fetch total dev count for ranking context
    const fetchTotalDevs = async () => {
      if (!supabase) return;
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (count) setTotalDevs(count);
    };

    const fetchRewards = async () => {
      if (!sbtProgram || !address) return;
      try {
        const userPubkey = new PublicKey(address);
        
        // 1. Fetch Mint Tracker
        const [trackerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("mint_tracker")],
          sbtProgram.programId
        );
        
        try {
          const tracker = await (sbtProgram.account as any).mintTracker.fetch(trackerPda);
          setPioneerStats({ minted: tracker.pioneerMinted, total: 100 });
        } catch (e) {
          console.log("Mint tracker not initialized yet");
        }

        // 2. Check Pioneer NFT
        const [pioneerPda] = await PublicKey.findProgramAddress(
          [Buffer.from("pioneer_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        try {
          await (sbtProgram.account as any).specialNft.fetch(pioneerPda);
          setUserRewards(prev => ({ ...prev, hasPioneer: true }));
        } catch (e) {}

        // 3. Check Founder NFT
        const [founderPda] = await PublicKey.findProgramAddress(
          [Buffer.from("founder_nft"), userPubkey.toBuffer()],
          sbtProgram.programId
        );
        try {
          await (sbtProgram.account as any).specialNft.fetch(founderPda);
          setUserRewards(prev => ({ ...prev, hasFounder: true }));
        } catch (e) {}

      } catch (error) {
        console.error("Error fetching rewards:", error);
      }
    };

    fetchProfile();
    fetchTotalDevs();
    fetchRewards();
  }, [address, sbtProgram]);

  const handleClaimReward = async (type: 'pioneer' | 'founder') => {
    if (!address || !sbtProgram) return;
    setClaimingReward(true);
    const userPubkey = new PublicKey(address);
    
    try {
      if (type === 'pioneer') {
        await mintPioneerNft(userPubkey, NFT_METADATA.pioneer.uri);
        toast.success("Welcome to the Pioneer team! NFT minted.");
        setUserRewards(prev => ({ ...prev, hasPioneer: true }));
      } else {
        await mintFounderNft(userPubkey, NFT_METADATA.founder.uri);
        toast.success("Founder status confirmed. NFT minted.");
        setUserRewards(prev => ({ ...prev, hasFounder: true }));
      }
      
      // Update stats
      const [trackerPda] = await PublicKey.findProgramAddress(
        [Buffer.from("mint_tracker")],
        sbtProgram.programId
      );
      const tracker = await (sbtProgram.account as any).mintTracker.fetch(trackerPda);
      setPioneerStats({ minted: tracker.pioneerMinted, total: 100 });

    } catch (error: any) {
      console.error("Error claiming reward:", error);
      if (error.message.includes("SupplyExhausted")) {
        toast.error("Pioneer supply exhausted (100/100)");
      } else if (error.message.includes("Unauthorized")) {
        toast.error("Unauthorized to claim this NFT");
      } else {
        toast.error("Failed to claim NFT reward");
      }
    } finally {
      setClaimingReward(false);
    }
  };

  const handleInitTracker = async () => {
    try {
      await initializeMintTracker();
      toast.success("Mint tracker initialized!");
    } catch (e) {
      toast.error("Failed to initialize tracker");
    }
  };

  // Countdown to midnight UTC (ranking refresh)
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setRankCountdown(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real on-chain stats
  useEffect(() => {
    if (!program || !address) return;

    const fetchOnChainStats = async () => {
      try {
        const allEscrows = await (program.account as any).escrowAccount.all();
        const activeEscrows = allEscrows.filter(
          (e: any) => !Object.keys(e.account.status).includes("cancelled")
        );

        const posted = activeEscrows.filter(
          (e: any) => e.account.client.toBase58() === address
        ).length;

        const completedEscrows = activeEscrows.filter(
          (e: any) =>
            e.account.worker &&
            e.account.worker.toBase58() === address &&
            Object.keys(e.account.status).includes("completed")
        );

        const completedCount = completedEscrows.length;
        const earned =
          completedEscrows.reduce(
            (acc: number, e: any) => acc + Number(e.account.amount),
            0
          ) / 1_000_000_000;

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
          await supabase.from("profiles").upsert({
            wallet_address: address,
            forge_score: forgeScore,
            updated_at: new Date().toISOString(),
          });

          // Calculate dynamic rank: count of users with higher score + 1
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gt("forge_score", forgeScore);

          setRank((count || 0) + 1);
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
    setAvatarFile(file);

    try {
      toast.loading("Uploading photo...", { id: "upload" });

      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${address}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const {
        data: { publicUrl },
      } = supabase!.storage.from("avatars").getPublicUrl(filePath);

      // 3. Update Profile Table
      const { error: dbError } = await supabase!.from("profiles").upsert({
        wallet_address: address,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
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
        },
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

  const handleSaveProfile = async () => {
    if (!address || !supabase) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        wallet_address: address,
        name: profileData.name,
        title: profileData.title,
        bio: profileData.bio,
        twitter: socials.twitter,
        github: socials.github,
        discord: socials.discord,
        telegram: socials.telegram,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMintSBT = async () => {
    if (!profileData.name || !profileData.title) {
      toast.error(
        "Please set your Name and Title before minting your identity."
      );
      return;
    }

    if (!sbtProgram || !address) {
      toast.error("Program not loaded or wallet not connected.");
      return;
    }

    setSbtMinting(true);
    const tid = toast.loading(
      "Forging your on-chain identity via Forge SBT Program..."
    );

    try {
      // 1. Upload to Pinata IPFS to get metadata URI
      const formData = new FormData();
      formData.append("type", "metadata");
      formData.append(
        "metadata",
        JSON.stringify({
          name: `${profileData.name} — Forge Identity`,
          description: profileData.bio || "Forge Developer",
          image: displayPhoto || "",
          attributes: [{ trait_type: "Title", value: profileData.title }],
        })
      );

      const res = await fetch("/api/upload-to-ipfs", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to upload metadata to IPFS");
      const metadataUri = result.uri;

      // 2. Compute PDAs
      const ownerPubkey = new PublicKey(address);
      const [profileSbtPda] = await PublicKey.findProgramAddress(
        [Buffer.from("profile_sbt"), ownerPubkey.toBuffer()],
        sbtProgram.programId
      );
      const [reputationPda] = await PublicKey.findProgramAddress(
        [Buffer.from("reputation"), ownerPubkey.toBuffer()],
        sbtProgram.programId
      );

      // 3. Send Anchor transaction
      const tx = await (sbtProgram.methods as any)
        .mintProfileSbt(
          profileData.name,
          profileData.bio,
          profileData.title,
          metadataUri
        )
        .accounts({
          profileSbt: profileSbtPda,
          reputation: reputationPda,
          owner: ownerPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 4. Save to Supabase
      await supabase!
        .from("profiles")
        .update({ profile_sbt_mint: profileSbtPda.toString() })
        .eq("wallet_address", address);

      setSbtMint(profileSbtPda.toString());
      toast.success("Your on-chain identity has been forged! 🔥", { id: tid });
    } catch (err: any) {
      toast.error("Mint failed: " + (err.message || "Unknown error"), {
        id: tid,
      });
    } finally {
      setSbtMinting(false);
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
        <div
          className="brutalist-tape text-xs px-3 py-1 inline-block mb-3"
          style={{ transform: "rotate(-1deg)" }}
        >
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
            <div
              className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            ></div>

            <div className="relative z-10 flex items-start justify-between">
              {/* Display Photo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 bg-white border-[3px] border-black flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden group"
              >
                {displayPhoto ? (
                  <>
                    <img
                      src={displayPhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">
                        Change
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-black text-3xl text-black/20 group-hover:text-black/50 transition-colors">
                      +
                    </span>
                    <span className="text-[10px] font-black uppercase text-black/40 mt-1">
                      Photo
                    </span>
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
                  <div
                    className="bg-[#FFD700] text-black px-3 py-2 border-2 border-black flex flex-col items-center"
                    style={{ transform: "rotate(-2deg)" }}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                      Rank
                    </span>
                    <span className="font-black text-2xl leading-none">
                      #{rank}
                    </span>
                  </div>
                )}
                <div
                  className="bg-black text-white px-3 py-2 border-2 border-black flex flex-col items-end"
                  style={{ transform: "rotate(2deg)" }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">
                    Score
                  </span>
                  <span className="font-black text-2xl leading-none">
                    {stats[3].value}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Address in Card */}
            <div className="relative z-10 mt-4">
              <h2 className="font-black text-2xl uppercase italic text-black leading-tight">
                {profileData.name || "Anonymous Dev"}
              </h2>
              <p className="font-bold text-xs uppercase text-black/60 mb-3">
                {profileData.title || "Forge Developer"}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">
                Authenticated Wallet
              </p>
              <p className="font-mono text-[9px] font-black text-black bg-white/20 border-2 border-black/10 px-2 py-1 inline-block truncate max-w-full mb-3">
                {address || "Not Connected"}
              </p>

              {sbtMint ? (
                <a
                  href={`https://explorer.solana.com/address/${sbtMint}?cluster=devnet`}
                  target="_blank"
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-black hover:underline"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                  On-Chain Identity Forged
                </a>
              ) : (
                <button
                  onClick={handleMintSBT}
                  disabled={sbtMinting}
                  className="flex items-center gap-2 text-[10px] font-black uppercase text-white bg-black px-2 py-1 border-2 border-black hover:bg-primary hover:text-black transition-colors disabled:opacity-50"
                >
                  {sbtMinting ? "Forging..." : "★ Forge On-Chain Identity"}
                </button>
              )}
            </div>

            {/* Achievements List */}
            <div className="relative z-10 mt-8">
              <h3 className="font-black text-sm uppercase tracking-widest text-black/80 border-b-2 border-black/20 pb-2 mb-4">
                Achievements
              </h3>
              {achievements.length === 0 ? (
                <div className="bg-black/5 border-2 border-dashed border-black/20 py-4 text-center">
                  <p className="font-black text-xs uppercase text-black/40">
                    None
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {achievements.map((ach, idx) => (
                    <li
                      key={idx}
                      className="font-bold text-xs uppercase bg-white border-2 border-black px-3 py-2 flex items-center gap-2"
                    >
                      <span className="text-primary text-base leading-none">
                        ★
                      </span>{" "}
                      {ach}
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
                    <img
                      src={displayPhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-4xl text-black/10">
                      ?
                    </div>
                  )}
                </div>

                {/* Main Identity */}
                <div className="flex-1">
                  <h2 className="font-black text-2xl uppercase leading-none mb-1 italic">
                    {profileData.name || "Dev Profile"}
                  </h2>
                  <p className="font-bold text-[10px] uppercase text-black/60 mb-4">
                    {profileData.title || "Forge Developer"}
                  </p>
                  <div className="flex gap-2">
                    {rank > 0 && (
                      <div className="bg-[#FFD700] text-black px-3 py-2 border-2 border-black inline-block">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                          Rank
                        </p>
                        <p className="font-black text-3xl leading-none">
                          #{rank}
                        </p>
                      </div>
                    )}
                    <div className="bg-black text-white px-3 py-2 border-2 border-black inline-block">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500] mb-1">
                        Forge Score
                      </p>
                      <p className="font-black text-3xl leading-none">
                        {stats[3].value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Section */}
              <div className="bg-white/90 border-[3px] border-black p-4 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50 mb-1">
                  Authenticated Wallet
                </p>
                <p className="font-mono text-xs font-black text-black break-all">
                  {address || "Not Connected"}
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/10 border-2 border-black p-3">
                  <p className="text-[10px] font-black uppercase text-black/40">
                    Tasks Posted
                  </p>
                  <p className="font-black text-2xl text-black">
                    {stats[1].value}
                  </p>
                </div>
                <div className="bg-black/10 border-2 border-black p-3">
                  <p className="text-[10px] font-black uppercase text-black/40">
                    Tasks Done
                  </p>
                  <p className="font-black text-2xl text-black">
                    {stats[0].value}
                  </p>
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
              <div
                key={s.label}
                className="brutalist-card bg-white p-5 flex flex-col gap-1"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
                  {s.label}
                </p>
                <p className="font-black text-4xl text-black tabular-nums leading-none">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Ranking Standing */}
          <div className="brutalist-card bg-[#FFD700] p-6 border-4 border-black relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-xl uppercase tracking-tight text-black">
                  Your Ranking
                </h2>
                <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black">
                  Global
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div
                  className="bg-black text-white px-5 py-4 border-2 border-black flex flex-col items-center"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700] leading-none mb-1">
                    Rank
                  </span>
                  <span className="font-black text-4xl leading-none">
                    {rank > 0 ? `#${rank}` : "—"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-black/80">
                    {rank > 0
                      ? `You are ranked #${rank} out of ${totalDevs || "?"} developers`
                      : "Complete tasks to earn your ranking"}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/60">
                      Next refresh in {rankCountdown}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details (Read or Edit Mode) */}
          <div className="brutalist-card bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-xl uppercase tracking-tight">
                {isEditing ? "Edit Profile" : "Profile Details"}
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-black text-white px-3 py-1 font-black text-[10px] uppercase tracking-widest border-2 border-black hover:bg-primary hover:text-black transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Title / Role
                    </label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          title: e.target.value,
                        })
                      }
                      placeholder="Full Stack Engineer"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                    Bio / About
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    placeholder="Tell the world about yourself..."
                    rows={4}
                    className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30 resize-none"
                  />
                </div>

                <h2 className="font-black text-xl uppercase tracking-tight mb-4 mt-8">
                  Social Accounts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      X (Twitter)
                    </label>
                    <input
                      type="text"
                      value={socials.twitter}
                      onChange={(e) =>
                        setSocials({ ...socials, twitter: e.target.value })
                      }
                      placeholder="@username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      GitHub
                    </label>
                    <input
                      type="text"
                      value={socials.github}
                      onChange={(e) =>
                        setSocials({ ...socials, github: e.target.value })
                      }
                      placeholder="username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Discord
                    </label>
                    <input
                      type="text"
                      value={socials.discord}
                      onChange={(e) =>
                        setSocials({ ...socials, discord: e.target.value })
                      }
                      placeholder="username#1234"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Telegram
                    </label>
                    <input
                      type="text"
                      value={socials.telegram}
                      onChange={(e) =>
                        setSocials({ ...socials, telegram: e.target.value })
                      }
                      placeholder="@username"
                      className="border-2 border-black bg-background px-3 py-2 font-bold text-sm text-black outline-none focus:border-primary placeholder:text-black/30"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="brutalist-button px-8 py-3 bg-black text-white border-black text-sm disabled:opacity-50 flex-1"
                  >
                    {savingProfile ? "Saving..." : "Save Profile Details"}
                  </button>
                  {profileData.name && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="brutalist-button px-6 py-3 bg-white text-black border-2 border-black text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">
                    Bio / About
                  </h3>
                  <p className="font-bold text-sm leading-relaxed whitespace-pre-wrap text-black/80">
                    {profileData.bio || "No bio added yet."}
                  </p>
                </div>

                <div className="border-t-2 border-black/10 pt-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">
                    Social Accounts
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {socials.twitter && (
                      <a
                        href={`https://x.com/${socials.twitter.replace("@", "")}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                      >
                        <XLogo className="w-5 h-5 group-hover:text-[#1DA1F2]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            X (Twitter)
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.twitter}
                          </p>
                        </div>
                      </a>
                    )}
                    {socials.github && (
                      <a
                        href={`https://github.com/${socials.github.replace("@", "")}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                      >
                        <GithubLogo className="w-5 h-5 group-hover:text-[#333]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            GitHub
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.github}
                          </p>
                        </div>
                      </a>
                    )}
                    {socials.discord && (
                      <div
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group cursor-pointer"
                        onClick={() => {
                          navigator.clipboard.writeText(socials.discord);
                          toast.success("Discord copied!");
                        }}
                      >
                        <DiscordLogo className="w-5 h-5 group-hover:text-[#5865F2]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            Discord
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.discord}
                          </p>
                        </div>
                      </div>
                    )}
                    {socials.telegram && (
                      <a
                        href={`https://t.me/${socials.telegram.replace("@", "")}`}
                        target="_blank"
                        className="flex items-center gap-3 p-3 border-2 border-black/10 hover:border-black hover:bg-black/5 transition-all group"
                      >
                        <TelegramLogo className="w-5 h-5 group-hover:text-[#0088cc]" weight="bold" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">
                            Telegram
                          </p>
                          <p className="font-mono text-xs font-bold truncate block group-hover:underline">
                            {socials.telegram}
                          </p>
                        </div>
                      </a>
                    )}
                    {!socials.twitter &&
                      !socials.github &&
                      !socials.discord &&
                      !socials.telegram && (
                        <p className="text-xs font-bold text-black/40 italic col-span-2">
                          No social accounts linked.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exclusive Rewards */}
          <div className="brutalist-card bg-primary/10 p-8 border-4 border-black relative overflow-hidden mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-xl uppercase tracking-tight">
                Exclusive Rewards
              </h2>
              <div className="flex gap-2">
                {address === FORGE_FOUNDER && pioneerStats.minted === 0 && (
                  <button 
                    onClick={handleInitTracker}
                    className="text-[10px] font-black uppercase bg-black text-white px-2 py-1"
                  >
                    Init Tracker
                  </button>
                )}
                <div
                  className="brutalist-tape text-[10px] px-2 py-0.5 bg-primary text-white"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  Limited Edition
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pioneer NFT */}
              <div className={`border-2 border-black p-4 ${userRewards.hasPioneer ? 'bg-green-500/10' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black uppercase text-sm">Pioneer NFT</h3>
                  <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5">
                    {pioneerStats.minted}/{pioneerStats.total} CLAIMED
                  </span>
                </div>
                <p className="text-xs font-bold text-black/60 mb-4">
                  Awarded to the first 100 builders joining the Forge ecosystem.
                </p>
                {userRewards.hasPioneer ? (
                  <div className="flex items-center gap-2 text-green-600 font-black text-xs uppercase">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    Claimed
                  </div>
                ) : (
                  <button
                    onClick={() => handleClaimReward('pioneer')}
                    disabled={claimingReward || pioneerStats.minted >= pioneerStats.total}
                    className="w-full brutalist-button py-2 bg-black text-white text-xs font-black uppercase disabled:opacity-50"
                  >
                    {claimingReward ? "Minting..." : pioneerStats.minted >= pioneerStats.total ? "Exhausted" : "Claim Pioneer NFT"}
                  </button>
                )}
              </div>

              {/* Founder NFT */}
              {address === FORGE_FOUNDER && (
                <div className={`border-2 border-black p-4 ${userRewards.hasFounder ? 'bg-primary/20' : 'bg-white'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black uppercase text-sm">Founder NFT</h3>
                    <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 uppercase">
                      Unique
                    </span>
                  </div>
                  <p className="text-xs font-bold text-black/60 mb-4">
                    The genesis token for the architect of the Forge protocol.
                  </p>
                  {userRewards.hasFounder ? (
                    <div className="flex items-center gap-2 text-primary font-black text-xs uppercase">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Genesis Active
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaimReward('founder')}
                      disabled={claimingReward}
                      className="w-full brutalist-button py-2 bg-primary text-white text-xs font-black uppercase disabled:opacity-50"
                    >
                      {claimingReward ? "Minting..." : "Mint Genesis Founder NFT"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SBT Badges */}
          <div className="bg-[#e0e0e0] border-4 border-black p-8 relative overflow-hidden">
            {Number(balance) < 0.005 && (
              <div className="bg-primary text-white border-2 border-black px-4 py-2 mb-6 font-black uppercase text-xs animate-pulse">
                ⚠️ Insufficient Funds: You need at least 0.01 SOL to initialize
                your on-chain reputation.
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-xl uppercase tracking-tight">
                Soulbound Badges
              </h2>
              <div
                className="brutalist-tape text-[10px] px-2 py-0.5"
                style={{ transform: "rotate(2deg)" }}
              >
                Non-transferable
              </div>
            </div>

            {badges.length === 0 ? (
              <div className="border-2 border-dashed border-black/20 p-10 text-center">
                <p className="font-black text-black/30 uppercase text-sm">
                  No badges yet
                </p>
                <p className="font-bold text-xs text-black/30 mt-2">
                  Complete tasks to earn permanent on-chain SBT badges.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {badges.map((_, i) => (
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
